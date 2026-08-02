from fastapi import APIRouter, Depends, HTTPException

from deps import get_current_user
from schemas import MarketplaceItem
from supabase_client import get_supabase

router = APIRouter(prefix="/marketplace", tags=["marketplace"])


@router.get("/{user_id}", response_model=list[MarketplaceItem])
def list_marketplace_items(user_id: str, user=Depends(get_current_user)):
    if user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Cannot access another user's data.")

    sb = get_supabase()
    rows = (
        sb.table("marketplace_items")
        .select("*")
        .eq("user_id", user_id)
        .order("assigned_at", desc=True)
        .execute()
    ).data or []
    return rows
