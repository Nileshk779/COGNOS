import json

from fastapi import APIRouter, Depends, HTTPException

from canned_replies import pick_reply
from constants import CATEGORY_EXPERTISE, CATEGORY_PERSONA
from db_raw import get_user_profile_text
from deps import get_current_user
from gemini_client import MODEL, get_gemini
from goal_utils import get_goal_or_403
from schemas import (
    ChatExchange,
    ChatMessageCreate,
    ChatMessageOut,
    Checkin,
    CheckinCreate,
    CompleteSessionRequest,
    PathItemWithContent,
    Session,
    TeacherInfo,
)
from supabase_client import get_supabase

router = APIRouter(prefix="/teachers", tags=["teachers"])


def _hydrate_messages(sb, rows: list[dict]) -> list[ChatMessageOut]:
    path_item_ids = [r["path_item_id"] for r in rows if r.get("path_item_id")]
    path_items_by_id = {}
    content_by_id = {}
    if path_item_ids:
        path_items = sb.table("path_items").select("*").in_("id", path_item_ids).execute().data or []
        path_items_by_id = {p["id"]: p for p in path_items}
        content_ids = [p["content_id"] for p in path_items if p.get("content_id")]
        if content_ids:
            content_rows = sb.table("content_library").select("*").in_("id", content_ids).execute().data or []
            content_by_id = {c["id"]: c for c in content_rows}

    out = []
    for r in rows:
        path_item = path_items_by_id.get(r.get("path_item_id"))
        content = content_by_id.get(path_item["content_id"]) if path_item and path_item.get("content_id") else None
        row = {**r}
        # AI-authored task (task_title already on the row) wins; otherwise
        # fall back to a legacy path_item -> content_library join.
        if not row.get("task_title") and content:
            row["task_title"] = content.get("title")
        out.append(
            ChatMessageOut(
                **row,
                task_url=content.get("url") if content else None,
                task_source_type=content.get("source_type") if content else None,
            )
        )
    return out


@router.get("/{user_id}", response_model=list[TeacherInfo])
def list_teachers(user_id: str, user=Depends(get_current_user)):
    if user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Cannot access another user's data.")

    sb = get_supabase()
    goals = (sb.table("goals").select("*").eq("user_id", user_id).execute()).data or []

    return [
        TeacherInfo(
            goal_id=g["id"],
            category=g["category"],
            goal_title=g["title"],
            teacher_name=g.get("teacher_name") or CATEGORY_PERSONA.get(g["category"], "Teacher"),
        )
        for g in goals
    ]


@router.get("/{goal_id}/chat-history", response_model=list[ChatMessageOut])
def chat_history(goal_id: str, user=Depends(get_current_user)):
    sb = get_supabase()
    get_goal_or_403(sb, goal_id, user)

    rows = (
        sb.table("chat_messages")
        .select("*")
        .eq("goal_id", goal_id)
        .order("created_at")
        .execute()
    ).data or []
    return _hydrate_messages(sb, rows)


def _teacher_system_prompt(goal: dict, blueprint: dict | None, profile: dict) -> str:
    teacher_name = goal.get("teacher_name") or CATEGORY_PERSONA.get(goal["category"], "your teacher")
    expertise = CATEGORY_EXPERTISE.get(goal["category"], "this subject")
    difficulty = (blueprint or {}).get("current_level") or "not yet established — assume a beginner until they show otherwise"

    current_state = profile.get("current_state") or "Not yet known — the learner hasn't completed onboarding."
    goal_text = profile.get("goal") or goal["title"]
    need_text = profile.get("need") or "Not yet known."

    return (
        f"You are {teacher_name}, an AI teacher inside COGNOS, an adaptive learning platform. "
        f"You are the dedicated coach for this learner's goal: \"{goal['title']}\". Your expertise "
        f"is {expertise}. Teach at this difficulty level: {difficulty}.\n\n"
        f"What you know about this learner:\n"
        f"- Where they are now: {current_state}\n"
        f"- What they're aiming for: {goal_text}\n"
        f"- Their friction / what's blocked them: {need_text}\n\n"
        "Talk like a real, warm, sharp human coach who remembers this context -- never mention "
        "'the system', embeddings, or that you're an AI model. Keep replies short (2-4 sentences), "
        "conversational, encouraging but honest. From time to time -- not every message, only when "
        "it naturally fits -- assign ONE small, concrete, actionable task that fits their level and "
        "moves them toward their goal. Return ONLY JSON: "
        '{"reply": "...", "task": {"title": "...", "description": "..."} or null}.'
    )


@router.post("/{goal_id}/chat", response_model=ChatExchange)
def post_chat_message(goal_id: str, body: ChatMessageCreate, user=Depends(get_current_user)):
    sb = get_supabase()
    goal = get_goal_or_403(sb, goal_id, user)

    user_row = {"goal_id": goal_id, "role": "user", "content": body.content}
    inserted = sb.table("chat_messages").insert(user_row).execute().data
    if not inserted:
        raise HTTPException(status_code=500, detail="Failed to save message.")
    user_message = _hydrate_messages(sb, inserted)[0]

    prior_rows = (
        sb.table("chat_messages")
        .select("role,content")
        .eq("goal_id", goal_id)
        .order("created_at")
        .limit(20)
        .execute()
    ).data or []
    history = "\n".join(f"{'Teacher' if r['role'] == 'teacher' else 'Learner'}: {r['content']}" for r in prior_rows)

    blueprint_rows = sb.table("blueprints").select("*").eq("goal_id", goal_id).execute().data or []
    blueprint = blueprint_rows[0] if blueprint_rows else None
    profile = get_user_profile_text(user["id"])

    reply_text = None
    task_title = None
    task_description = None

    try:
        client = get_gemini()
        resp = client.models.generate_content(
            model=MODEL,
            contents=f"Conversation so far:\n\n{history}\n\nRespond to the learner's latest message.",
            config={
                "system_instruction": _teacher_system_prompt(goal, blueprint, profile),
                "temperature": 0.8,
                "response_mime_type": "application/json",
            },
        )
        data = json.loads(resp.text)
        reply_text = (data.get("reply") or "").strip() or None
        task = data.get("task")
        if isinstance(task, dict):
            task_title = (task.get("title") or "").strip() or None
            task_description = (task.get("description") or "").strip() or None
    except Exception:
        reply_text = None

    if not reply_text:
        # AI unavailable (quota, outage, bad JSON) -- degrade gracefully
        # rather than breaking the chat.
        reply_text = pick_reply(goal["category"], body.content)

    teacher_row = {
        "goal_id": goal_id,
        "role": "teacher",
        "content": reply_text,
        "task_title": task_title,
        "task_description": task_description,
    }
    inserted_reply = sb.table("chat_messages").insert(teacher_row).execute().data
    teacher_message = _hydrate_messages(sb, inserted_reply)[0] if inserted_reply else None

    return ChatExchange(user_message=user_message, teacher_message=teacher_message)


@router.get("/{goal_id}/path", response_model=list[PathItemWithContent])
def get_path(goal_id: str, user=Depends(get_current_user)):
    sb = get_supabase()
    get_goal_or_403(sb, goal_id, user)

    items = (
        sb.table("path_items")
        .select("*")
        .eq("goal_id", goal_id)
        .order("sequence_order")
        .execute()
    ).data or []

    content_ids = [i["content_id"] for i in items if i.get("content_id")]
    content_by_id = {}
    if content_ids:
        content_rows = sb.table("content_library").select("*").in_("id", content_ids).execute().data or []
        content_by_id = {c["id"]: c for c in content_rows}

    return [
        PathItemWithContent(
            id=item["id"],
            goal_id=item["goal_id"],
            content_id=item.get("content_id"),
            status=item["status"],
            sequence_order=item["sequence_order"],
            assigned_at=item.get("assigned_at"),
            **{
                k: content_by_id.get(item.get("content_id"), {}).get(k)
                for k in ("title", "description", "url", "source_type", "difficulty")
            },
        )
        for item in items
    ]


@router.post("/{goal_id}/complete-session", response_model=Session)
def complete_session(goal_id: str, body: CompleteSessionRequest, user=Depends(get_current_user)):
    sb = get_supabase()
    get_goal_or_403(sb, goal_id, user)

    updated = (
        sb.table("path_items")
        .update({"status": "done"})
        .eq("id", body.path_item_id)
        .eq("goal_id", goal_id)
        .execute()
    ).data
    if not updated:
        raise HTTPException(status_code=404, detail="Path item not found for this goal.")

    session_row = {
        "path_item_id": body.path_item_id,
        "user_id": user["id"],
        "duration_seconds": body.duration_seconds,
    }
    inserted = sb.table("sessions").insert(session_row).execute().data
    if not inserted:
        raise HTTPException(status_code=500, detail="Failed to save session.")
    return inserted[0]


@router.post("/{goal_id}/checkin", response_model=Checkin)
def post_checkin(goal_id: str, body: CheckinCreate, user=Depends(get_current_user)):
    sb = get_supabase()
    get_goal_or_403(sb, goal_id, user)

    checkin_row = {
        "goal_id": goal_id,
        "user_id": user["id"],
        "mood_score": body.mood_score,
        "confidence_score": body.confidence_score,
        "understood": body.understood,
        "notes": body.notes,
    }
    inserted = sb.table("checkins").insert(checkin_row).execute().data
    if not inserted:
        raise HTTPException(status_code=500, detail="Failed to save check-in.")

    if body.metrics:
        metric_rows = [
            {"goal_id": goal_id, "metric_name": name, "value": value}
            for name, value in body.metrics.items()
        ]
        sb.table("metrics").insert(metric_rows).execute()

    return inserted[0]
