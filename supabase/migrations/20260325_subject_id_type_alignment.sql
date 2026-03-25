do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'subjects'
      and column_name = 'id'
      and data_type = 'uuid'
  ) then
    alter table public.subjects
      alter column id type text using id::text;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name = 'subject_id'
      and data_type = 'uuid'
  ) then
    alter table public.tasks
      alter column subject_id type text using subject_id::text;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'focus_sessions'
      and column_name = 'subject_id'
      and data_type = 'uuid'
  ) then
    alter table public.focus_sessions
      alter column subject_id type text using subject_id::text;
  end if;
end
$$;
