import os

import psycopg2


def _vec_literal(values) -> str:
    return "[" + ",".join(f"{v:.8f}" for v in values) + "]"


def save_user_embeddings(
    user_id: str, current_vec, goal_vec, need_vec, current_text: str, goal_text: str, need_text: str
) -> None:
    """Writes the three profile embeddings + their source text + onboarded=true
    directly via SQL, since pgvector columns aren't mapped on the SQLAlchemy
    User model. The plain text is kept alongside the vectors so teacher chat
    can read a human-readable profile without decoding embeddings."""
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute(
                'update "User" set onboarded = true, '
                "current_embedding = %s::vector, goal_embedding = %s::vector, need_embedding = %s::vector, "
                "current_state_text = %s, goal_text = %s, need_text = %s "
                "where id = %s",
                (
                    _vec_literal(current_vec),
                    _vec_literal(goal_vec),
                    _vec_literal(need_vec),
                    current_text,
                    goal_text,
                    need_text,
                    user_id,
                ),
            )
    finally:
        conn.close()


def get_user_profile_text(user_id: str) -> dict:
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    try:
        with conn.cursor() as cur:
            cur.execute(
                'select current_state_text, goal_text, need_text from "User" where id = %s',
                (user_id,),
            )
            row = cur.fetchone()
    finally:
        conn.close()
    if not row:
        return {"current_state": None, "goal": None, "need": None}
    return {"current_state": row[0], "goal": row[1], "need": row[2]}
