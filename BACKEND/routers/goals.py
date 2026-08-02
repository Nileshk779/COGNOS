import random

from fastapi import APIRouter, Depends, HTTPException

from constants import TEACHER_NAME_POOL
from deps import get_current_user
from schemas import Goal, GoalCreate
from supabase_client import get_supabase

router = APIRouter(prefix="/goals", tags=["goals"])


@router.post("", response_model=Goal)
def create_goal(body: GoalCreate, user=Depends(get_current_user)):
    sb = get_supabase()

    row = {
        "user_id": user["id"],
        "category": body.category,
        "title": body.title,
        "metric_config": body.metric_config,
        "teacher_name": random.choice(TEACHER_NAME_POOL),
    }
    inserted = sb.table("goals").insert(row).execute().data
    if not inserted:
        raise HTTPException(status_code=500, detail="Failed to create goal.")
    return inserted[0]
