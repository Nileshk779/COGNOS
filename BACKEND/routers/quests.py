from fastapi import APIRouter, Depends, HTTPException

from deps import get_current_user
from goal_utils import get_goal_or_403
from schemas import Quest
from supabase_client import get_supabase

router = APIRouter(prefix="/quests", tags=["quests"])


@router.get("/{goal_id}", response_model=list[Quest])
def list_quests(goal_id: str, user=Depends(get_current_user)):
    sb = get_supabase()
    get_goal_or_403(sb, goal_id, user)

    return (
        sb.table("quests")
        .select("*")
        .eq("goal_id", goal_id)
        .execute()
    ).data or []


@router.patch("/complete/{quest_id}", response_model=Quest)
def complete_quest(quest_id: str, user=Depends(get_current_user)):
    sb = get_supabase()

    quest_rows = sb.table("quests").select("*").eq("id", quest_id).execute().data or []
    if not quest_rows:
        raise HTTPException(status_code=404, detail="Quest not found.")

    get_goal_or_403(sb, quest_rows[0]["goal_id"], user)

    updated = sb.table("quests").update({"status": "completed"}).eq("id", quest_id).execute().data
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update quest.")
    return updated[0]
