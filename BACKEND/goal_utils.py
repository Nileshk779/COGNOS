from fastapi import HTTPException


def get_goal_or_403(sb, goal_id: str, user):
    """Fetch a goal row and verify it belongs to the requesting user.
    Shared by every goal_id-scoped router (teachers, growth, quests)."""
    rows = sb.table("goals").select("*").eq("id", goal_id).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Goal not found.")
    goal = rows[0]
    if goal["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="This goal doesn't belong to you.")
    return goal
