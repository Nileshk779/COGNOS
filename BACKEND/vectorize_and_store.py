"""
vectorize_and_store.py
Reads raw_content.json, builds an embedding-text per item, encodes it with a
LOCAL free embedding model (no API cost, no internet dependency once the
model is downloaded once), then upserts everything into Supabase's
content_library table (pgvector).

Run: python vectorize_and_store.py
Requires: schema.sql already run in Supabase SQL Editor.
"""

import os
import json
import re
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
INPUT_FILE = "raw_content.json"
BATCH_SIZE = 50

# ---- difficulty heuristic (cheap, no LLM call — good enough for demo) ----

EASY_HINTS = ["beginner", "intro", "introduction", "basics", "101", "for beginners", "getting started"]
HARD_HINTS = ["advanced", "masterclass", "deep dive", "expert", "in-depth", "research"]


def guess_difficulty(title, description):
    text = f"{title} {description}".lower()
    if any(hint in text for hint in HARD_HINTS):
        return "hard"
    if any(hint in text for hint in EASY_HINTS):
        return "easy"
    return "medium"  # default — safe middle ground when unclear


def build_embedding_text(item):
    """What actually gets embedded. Title + description (+ transcript
    snippet if we have one) — NOT the full raw transcript, keeps the
    embedding focused on 'what is this about' rather than noisy detail."""
    parts = [item.get("title", ""), item.get("description", "")]
    if item.get("transcript_snippet"):
        parts.append(item["transcript_snippet"][:300])
    text = " ".join(p for p in parts if p)
    return re.sub(r"\s+", " ", text).strip()


def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise SystemExit("Set SUPABASE_URL and SUPABASE_KEY in .env first.")

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        items = json.load(f)

    if not items:
        raise SystemExit(f"{INPUT_FILE} is empty — run scraper.py first.")

    print(f"Loaded {len(items)} raw items.")
    print("Loading local embedding model (all-MiniLM-L6-v2, ~80MB, downloads once)...")
    model = SentenceTransformer("all-MiniLM-L6-v2")

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # filter out anything with no usable text
    valid_items = [i for i in items if build_embedding_text(i)]
    print(f"{len(valid_items)} items have usable text for embedding.")

    texts = [build_embedding_text(i) for i in valid_items]

    print("Encoding all items locally (CPU, no API calls, no cost)...")
    embeddings = model.encode(texts, batch_size=32, show_progress_bar=True)

    rows = []
    for item, embedding in zip(valid_items, embeddings):
        rows.append({
            "title": item.get("title", "")[:500],
            "description": item.get("description", "")[:1000],
            "url": item.get("url", ""),
            "source_type": item.get("source_type", "article"),
            "goal_category": item.get("goal_category", "general"),
            "difficulty": guess_difficulty(item.get("title", ""), item.get("description", "")),
            "embedding": embedding.tolist(),
        })

    print(f"Upserting {len(rows)} rows into Supabase in batches of {BATCH_SIZE}...")
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        try:
            supabase.table("content_library").insert(batch).execute()
        except Exception as e:
            print(f"  [error] batch {i}-{i+len(batch)}: {e}")
            continue
        print(f"  inserted {i + len(batch)}/{len(rows)}")

    print("Done. Check the content_library table in Supabase.")


if __name__ == "__main__":
    main()
