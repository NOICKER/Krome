do $$
declare
  legacy_constraint record;
begin
  for legacy_constraint in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'subjects'
      and con.contype in ('p', 'u')
      and coalesce((
        select array_agg(att.attname order by cols.ord)::text[]
        from unnest(con.conkey) with ordinality as cols(attnum, ord)
        join pg_attribute att on att.attrelid = rel.oid and att.attnum = cols.attnum
      ), array[]::text[]) = array['id']::text[]
  loop
    execute format('alter table public.subjects drop constraint %I', legacy_constraint.conname);
  end loop;
end
$$;

do $$
declare
  legacy_index record;
begin
  for legacy_index in
    select idx.relname as index_name
    from pg_index ind
    join pg_class idx on idx.oid = ind.indexrelid
    join pg_class rel on rel.oid = ind.indrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'subjects'
      and ind.indisunique
      and not ind.indisprimary
      and not exists (
        select 1
        from pg_constraint con
        where con.conindid = ind.indexrelid
      )
      and coalesce((
        select array_agg(att.attname order by cols.ord)::text[]
        from unnest(ind.indkey::smallint[]) with ordinality as cols(attnum, ord)
        join pg_attribute att on att.attrelid = rel.oid and att.attnum = cols.attnum
        where cols.attnum > 0
      ), array[]::text[]) = array['id']::text[]
  loop
    execute format('drop index if exists public.%I', legacy_index.index_name);
  end loop;
end
$$;

create unique index if not exists subjects_user_id_id_key on public.subjects (user_id, id);
