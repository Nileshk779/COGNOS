from fastapi import APIRouter, Depends, HTTPException

from deps import get_current_user
from schemas import Pod, PodDetail, PodMember, PodPost, PodPostCreate, PodPostWithAuthor
from supabase_client import get_supabase

router = APIRouter(prefix="/pods", tags=["pods"])


@router.get("/{user_id}", response_model=list[Pod])
def list_pods_for_user(user_id: str, user=Depends(get_current_user)):
    if user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Cannot access another user's data.")

    sb = get_supabase()

    # A pod is "yours" either because you explicitly joined it, or because it
    # matches a goal category you're working on — pods are usually created
    # per-category, so this keeps a freshly-added pod visible immediately
    # without requiring a separate membership row.
    memberships = (sb.table("pod_memberships").select("pod_id").eq("user_id", user_id).execute()).data or []
    member_pod_ids = {m["pod_id"] for m in memberships}

    goals = (sb.table("goals").select("category").eq("user_id", user_id).execute()).data or []
    categories = list({g["category"] for g in goals})

    pods_by_id = {}
    if member_pod_ids:
        rows = sb.table("pods").select("*").in_("id", list(member_pod_ids)).execute().data or []
        pods_by_id.update({p["id"]: p for p in rows})
    if categories:
        rows = sb.table("pods").select("*").in_("goal_category", categories).execute().data or []
        pods_by_id.update({p["id"]: p for p in rows})

    return list(pods_by_id.values())


@router.get("/{pod_id}/info", response_model=PodDetail)
def get_pod_detail(pod_id: str, user=Depends(get_current_user)):
    sb = get_supabase()
    rows = sb.table("pods").select("*").eq("id", pod_id).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Pod not found.")
    pod = rows[0]

    member_count = len((sb.table("pod_memberships").select("id").eq("pod_id", pod_id).execute()).data or [])
    return PodDetail(**pod, member_count=member_count)


@router.get("/{pod_id}/members", response_model=list[PodMember])
def list_pod_members(pod_id: str, user=Depends(get_current_user)):
    sb = get_supabase()
    memberships = (sb.table("pod_memberships").select("user_id").eq("pod_id", pod_id).execute()).data or []
    user_ids = [m["user_id"] for m in memberships]
    if not user_ids:
        return []

    users = sb.table("User").select("id,name").in_("id", user_ids).execute().data or []
    return [PodMember(user_id=u["id"], name=u["name"]) for u in users]


@router.get("/{pod_id}/posts", response_model=list[PodPostWithAuthor])
def list_pod_posts(pod_id: str, user=Depends(get_current_user)):
    sb = get_supabase()
    posts = (
        sb.table("pod_posts")
        .select("*")
        .eq("pod_id", pod_id)
        .order("created_at", desc=True)
        .execute()
    ).data or []

    user_ids = list({p["user_id"] for p in posts})
    names_by_id = {}
    if user_ids:
        user_rows = sb.table("User").select("id,name").in_("id", user_ids).execute().data or []
        names_by_id = {u["id"]: u["name"] for u in user_rows}

    return [PodPostWithAuthor(**p, author_name=names_by_id.get(p["user_id"])) for p in posts]


@router.post("/{pod_id}/posts", response_model=PodPost)
def create_pod_post(pod_id: str, body: PodPostCreate, user=Depends(get_current_user)):
    sb = get_supabase()

    pod_rows = sb.table("pods").select("id").eq("id", pod_id).execute().data or []
    if not pod_rows:
        raise HTTPException(status_code=404, detail="Pod not found.")

    row = {
        "pod_id": pod_id,
        "user_id": user["id"],
        "content": body.content,
        "post_type": body.post_type,
    }
    inserted = sb.table("pod_posts").insert(row).execute().data
    if not inserted:
        raise HTTPException(status_code=500, detail="Failed to save post.")
    return inserted[0]
