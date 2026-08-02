from fastapi import APIRouter, Depends, HTTPException

from deps import get_current_user
from goal_utils import get_goal_or_403
from schemas import Blueprint, BlueprintUpdate, GrowthSnapshot, Metric
from supabase_client import get_supabase

router = APIRouter(prefix="/growth", tags=["growth"])


@router.get("/{goal_id}/snapshots", response_model=list[GrowthSnapshot])
def get_snapshots(goal_id: str, user=Depends(get_current_user)):
    sb = get_supabase()
    get_goal_or_403(sb, goal_id, user)

    return (
        sb.table("growth_snapshots")
        .select("*")
        .eq("goal_id", goal_id)
        .order("created_at")
        .execute()
    ).data or []


@router.get("/{goal_id}/metrics", response_model=list[Metric])
def get_metrics(goal_id: str, user=Depends(get_current_user)):
    sb = get_supabase()
    get_goal_or_403(sb, goal_id, user)

    return (
        sb.table("metrics")
        .select("*")
        .eq("goal_id", goal_id)
        .order("recorded_at")
        .execute()
    ).data or []


@router.get("/{goal_id}/blueprint", response_model=Blueprint | None)
def get_blueprint(goal_id: str, user=Depends(get_current_user)):
    sb = get_supabase()
    get_goal_or_403(sb, goal_id, user)

    rows = sb.table("blueprints").select("*").eq("goal_id", goal_id).execute().data or []
    return rows[0] if rows else None


@router.patch("/{goal_id}/blueprint", response_model=Blueprint)
def update_blueprint(goal_id: str, body: BlueprintUpdate, user=Depends(get_current_user)):
    sb = get_supabase()
    get_goal_or_403(sb, goal_id, user)

    changes = {k: v for k, v in body.model_dump().items() if v is not None}
    if not changes:
        raise HTTPException(status_code=400, detail="No fields to update.")

    existing = sb.table("blueprints").select("id").eq("goal_id", goal_id).execute().data or []

    if existing:
        updated = (
            sb.table("blueprints")
            .update(changes)
            .eq("goal_id", goal_id)
            .execute()
        ).data
    else:
        changes["goal_id"] = goal_id
        changes["user_id"] = user["id"]
        updated = sb.table("blueprints").insert(changes).execute().data

    if not updated:
        raise HTTPException(status_code=500, detail="Failed to save blueprint.")
    return updated[0]
