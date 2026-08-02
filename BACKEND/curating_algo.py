"""
curate_routes.py
Two endpoints: curate_content, curate_products.
Embeds the input text locally (same free model as ingestion), calls the
matching Supabase RPC (match_content / match_products, already created
in schema.sql / schema_products.sql), returns ranked results.

Wire into main.py with:
    from curate_routes import router as curate_router
    app.include_router(curate_router)
"""

import os
from fastapi import APIRouter
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from supabase import create_client

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# loaded once at startup, reused across requests
model = SentenceTransformer("all-MiniLM-L6-v2")


class CurateContentRequest(BaseModel):
    query_text: str          # e.g. blueprint/goal text or user's current need
    goal_category: str       # english_speaking | fitness | ai_ml
    match_count: int = 5


class CurateProductsRequest(BaseModel):
    query_text: str          # user's stated problem/need
    match_count: int = 5


@router.post("/curate/content")
def curate_content(req: CurateContentRequest):
    embedding = model.encode(req.query_text).tolist()
    result = supabase.rpc("match_content", {
        "query_embedding": embedding,
        "match_goal_category": req.goal_category,
        "match_count": req.match_count,
    }).execute()
    return {"results": result.data}


@router.post("/curate/products")
def curate_products(req: CurateProductsRequest):
    embedding = model.encode(req.query_text).tolist()
    result = supabase.rpc("match_products", {
        "query_embedding": embedding,
        "match_count": req.match_count,
    }).execute()
    return {"results": result.data}
