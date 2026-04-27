-- Neutrawn tables for KROME
-- Adds cards, card_connections, canvas_positions, canvas_shapes, canvas_stickies.
-- Follows the same composite PK, RLS, and trigger patterns as existing KROME tables.

-- -----------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------

create table if not exists public.cards (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  session_id text,
  subject text not null default '',
  tags jsonb not null default '[]'::jsonb,
  error_type text not null default '',
  status text not null default 'unseen',
  note text not null default '',
  why_wrong text not null default '',
  ocr_text text not null default '',
  screenshot_url text not null default '',
  next_review timestamptz,
  w integer not null default 0,
  h integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.card_connections (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  card_from text not null,
  card_to text not null,
  reason text not null default 'manual',
  type text not null default 'manual',
  label text not null default '',
  color text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.canvas_positions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  card_id text not null,
  canvas_id text not null,
  x numeric not null default 0,
  y numeric not null default 0,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, id)
);

create table if not exists public.canvas_shapes (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  canvas_id text not null,
  shape_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.canvas_stickies (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  canvas_id text not null,
  x numeric not null default 0,
  y numeric not null default 0,
  w integer not null default 0,
  h integer not null default 0,
  text text not null default '',
  color text not null default '',
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  primary key (user_id, id)
);

-- -----------------------------------------------------------------------
-- Unique indexes (match existing pattern)
-- -----------------------------------------------------------------------

create unique index if not exists cards_user_id_id_key on public.cards (user_id, id);
create unique index if not exists card_connections_user_id_id_key on public.card_connections (user_id, id);
create unique index if not exists canvas_positions_user_id_id_key on public.canvas_positions (user_id, id);
create unique index if not exists canvas_shapes_user_id_id_key on public.canvas_shapes (user_id, id);
create unique index if not exists canvas_stickies_user_id_id_key on public.canvas_stickies (user_id, id);

-- Sync cursor indexes
create index if not exists cards_user_updated_idx on public.cards (user_id, updated_at, id);
create index if not exists card_connections_user_updated_idx on public.card_connections (user_id, updated_at, id);
create index if not exists canvas_positions_user_updated_idx on public.canvas_positions (user_id, updated_at, id);
create index if not exists canvas_shapes_user_updated_idx on public.canvas_shapes (user_id, updated_at, id);
create index if not exists canvas_stickies_user_updated_idx on public.canvas_stickies (user_id, updated_at, id);

-- -----------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------

alter table public.cards enable row level security;
alter table public.card_connections enable row level security;
alter table public.canvas_positions enable row level security;
alter table public.canvas_shapes enable row level security;
alter table public.canvas_stickies enable row level security;

grant select, insert, update, delete on public.cards to authenticated;
grant select, insert, update, delete on public.card_connections to authenticated;
grant select, insert, update, delete on public.canvas_positions to authenticated;
grant select, insert, update, delete on public.canvas_shapes to authenticated;
grant select, insert, update, delete on public.canvas_stickies to authenticated;

-- -----------------------------------------------------------------------
-- RLS policies
-- -----------------------------------------------------------------------

do $$
begin
  -- cards
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'cards' and policyname = 'cards_select_own'
  ) then
    create policy cards_select_own on public.cards for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'cards' and policyname = 'cards_insert_own'
  ) then
    create policy cards_insert_own on public.cards for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'cards' and policyname = 'cards_update_own'
  ) then
    create policy cards_update_own on public.cards for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'cards' and policyname = 'cards_delete_own'
  ) then
    create policy cards_delete_own on public.cards for delete using (auth.uid() = user_id);
  end if;

  -- card_connections
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'card_connections' and policyname = 'card_connections_select_own'
  ) then
    create policy card_connections_select_own on public.card_connections for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'card_connections' and policyname = 'card_connections_insert_own'
  ) then
    create policy card_connections_insert_own on public.card_connections for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'card_connections' and policyname = 'card_connections_update_own'
  ) then
    create policy card_connections_update_own on public.card_connections for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'card_connections' and policyname = 'card_connections_delete_own'
  ) then
    create policy card_connections_delete_own on public.card_connections for delete using (auth.uid() = user_id);
  end if;

  -- canvas_positions
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'canvas_positions' and policyname = 'canvas_positions_select_own'
  ) then
    create policy canvas_positions_select_own on public.canvas_positions for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'canvas_positions' and policyname = 'canvas_positions_insert_own'
  ) then
    create policy canvas_positions_insert_own on public.canvas_positions for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'canvas_positions' and policyname = 'canvas_positions_update_own'
  ) then
    create policy canvas_positions_update_own on public.canvas_positions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'canvas_positions' and policyname = 'canvas_positions_delete_own'
  ) then
    create policy canvas_positions_delete_own on public.canvas_positions for delete using (auth.uid() = user_id);
  end if;

  -- canvas_shapes
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'canvas_shapes' and policyname = 'canvas_shapes_select_own'
  ) then
    create policy canvas_shapes_select_own on public.canvas_shapes for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'canvas_shapes' and policyname = 'canvas_shapes_insert_own'
  ) then
    create policy canvas_shapes_insert_own on public.canvas_shapes for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'canvas_shapes' and policyname = 'canvas_shapes_update_own'
  ) then
    create policy canvas_shapes_update_own on public.canvas_shapes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'canvas_shapes' and policyname = 'canvas_shapes_delete_own'
  ) then
    create policy canvas_shapes_delete_own on public.canvas_shapes for delete using (auth.uid() = user_id);
  end if;

  -- canvas_stickies
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'canvas_stickies' and policyname = 'canvas_stickies_select_own'
  ) then
    create policy canvas_stickies_select_own on public.canvas_stickies for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'canvas_stickies' and policyname = 'canvas_stickies_insert_own'
  ) then
    create policy canvas_stickies_insert_own on public.canvas_stickies for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'canvas_stickies' and policyname = 'canvas_stickies_update_own'
  ) then
    create policy canvas_stickies_update_own on public.canvas_stickies for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'canvas_stickies' and policyname = 'canvas_stickies_delete_own'
  ) then
    create policy canvas_stickies_delete_own on public.canvas_stickies for delete using (auth.uid() = user_id);
  end if;
end
$$;

-- -----------------------------------------------------------------------
-- updated_at triggers (reuses existing krome_set_updated_at function)
-- -----------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'cards_touch_updated_at'
  ) then
    create trigger cards_touch_updated_at
    before update on public.cards
    for each row execute function public.krome_set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'card_connections_touch_updated_at'
  ) then
    create trigger card_connections_touch_updated_at
    before update on public.card_connections
    for each row execute function public.krome_set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'canvas_positions_touch_updated_at'
  ) then
    create trigger canvas_positions_touch_updated_at
    before update on public.canvas_positions
    for each row execute function public.krome_set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'canvas_shapes_touch_updated_at'
  ) then
    create trigger canvas_shapes_touch_updated_at
    before update on public.canvas_shapes
    for each row execute function public.krome_set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'canvas_stickies_touch_updated_at'
  ) then
    create trigger canvas_stickies_touch_updated_at
    before update on public.canvas_stickies
    for each row execute function public.krome_set_updated_at();
  end if;
end
$$;
