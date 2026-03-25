-- Krome Supabase sync schema backfill
-- Run this in the Supabase SQL Editor.
-- It is written to be idempotent: safe to run more than once.

create or replace function public.krome_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.subjects (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  color text,
  settings jsonb not null default '{}'::jsonb,
  archived boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.tasks (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  title text not null,
  subject_id text,
  estimated_blocks integer,
  completed_blocks integer not null default 0,
  completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.focus_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  subject_id text,
  task_id text,
  duration_ms bigint not null default 0,
  completed boolean not null default false,
  abandoned boolean not null default false,
  intent text not null default '',
  started_at bigint,
  ended_at bigint,
  session_type text not null default 'standard',
  pot_spilled boolean not null default false,
  pot_result text,
  interrupts jsonb not null default '[]'::jsonb,
  planned_duration_ms bigint,
  actual_focus_duration_ms bigint not null default 0,
  interrupt_duration_ms bigint not null default 0,
  protection_ratio numeric not null default 1,
  time_of_day text,
  severity_impact integer not null default 0,
  abandon_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.observations (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  content text not null,
  session_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.milestones (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  title text not null,
  target_date bigint not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  primary key (user_id, id)
);

alter table if exists public.subjects
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists id text,
  add column if not exists name text,
  add column if not exists color text,
  add column if not exists settings jsonb default '{}'::jsonb,
  add column if not exists archived boolean default false,
  add column if not exists created_at timestamptz default timezone('utc', now()),
  add column if not exists updated_at timestamptz default timezone('utc', now()),
  add column if not exists deleted_at timestamptz;

alter table if exists public.tasks
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists id text,
  add column if not exists title text,
  add column if not exists subject_id text,
  add column if not exists estimated_blocks integer,
  add column if not exists completed_blocks integer default 0,
  add column if not exists completed boolean default false,
  add column if not exists created_at timestamptz default timezone('utc', now()),
  add column if not exists updated_at timestamptz default timezone('utc', now()),
  add column if not exists deleted_at timestamptz;

alter table if exists public.focus_sessions
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists id text,
  add column if not exists subject_id text,
  add column if not exists task_id text,
  add column if not exists duration_ms bigint default 0,
  add column if not exists completed boolean default false,
  add column if not exists abandoned boolean default false,
  add column if not exists intent text default '',
  add column if not exists started_at bigint,
  add column if not exists ended_at bigint,
  add column if not exists session_type text default 'standard',
  add column if not exists pot_spilled boolean default false,
  add column if not exists pot_result text,
  add column if not exists interrupts jsonb default '[]'::jsonb,
  add column if not exists planned_duration_ms bigint,
  add column if not exists actual_focus_duration_ms bigint default 0,
  add column if not exists interrupt_duration_ms bigint default 0,
  add column if not exists protection_ratio numeric default 1,
  add column if not exists time_of_day text,
  add column if not exists severity_impact integer default 0,
  add column if not exists abandon_reason text,
  add column if not exists created_at timestamptz default timezone('utc', now()),
  add column if not exists updated_at timestamptz default timezone('utc', now()),
  add column if not exists deleted_at timestamptz;

alter table if exists public.observations
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists id text,
  add column if not exists content text,
  add column if not exists session_id text,
  add column if not exists created_at timestamptz default timezone('utc', now()),
  add column if not exists updated_at timestamptz default timezone('utc', now()),
  add column if not exists deleted_at timestamptz;

alter table if exists public.milestones
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists id text,
  add column if not exists title text,
  add column if not exists target_date bigint,
  add column if not exists created_at timestamptz default timezone('utc', now()),
  add column if not exists updated_at timestamptz default timezone('utc', now()),
  add column if not exists deleted_at timestamptz;

update public.subjects
set
  settings = coalesce(settings, '{}'::jsonb),
  archived = coalesce(archived, false),
  created_at = coalesce(created_at, timezone('utc', now())),
  updated_at = coalesce(updated_at, timezone('utc', now()))
where
  settings is null
  or archived is null
  or created_at is null
  or updated_at is null;

update public.tasks
set
  completed_blocks = coalesce(completed_blocks, 0),
  completed = coalesce(completed, false),
  created_at = coalesce(created_at, timezone('utc', now())),
  updated_at = coalesce(updated_at, timezone('utc', now()))
where
  completed_blocks is null
  or completed is null
  or created_at is null
  or updated_at is null;

update public.focus_sessions
set
  duration_ms = coalesce(duration_ms, 0),
  completed = coalesce(completed, false),
  abandoned = coalesce(abandoned, false),
  intent = coalesce(intent, ''),
  session_type = coalesce(session_type, 'standard'),
  pot_spilled = coalesce(pot_spilled, false),
  interrupts = coalesce(interrupts, '[]'::jsonb),
  actual_focus_duration_ms = coalesce(actual_focus_duration_ms, 0),
  interrupt_duration_ms = coalesce(interrupt_duration_ms, 0),
  protection_ratio = coalesce(protection_ratio, 1),
  severity_impact = coalesce(severity_impact, 0),
  created_at = coalesce(created_at, timezone('utc', now())),
  updated_at = coalesce(updated_at, timezone('utc', now()))
where
  duration_ms is null
  or completed is null
  or abandoned is null
  or intent is null
  or session_type is null
  or pot_spilled is null
  or interrupts is null
  or actual_focus_duration_ms is null
  or interrupt_duration_ms is null
  or protection_ratio is null
  or severity_impact is null
  or created_at is null
  or updated_at is null;

update public.observations
set
  created_at = coalesce(created_at, timezone('utc', now())),
  updated_at = coalesce(updated_at, timezone('utc', now()))
where
  created_at is null
  or updated_at is null;

update public.milestones
set
  created_at = coalesce(created_at, timezone('utc', now())),
  updated_at = coalesce(updated_at, timezone('utc', now()))
where
  created_at is null
  or updated_at is null;

alter table public.subjects
  alter column settings set default '{}'::jsonb,
  alter column archived set default false,
  alter column updated_at set default timezone('utc', now());

alter table public.tasks
  alter column completed_blocks set default 0,
  alter column completed set default false,
  alter column updated_at set default timezone('utc', now());

alter table public.focus_sessions
  alter column duration_ms set default 0,
  alter column completed set default false,
  alter column abandoned set default false,
  alter column intent set default '',
  alter column session_type set default 'standard',
  alter column pot_spilled set default false,
  alter column interrupts set default '[]'::jsonb,
  alter column actual_focus_duration_ms set default 0,
  alter column interrupt_duration_ms set default 0,
  alter column protection_ratio set default 1,
  alter column severity_impact set default 0,
  alter column updated_at set default timezone('utc', now());

alter table public.observations
  alter column updated_at set default timezone('utc', now());

alter table public.milestones
  alter column updated_at set default timezone('utc', now());

create unique index if not exists subjects_user_id_id_key on public.subjects (user_id, id);
create unique index if not exists tasks_user_id_id_key on public.tasks (user_id, id);
create unique index if not exists focus_sessions_user_id_id_key on public.focus_sessions (user_id, id);
create unique index if not exists observations_user_id_id_key on public.observations (user_id, id);
create unique index if not exists milestones_user_id_id_key on public.milestones (user_id, id);

create index if not exists subjects_user_updated_idx on public.subjects (user_id, updated_at, id);
create index if not exists tasks_user_updated_idx on public.tasks (user_id, updated_at, id);
create index if not exists focus_sessions_user_updated_idx on public.focus_sessions (user_id, updated_at, id);
create index if not exists observations_user_updated_idx on public.observations (user_id, updated_at, id);
create index if not exists milestones_user_updated_idx on public.milestones (user_id, updated_at, id);

alter table public.subjects enable row level security;
alter table public.tasks enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.observations enable row level security;
alter table public.milestones enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.subjects to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.focus_sessions to authenticated;
grant select, insert, update, delete on public.observations to authenticated;
grant select, insert, update, delete on public.milestones to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'subjects' and policyname = 'subjects_select_own'
  ) then
    create policy subjects_select_own on public.subjects for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'subjects' and policyname = 'subjects_insert_own'
  ) then
    create policy subjects_insert_own on public.subjects for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'subjects' and policyname = 'subjects_update_own'
  ) then
    create policy subjects_update_own on public.subjects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'subjects' and policyname = 'subjects_delete_own'
  ) then
    create policy subjects_delete_own on public.subjects for delete using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'tasks' and policyname = 'tasks_select_own'
  ) then
    create policy tasks_select_own on public.tasks for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'tasks' and policyname = 'tasks_insert_own'
  ) then
    create policy tasks_insert_own on public.tasks for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'tasks' and policyname = 'tasks_update_own'
  ) then
    create policy tasks_update_own on public.tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'tasks' and policyname = 'tasks_delete_own'
  ) then
    create policy tasks_delete_own on public.tasks for delete using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'focus_sessions' and policyname = 'focus_sessions_select_own'
  ) then
    create policy focus_sessions_select_own on public.focus_sessions for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'focus_sessions' and policyname = 'focus_sessions_insert_own'
  ) then
    create policy focus_sessions_insert_own on public.focus_sessions for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'focus_sessions' and policyname = 'focus_sessions_update_own'
  ) then
    create policy focus_sessions_update_own on public.focus_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'focus_sessions' and policyname = 'focus_sessions_delete_own'
  ) then
    create policy focus_sessions_delete_own on public.focus_sessions for delete using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'observations' and policyname = 'observations_select_own'
  ) then
    create policy observations_select_own on public.observations for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'observations' and policyname = 'observations_insert_own'
  ) then
    create policy observations_insert_own on public.observations for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'observations' and policyname = 'observations_update_own'
  ) then
    create policy observations_update_own on public.observations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'observations' and policyname = 'observations_delete_own'
  ) then
    create policy observations_delete_own on public.observations for delete using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'milestones' and policyname = 'milestones_select_own'
  ) then
    create policy milestones_select_own on public.milestones for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'milestones' and policyname = 'milestones_insert_own'
  ) then
    create policy milestones_insert_own on public.milestones for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'milestones' and policyname = 'milestones_update_own'
  ) then
    create policy milestones_update_own on public.milestones for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'milestones' and policyname = 'milestones_delete_own'
  ) then
    create policy milestones_delete_own on public.milestones for delete using (auth.uid() = user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'subjects_touch_updated_at'
  ) then
    create trigger subjects_touch_updated_at
    before update on public.subjects
    for each row execute function public.krome_set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'tasks_touch_updated_at'
  ) then
    create trigger tasks_touch_updated_at
    before update on public.tasks
    for each row execute function public.krome_set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'focus_sessions_touch_updated_at'
  ) then
    create trigger focus_sessions_touch_updated_at
    before update on public.focus_sessions
    for each row execute function public.krome_set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'observations_touch_updated_at'
  ) then
    create trigger observations_touch_updated_at
    before update on public.observations
    for each row execute function public.krome_set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'milestones_touch_updated_at'
  ) then
    create trigger milestones_touch_updated_at
    before update on public.milestones
    for each row execute function public.krome_set_updated_at();
  end if;
end
$$;
