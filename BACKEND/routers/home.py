from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException

from deps import get_current_user
from schemas import GoalSummary, PathItemWithContent
from supabase_client import get_supabase

router = APIRouter(prefix="/home", tags=["home"])


def _require_self(user, user_id: str):
    if user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Cannot access another user's data.")


def _compute_streak(dates: set) -> int:
    """Counts consecutive calendar days, walking backward from today, that
    appear in `dates` (a set of 'YYYY-MM-DD' strings). Pure counting — no
    generation involved."""
    streak = 0
    day = datetime.utcnow().date()
    while day.isoformat() in dates:
        streak += 1
        day -= timedelta(days=1)
    return streak


@router.get("/summary/{user_id}", response_model=list[GoalSummary])
def home_summary(user_id: str, user=Depends(get_current_user)):
    _require_self(user, user_id)
    sb = get_supabase()

    goals = (sb.table("goals").select("*").eq("user_id", user_id).execute()).data or []

    summaries = []
    for goal in goals:
        goal_id = goal["id"]

        path_item_ids = [
            p["id"]
            for p in (sb.table("path_items").select("id").eq("goal_id", goal_id).execute()).data or []
        ]

        sessions = []
        if path_item_ids:
            sessions = (
                sb.table("sessions")
                .select("completed_at")
                .in_("path_item_id", path_item_ids)
                .execute()
            ).data or []

        checkins = (
            sb.table("checkins")
            .select("created_at")
            .eq("goal_id", goal_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        ).data or []

        session_dates = {s["completed_at"][:10] for s in sessions if s.get("completed_at")}
        streak = _compute_streak(session_dates)

        candidates = [s["completed_at"] for s in sessions if s.get("completed_at")]
        candidates += [c["created_at"] for c in checkins if c.get("created_at")]
        last_activity = max(candidates) if candidates else None

        summaries.append(
            GoalSummary(
                goal_id=goal_id,
                category=goal["category"],
                title=goal["title"],
                streak_days=streak,
                last_activity=last_activity,
            )
        )

    return summaries


@router.get("/today-steps/{user_id}", response_model=list[PathItemWithContent])
def today_steps(user_id: str, user=Depends(get_current_user)):
    """Despite the name (kept for URL stability), this now returns every
    task across the user's goals — pending/active AND done — so the Home
    page can render the full queue plus a completed section, not just
    whatever happens to be dated today."""
    _require_self(user, user_id)
    sb = get_supabase()

    goal_ids = [g["id"] for g in (sb.table("goals").select("id").eq("user_id", user_id).execute()).data or []]
    if not goal_ids:
        return []

    items = (
        sb.table("path_items")
        .select("*")
        .in_("goal_id", goal_ids)
        .order("sequence_order")
        .execute()
    ).data or []

    content_ids = [i["content_id"] for i in items if i.get("content_id")]
    content_by_id = {}
    if content_ids:
        content_rows = sb.table("content_library").select("*").in_("id", content_ids).execute().data or []
        content_by_id = {c["id"]: c for c in content_rows}

    results = []
    for item in items:
        content = content_by_id.get(item.get("content_id"), {})
        results.append(
            PathItemWithContent(
                id=item["id"],
                goal_id=item["goal_id"],
                content_id=item.get("content_id"),
                status=item["status"],
                sequence_order=item["sequence_order"],
                assigned_at=item.get("assigned_at"),
                title=content.get("title"),
                description=content.get("description"),
                url=content.get("url"),
                source_type=content.get("source_type"),
                difficulty=content.get("difficulty"),
            )
        )
    return results
