alter table goals add column if not exists teacher_name text;

alter table chat_messages add column if not exists task_title text;
alter table chat_messages add column if not exists task_description text;

alter table "User" add column if not exists current_state_text text;
alter table "User" add column if not exists goal_text text;
alter table "User" add column if not exists need_text text;
