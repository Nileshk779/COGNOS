-- Run this in Supabase SQL Editor (or via run_migration.py) after schema.sql.
-- Domain tables for the plain-plumbing pass — no AI/vector columns here,
-- content_library (schema.sql) already owns that.

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "User"(id) on delete cascade,
  category text not null check (category in ('english_speaking','fitness','ai_ml')),
  title text not null,
  metric_config jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists blueprints (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "User"(id) on delete cascade,
  goal_id uuid not null references goals(id) on delete cascade,
  current_level text,
  learning_style text,
  why_now text,
  past_attempts text,
  updated_at timestamptz default now()
);

create table if not exists path_items (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals(id) on delete cascade,
  content_id uuid references content_library(id),
  status text not null default 'pending' check (status in ('pending','active','done')),
  sequence_order int not null default 0,
  assigned_at timestamptz default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  path_item_id uuid references path_items(id) on delete set null,
  user_id text not null references "User"(id) on delete cascade,
  completed_at timestamptz default now(),
  duration_seconds int
);

create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals(id) on delete cascade,
  user_id text not null references "User"(id) on delete cascade,
  mood_score int,
  confidence_score int,
  understood boolean,
  notes text,
  created_at timestamptz default now()
);

create table if not exists metrics (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals(id) on delete cascade,
  metric_name text not null,
  value numeric not null,
  recorded_at timestamptz default now()
);

create table if not exists pods (
  id uuid primary key default gen_random_uuid(),
  goal_category text not null check (goal_category in ('english_speaking','fitness','ai_ml')),
  name text not null
);

create table if not exists pod_memberships (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references pods(id) on delete cascade,
  user_id text not null references "User"(id) on delete cascade,
  unique (pod_id, user_id)
);

create table if not exists pod_posts (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references pods(id) on delete cascade,
  user_id text not null references "User"(id) on delete cascade,
  content text not null,
  post_type text not null check (post_type in ('win','struggle','update')),
  created_at timestamptz default now()
);

create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text not null check (type in ('hackathon','job','event','seminar')),
  goal_category text not null check (goal_category in ('english_speaking','fitness','ai_ml')),
  url text,
  deadline timestamptz
);

create table if not exists quests (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals(id) on delete cascade,
  title text not null,
  description text,
  xp_value int not null default 0,
  status text not null default 'available' check (status in ('available','active','completed'))
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "User"(id) on delete cascade,
  message text not null,
  type text not null,
  read boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals(id) on delete cascade,
  role text not null check (role in ('user','teacher')),
  content text not null,
  created_at timestamptz default now()
);

create index if not exists idx_goals_user on goals(user_id);
create index if not exists idx_blueprints_goal on blueprints(goal_id);
create index if not exists idx_path_items_goal on path_items(goal_id);
create index if not exists idx_sessions_user on sessions(user_id);
create index if not exists idx_checkins_goal on checkins(goal_id);
create index if not exists idx_metrics_goal on metrics(goal_id);
create index if not exists idx_pod_memberships_user on pod_memberships(user_id);
create index if not exists idx_pod_posts_pod on pod_posts(pod_id);
create index if not exists idx_quests_goal on quests(goal_id);
create index if not exists idx_notifications_user on notifications(user_id);
create index if not exists idx_chat_messages_goal on chat_messages(goal_id);
