create table if not exists interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "User"(id) on delete cascade,
  goal_id uuid references goals(id) on delete set null,
  topic text not null,
  status text not null default 'active' check (status in ('active','completed')),
  score int,
  summary text,
  strengths jsonb,
  improvements jsonb,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create table if not exists interview_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references interview_sessions(id) on delete cascade,
  role text not null check (role in ('interviewer','candidate')),
  content text not null,
  created_at timestamptz default now()
);

create index if not exists idx_interview_sessions_user on interview_sessions(user_id);
create index if not exists idx_interview_turns_session on interview_turns(session_id);
