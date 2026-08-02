-- Run this in Supabase SQL Editor before running the scripts

create extension if not exists vector;

create table if not exists content_library (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  url text,
  source_type text not null,        -- video | podcast | article | pdf | task
  goal_category text not null,      -- e.g. english_speaking | fitness | ai_ml
  difficulty text default 'medium', -- easy | medium | hard
  linked_content_id uuid references content_library(id),
  embedding vector(384),            -- 384 = all-MiniLM-L6-v2 output size
  created_at timestamp with time zone default now()
);

-- Optional at 500 rows (brute-force cosine is fine at this scale),
-- include it anyway so it's ready if the library grows later.
create index if not exists content_library_embedding_idx
  on content_library using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- RPC function so the Curator Agent can do similarity search later.
-- Supabase's REST layer can't do vector math directly, so this wraps it.
create or replace function match_content (
  query_embedding vector(384),
  match_goal_category text,
  match_count int default 10
)
returns table (
  id uuid,
  title text,
  description text,
  url text,
  source_type text,
  difficulty text,
  similarity float
)
language sql stable
as $$
  select
    id, title, description, url, source_type, difficulty,
    1 - (embedding <=> query_embedding) as similarity
  from content_library
  where goal_category = match_goal_category
  order by embedding <=> query_embedding
  limit match_count;
$$;
