from fastapi import APIRouter, Depends, HTTPException

from deps import get_current_user
from schemas import CalendarEntry, CalendarEvent, CalendarEventCreate
from supabase_client import get_supabase

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("/{user_id}", response_model=list[CalendarEntry])
def get_calendar(user_id: str, user=Depends(get_current_user)):
    if user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Cannot access another user's data.")

    sb = get_supabase()

    # Past: this user's completed sessions, titled via path_item -> content_library.
    sessions = sb.table("sessions").select("*").eq("user_id", user_id).execute().data or []
    path_item_ids = [s["path_item_id"] for s in sessions if s.get("path_item_id")]

    path_items_by_id = {}
    if path_item_ids:
        rows = sb.table("path_items").select("*").in_("id", path_item_ids).execute().data or []
        path_items_by_id = {p["id"]: p for p in rows}

    content_ids = [p["content_id"] for p in path_items_by_id.values() if p.get("content_id")]
    content_by_id = {}
    if content_ids:
        rows = sb.table("content_library").select("id,title").in_("id", content_ids).execute().data or []
        content_by_id = {c["id"]: c for c in rows}

    entries: list[CalendarEntry] = []
    for s in sessions:
        path_item = path_items_by_id.get(s.get("path_item_id"), {})
        content = content_by_id.get(path_item.get("content_id"), {})
        entries.append(
            CalendarEntry(
                id=s["id"],
                type="session",
                title=content.get("title") or "Completed session",
                date=s.get("completed_at"),
                goal_id=path_item.get("goal_id"),
            )
        )

    # Upcoming: opportunity deadlines matching the user's goal categories.
    goals = sb.table("goals").select("category").eq("user_id", user_id).execute().data or []
    categories = list({g["category"] for g in goals})
    if categories:
        opportunities = sb.table("opportunities").select("*").in_("goal_category", categories).execute().data or []
        for o in opportunities:
            if not o.get("deadline"):
                continue
            entries.append(CalendarEntry(id=o["id"], type="deadline", title=o["title"], date=o["deadline"], goal_id=None))

    # User-created reminders/events, persisted in calendar_events.
    events = sb.table("calendar_events").select("*").eq("user_id", user_id).execute().data or []
    for e in events:
        entries.append(CalendarEntry(id=e["id"], type="event", title=e["title"], date=e["event_date"], goal_id=e.get("goal_id")))

    entries.sort(key=lambda e: e.date.isoformat() if e.date else "")
    return entries


@router.post("/events", response_model=CalendarEvent)
def create_calendar_event(body: CalendarEventCreate, user=Depends(get_current_user)):
    sb = get_supabase()

    if body.goal_id:
        goal_rows = sb.table("goals").select("id").eq("id", body.goal_id).eq("user_id", user["id"]).execute().data or []
        if not goal_rows:
            raise HTTPException(status_code=403, detail="That goal doesn't belong to you.")

    row = {
        "user_id": user["id"],
        "goal_id": body.goal_id,
        "title": body.title,
        "event_date": body.event_date.isoformat(),
        "event_type": body.event_type,
    }
    inserted = sb.table("calendar_events").insert(row).execute().data
    if not inserted:
        raise HTTPException(status_code=500, detail="Failed to save event.")
    return inserted[0]
