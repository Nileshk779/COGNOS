from fastapi import APIRouter, Depends, HTTPException

from deps import get_current_user
from schemas import Notification
from supabase_client import get_supabase

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/{user_id}", response_model=list[Notification])
def list_notifications(user_id: str, user=Depends(get_current_user)):
    if user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Cannot access another user's data.")

    sb = get_supabase()
    return (
        sb.table("notifications")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    ).data or []


@router.patch("/{notification_id}/read", response_model=Notification)
def mark_notification_read(notification_id: str, user=Depends(get_current_user)):
    sb = get_supabase()

    rows = sb.table("notifications").select("*").eq("id", notification_id).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Notification not found.")
    if rows[0]["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="This notification doesn't belong to you.")

    updated = (
        sb.table("notifications")
        .update({"read": True})
        .eq("id", notification_id)
        .execute()
    ).data
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update notification.")
    return updated[0]
