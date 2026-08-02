create table if not exists marketplace_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "User"(id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  category text,
  status text not null default 'assigned' check (status in ('assigned', 'claimed')),
  assigned_at timestamptz default now()
);

create index if not exists idx_marketplace_items_user on marketplace_items(user_id);
