create extension if not exists vector;

alter table "User" add column if not exists current_embedding vector(384);
alter table "User" add column if not exists goal_embedding vector(384);
alter table "User" add column if not exists need_embedding vector(384);
