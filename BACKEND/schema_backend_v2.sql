-- Incremental migration on top of schema_backend.sql — adds task-linked chat
-- messages, DMs, growth snapshots, and persisted calendar events.

alter table chat_messages
  add column if not exists path_item_id uuid references path_items(id) on delete set null;

create table if not exists direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id text not null references "User"(id) on delete cascade,
  receiver_id text not null references "User"(id) on delete cascade,
  content text not null,
  read boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists growth_snapshots (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals(id) on delete cascade,
  kind text not null check (kind in ('before','after')),
  media_type text not null check (media_type in ('audio','image','code')),
  transcript text,
  media_url text,
  caption text,
  stat_label text,
  created_at timestamptz default now()
);

create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "User"(id) on delete cascade,
  goal_id uuid references goals(id) on delete set null,
  title text not null,
  event_date timestamptz not null,
  event_type text not null default 'reminder',
  created_at timestamptz default now()
);

create index if not exists idx_chat_messages_path_item on chat_messages(path_item_id);
create index if not exists idx_direct_messages_sender on direct_messages(sender_id);
create index if not exists idx_direct_messages_receiver on direct_messages(receiver_id);
create index if not exists idx_growth_snapshots_goal on growth_snapshots(goal_id);
create index if not exists idx_calendar_events_user on calendar_events(user_id);
