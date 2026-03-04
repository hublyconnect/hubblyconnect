create table if not exists public.agency_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists agency_tags_unique_name
  on public.agency_tags (agency_id, lower(name));

alter table public.agency_tags enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'agency_tags'
  ) then
    create policy "agency_tags_read" on public.agency_tags
      for select to authenticated using (true);
    create policy "agency_tags_write" on public.agency_tags
      for insert to authenticated with check (true);
    create policy "agency_tags_update" on public.agency_tags
      for update to authenticated using (true);
    create policy "agency_tags_delete" on public.agency_tags
      for delete to authenticated using (true);
  end if;
end $$;

