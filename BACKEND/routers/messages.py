from fastapi import APIRouter, Depends, HTTPException

from deps import get_current_user
from schemas import ConversationSummary, DirectMessage, DirectMessageCreate, UserSearchResult
from supabase_client import get_supabase

router = APIRouter(prefix="/messages", tags=["messages"])


@router.get("/search", response_model=list[UserSearchResult])
def search_users(q: str, user=Depends(get_current_user)):
    sb = get_supabase()
    if not q.strip():
        return []

    rows = (
        sb.table("User")
        .select("id,name,email")
        .ilike("name", f"%{q.strip()}%")
        .neq("id", user["id"])
        .limit(20)
        .execute()
    ).data or []
    return rows


@router.get("/conversations/{user_id}", response_model=list[ConversationSummary])
def list_conversations(user_id: str, user=Depends(get_current_user)):
    if user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Cannot access another user's data.")

    sb = get_supabase()
    sent = sb.table("direct_messages").select("*").eq("sender_id", user_id).execute().data or []
    received = sb.table("direct_messages").select("*").eq("receiver_id", user_id).execute().data or []
    all_messages = sent + received

    if not all_messages:
        return []

    other_ids = {m["sender_id"] if m["sender_id"] != user_id else m["receiver_id"] for m in all_messages}
    users = sb.table("User").select("id,name").in_("id", list(other_ids)).execute().data or []
    names_by_id = {u["id"]: u["name"] for u in users}

    by_other: dict[str, list[dict]] = {}
    for m in all_messages:
        other = m["sender_id"] if m["sender_id"] != user_id else m["receiver_id"]
        by_other.setdefault(other, []).append(m)

    summaries = []
    for other_id, msgs in by_other.items():
        msgs.sort(key=lambda m: m["created_at"])
        last = msgs[-1]
        unread = sum(1 for m in msgs if m["receiver_id"] == user_id and not m["read"])
        summaries.append(
            ConversationSummary(
                other_user_id=other_id,
                other_user_name=names_by_id.get(other_id, "Unknown"),
                last_message=last["content"],
                last_message_time=last["created_at"],
                unread_count=unread,
            )
        )

    summaries.sort(key=lambda c: c.last_message_time or "", reverse=True)
    return summaries


@router.get("/thread/{user_id}/{other_id}", response_model=list[DirectMessage])
def get_thread(user_id: str, other_id: str, user=Depends(get_current_user)):
    if user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Cannot access another user's data.")

    sb = get_supabase()
    a_to_b = sb.table("direct_messages").select("*").eq("sender_id", user_id).eq("receiver_id", other_id).execute().data or []
    b_to_a = sb.table("direct_messages").select("*").eq("sender_id", other_id).eq("receiver_id", user_id).execute().data or []

    thread = a_to_b + b_to_a
    thread.sort(key=lambda m: m["created_at"])
    return thread


@router.post("/send", response_model=DirectMessage)
def send_message(body: DirectMessageCreate, user=Depends(get_current_user)):
    sb = get_supabase()

    recipient = sb.table("User").select("id").eq("id", body.receiver_id).execute().data or []
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found.")

    row = {"sender_id": user["id"], "receiver_id": body.receiver_id, "content": body.content}
    inserted = sb.table("direct_messages").insert(row).execute().data
    if not inserted:
        raise HTTPException(status_code=500, detail="Failed to send message.")
    return inserted[0]


@router.patch("/read/{user_id}/{other_id}")
def mark_thread_read(user_id: str, other_id: str, user=Depends(get_current_user)):
    if user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Cannot access another user's data.")

    sb = get_supabase()
    sb.table("direct_messages").update({"read": True}).eq("sender_id", other_id).eq("receiver_id", user_id).execute()
    return {"success": True}
