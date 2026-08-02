import json

from fastapi import APIRouter, Depends, HTTPException

from db_raw import save_user_embeddings
from deps import get_current_user
from embedding_client import get_embedder
from gemini_client import MODEL, get_gemini
from schemas import OnboardingRespondRequest, OnboardingRespondResponse, OnboardingStartResponse
from supabase_client import get_supabase

router = APIRouter(prefix="/onboarding/interview", tags=["onboarding"])

TOTAL_QUESTIONS = 8

SYSTEM_PROMPT = (
    "You are COGNOS, speaking directly as the product itself -- this is your own onboarding "
    "interview, not a persona named Sage or anyone else. Your ONLY job right now is to deeply "
    "understand this learner before they start -- not to test or judge them, there are no "
    "right or wrong answers. Warmly ask about: their current background and experience level, "
    "what stage they're at right now, why they want this now, what specific goals and outcomes "
    "they're chasing, what's blocking them or has blocked them before (friction, problems, past "
    "failed attempts), and how they like to learn. Ask ONE natural, conversational question at a "
    "time, building on their previous answers -- go deeper on anything vague or interesting. Keep "
    "each question under 35 words. No preamble, no numbering, no markdown, no scoring or judging "
    "language -- this is a warm getting-to-know-you conversation, not a test."
)


def _call_gemini(*, contents: str, temperature: float, json_mode: bool):
    try:
        client = get_gemini()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="The AI interviewer isn't configured yet (missing GEMINI_API_KEY).")

    config = {"system_instruction": SYSTEM_PROMPT, "temperature": temperature}
    if json_mode:
        config["response_mime_type"] = "application/json"

    try:
        return client.models.generate_content(model=MODEL, contents=contents, config=config)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI interviewer request failed: {exc}")


def _transcript(turns: list[dict]) -> str:
    return "\n".join(
        f"{'Interviewer' if t['role'] == 'interviewer' else 'Candidate'}: {t['content']}" for t in turns
    )


@router.post("/start", response_model=OnboardingStartResponse)
def start_onboarding(user=Depends(get_current_user)):
    sb = get_supabase()

    session_row = {
        "user_id": user["id"],
        "goal_id": None,
        "topic": "Onboarding — Adaptive Learner Profile",
        "status": "active",
    }
    inserted = sb.table("interview_sessions").insert(session_row).execute().data
    if not inserted:
        raise HTTPException(status_code=500, detail="Failed to start onboarding.")
    session = inserted[0]

    resp = _call_gemini(
        contents="Greet them in one warm sentence, then ask your first question.",
        temperature=0.9,
        json_mode=False,
    )
    question = (resp.text or "Tell me a bit about yourself and what brings you here.").strip()

    sb.table("interview_turns").insert({"session_id": session["id"], "role": "interviewer", "content": question}).execute()

    return OnboardingStartResponse(session_id=session["id"], question=question, turn_number=0, total_questions=TOTAL_QUESTIONS)


@router.post("/{session_id}/respond", response_model=OnboardingRespondResponse)
def respond_onboarding(session_id: str, body: OnboardingRespondRequest, user=Depends(get_current_user)):
    sb = get_supabase()

    rows = sb.table("interview_sessions").select("*").eq("id", session_id).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Onboarding session not found.")
    session = rows[0]
    if session["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your onboarding session.")
    if session["status"] != "active":
        raise HTTPException(status_code=400, detail="This onboarding session has already ended.")

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
                f"Full onboarding conversation:\n\n{history}\n\n"
                "Based on this, write three short plain-prose descriptions of this learner (2-4 "
                "sentences each, no lists, no headers). Return ONLY JSON with keys: "
                'current_state (their background, experience level, and where they are right now), '
                "goal (what they specifically want to achieve and why), "
                "need (the friction, obstacles, or specific problems blocking them)."
            ),
            temperature=0.3,
            json_mode=True,
        )
        try:
            profile = json.loads(resp.text)
        except (json.JSONDecodeError, TypeError):
            profile = {}

        current_text = (profile.get("current_state") or "No background captured.").strip()
        goal_text = (profile.get("goal") or "No goal captured.").strip()
        need_text = (profile.get("need") or "No specific friction captured.").strip()

        embedder = get_embedder()
        current_vec, goal_vec, need_vec = embedder.encode([current_text, goal_text, need_text])
        save_user_embeddings(user["id"], current_vec, goal_vec, need_vec, current_text, goal_text, need_text)

        sb.table("interview_turns").insert({"session_id": session_id, "role": "candidate", "content": body.content}).execute()
        sb.table("interview_sessions").update({"status": "completed"}).eq("id", session_id).execute()

        return OnboardingRespondResponse(done=True, turn_number=turn_number, total_questions=TOTAL_QUESTIONS, question=None)

    resp = _call_gemini(
        contents=(
            f"Conversation so far:\n\n{history}\n\n"
            'Ask your next question. Return ONLY JSON: {"question": "..."}'
        ),
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

    return OnboardingRespondResponse(done=False, turn_number=turn_number, total_questions=TOTAL_QUESTIONS, question=question)
