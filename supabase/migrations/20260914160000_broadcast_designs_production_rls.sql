-- WAB-TKD Broadcast Design Studio: production design storage + role-aware RLS.
create table if not exists public.broadcast_designs (
  id text primary key,
  animation_id text not null,
  tournament_id text null,
  display_id text null,
  status text not null check (status in ('draft','published')),
  version integer not null default 1,
  design jsonb not null,
  updated_by uuid null references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index if not exists broadcast_designs_tournament_idx on public.broadcast_designs(tournament_id);
create index if not exists broadcast_designs_animation_idx on public.broadcast_designs(animation_id);
create index if not exists broadcast_designs_status_idx on public.broadcast_designs(status);

alter table public.broadcast_designs enable row level security;

create or replace function public.wab_role() returns text
language sql stable security definer set search_path=public as $$
  select upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'role',''));
$$;
create or replace function public.wab_is_staff() returns boolean
language sql stable as $$ select auth.role()='authenticated' and public.wab_role() in ('ADMIN','SUPERVISOR'); $$;
create or replace function public.wab_is_operator() returns boolean
language sql stable as $$ select auth.role()='authenticated' and public.wab_role() in ('OPERATOR','SUPERVISOR','ADMIN'); $$;

-- Replace only policies owned by this feature; repeated migration is safe.
drop policy if exists "broadcast designs admin supervisor" on public.broadcast_designs;
drop policy if exists "broadcast designs operator insert" on public.broadcast_designs;
drop policy if exists "broadcast designs operator own update" on public.broadcast_designs;
drop policy if exists "broadcast designs published read" on public.broadcast_designs;

create policy "broadcast designs admin supervisor" on public.broadcast_designs
  for all to authenticated using (public.wab_is_staff()) with check (public.wab_is_staff());
create policy "broadcast designs operator insert" on public.broadcast_designs
  for insert to authenticated with check (public.wab_is_operator() and public.wab_role()='OPERATOR' and status='draft' and updated_by=auth.uid());
create policy "broadcast designs operator own update" on public.broadcast_designs
  for update to authenticated using (public.wab_is_operator() and public.wab_role()='OPERATOR' and updated_by=auth.uid()) with check (public.wab_is_operator() and public.wab_role()='OPERATOR' and status='draft' and updated_by=auth.uid());
create policy "broadcast designs published read" on public.broadcast_designs
  for select to authenticated using (status='published' or public.wab_is_operator());

revoke all on public.broadcast_designs from anon;
grant select,insert,update,delete on public.broadcast_designs to authenticated;
