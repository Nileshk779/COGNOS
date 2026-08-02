import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from deps import get_current_user
from gemini_client import MODEL, get_gemini
from schemas import (
    InterviewDetail,
    InterviewRespondRequest,
    InterviewRespondResponse,
    InterviewSession,
    InterviewStartRequest,
    InterviewStartResponse,
)
from supabase_client import get_supabase

router = APIRouter(prefix="/interview", tags=["interview"])

TOTAL_QUESTIONS = 6


def _system_prompt(topic: str) -> str:
    return (
        f"You are COGNOS, a sharp but warm AI interviewer conducting a mock interview on: {topic}. "
        "Ask exactly one focused interview question at a time, building on the candidate's previous "
        "answers. Probe deeper when an answer is vague or weak; move on once they've nailed a point. "
        "Keep each question under 40 words. No preamble, no numbering, no markdown."
    )


def _call_gemini(*, contents: str, topic: str, temperature: float, json_mode: bool):
    try:
        client = get_gemini()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="The AI interviewer isn't configured yet (missing GEMINI_API_KEY).")

    config = {"system_instruction": _system_prompt(topic), "temperature": temperature}
    if json_mode:
        config["response_mime_type"] = "application/json"

    try:
        return client.models.generate_content(model=MODEL, contents=contents, config=config)
    except Exception as exc:  # network/quota/etc from the Gemini SDK
        raise HTTPException(status_code=502, detail=f"AI interviewer request failed: {exc}")


def _transcript(turns: list[dict]) -> str:
    return "\n".join(
        f"{'Interviewer' if t['role'] == 'interviewer' else 'Candidate'}: {t['content']}" for t in turns
    )


@router.post("/start", response_model=InterviewStartResponse)
def start_interview(body: InterviewStartRequest, user=Depends(get_current_user)):
    sb = get_supabase()

    if body.goal_id:
        goal_rows = sb.table("goals").select("id").eq("id", body.goal_id).eq("user_id", user["id"]).execute().data or []
        if not goal_rows:
            raise HTTPException(status_code=403, detail="That goal doesn't belong to you.")

    session_row = {"user_id": user["id"], "goal_id": body.goal_id, "topic": body.topic, "status": "active"}
    inserted = sb.table("interview_sessions").insert(session_row).execute().data
    if not inserted:
        raise HTTPException(status_code=500, detail="Failed to start interview.")
    session = inserted[0]

    resp = _call_gemini(
        contents="Begin the interview with your first question.",
        topic=body.topic,
        temperature=0.9,
        json_mode=False,
    )
    question = (resp.text or "Tell me a bit about your background with this.").strip()

    sb.table("interview_turns").insert({"session_id": session["id"], "role": "interviewer", "content": question}).execute()

    return InterviewStartResponse(session=InterviewSession(**session), first_question=question)


@router.post("/{session_id}/respond", response_model=InterviewRespondResponse)
def respond(session_id: str, body: InterviewRespondRequest, user=Depends(get_current_user)):
    sb = get_supabase()

    rows = sb.table("interview_sessions").select("*").eq("id", session_id).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Interview not found.")
    session = rows[0]
    if session["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your interview.")
    if session["status"] != "active":
        raise HTTPException(status_code=400, detail="This interview has already ended.")

    # Compute against turns already on record, then decide the next Gemini
    # call BEFORE persisting this answer -- if the AI call fails (rate limit,
    # transient 503, etc.) nothing is written, so the frontend can safely
    # retry the same answer without leaving an orphaned/duplicate turn.
    prior_turns = sb.table("interview_turns").select("*").eq("session_id", session_id).order("created_at").execute().data or []
    turn_number = len([t for t in prior_turns if t["role"] == "candidate"]) + 1
    history = _transcript(prior_turns) + f"\nCandidate: {body.content}"

    if turn_number >= TOTAL_QUESTIONS:
        resp = _call_gemini(
            contents=(
                f"Full interview transcript:\n\n{history}\n\n"
                "The interview is now over. Return ONLY a JSON object with keys: "
                "score (integer 1-10), summary (a warm 2-3 sentence overall assessment), "
                "strengths (array of up to 4 short strings), improvements (array of up to 4 short strings)."
            ),
            topic=session["topic"],
            temperature=0.4,
            json_mode=True,
        )
        try:
            feedback = json.loads(resp.text)
        except (json.JSONDecodeError, TypeError):
            feedback = {"score": 6, "summary": (resp.text or "")[:400], "strengths": [], "improvements": []}

        update_row = {
            "status": "completed",
            "score": feedback.get("score"),
            "summary": feedback.get("summary"),
            "strengths": feedback.get("strengths") or [],
            "improvements": feedback.get("improvements") or [],
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }
        sb.table("interview_turns").insert({"session_id": session_id, "role": "candidate", "content": body.content}).execute()
        updated = sb.table("interview_sessions").update(update_row).eq("id", session_id).execute().data
        if not updated:
            raise HTTPException(status_code=500, detail="Failed to save interview feedback.")

        return InterviewRespondResponse(
            done=True,
            turn_number=turn_number,
            total_questions=TOTAL_QUESTIONS,
            session=InterviewSession(**updated[0]),
        )

    resp = _call_gemini(
        contents=(
            f"Transcript so far:\n\n{history}\n\n"
            'Ask your next interview question. Return ONLY JSON: {"question": "..."}'
        ),
        topic=session["topic"],
        temperature=0.9,
        json_mode=True,
    )
    try:
        question = (json.loads(resp.text).get("question") or "").strip()
    except (json.JSONDecodeError, TypeError, AttributeError):
        question = ""
    if not question:
        question = (resp.text or "Can you tell me more about that?").strip()

    sb.table("interview_turns").insert({"session_id": session_id, "role": "candidate", "content": body.content}).execute()
    sb.table("interview_turns").insert({"session_id": session_id, "role": "interviewer", "content": question}).execute()

    return InterviewRespondResponse(
        done=False,
        turn_number=turn_number,
        total_questions=TOTAL_QUESTIONS,
        question=question,
    )


@router.get("/history/{user_id}", response_model=list[InterviewSession])
def history(user_id: str, user=Depends(get_current_user)):
    if user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Cannot access another user's data.")
    sb = get_supabase()
    rows = (
        sb.table("interview_sessions")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    ).data or []
    return rows


@router.get("/{session_id}", response_model=InterviewDetail)
def get_session(session_id: str, user=Depends(get_current_user)):
    sb = get_supabase()
    rows = sb.table("interview_sessions").select("*").eq("id", session_id).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Interview not found.")
    session = rows[0]
    if session["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your interview.")
    turns = (
        sb.table("interview_turns").select("*").eq("session_id", session_id).order("created_at").execute()
    ).data or []
    return InterviewDetail(session=InterviewSession(**session), turns=turns)
