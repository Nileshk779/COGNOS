"""
run_migration.py
Applies schema_backend.sql directly against DATABASE_URL. Safe to re-run —
every statement in the file is `create table if not exists` / `create index
if not exists`.

Run: python run_migration.py
"""

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
SQL_FILE = "schema_backend.sql"


def main():
    if not DATABASE_URL:
        raise SystemExit("DATABASE_URL not set in .env")

    with open(SQL_FILE, "r", encoding="utf-8") as f:
        sql = f.read()

    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
        print(f"Applied {SQL_FILE} successfully.")

        with conn.cursor() as cur:
            cur.execute(
                """
                select table_name from information_schema.tables
                where table_schema = 'public'
                order by table_name;
                """
            )
            tables = [row[0] for row in cur.fetchall()]
        print("Tables now in public schema:")
        for t in tables:
            print(f"  - {t}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
