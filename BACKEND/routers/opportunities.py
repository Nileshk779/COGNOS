from typing import Optional

from fastapi import APIRouter, Depends

from deps import get_current_user
from schemas import Opportunity
from supabase_client import get_supabase

router = APIRouter(prefix="/opportunities", tags=["opportunities"])


@router.get("", response_model=list[Opportunity])
def list_opportunities(goal_category: Optional[str] = None, user=Depends(get_current_user)):
    sb = get_supabase()
    query = sb.table("opportunities").select("*")
    if goal_category:
        query = query.eq("goal_category", goal_category)
    return (query.order("deadline").execute()).data or []
