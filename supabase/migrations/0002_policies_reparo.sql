-- ============================================================================
-- Reparo idempotente das POLICIES de RLS (0001 aplicou tabelas/funções, mas as
-- policies não entraram — RLS ligado sem policy = nega tudo).
-- Pode rodar quantas vezes quiser: dropa e recria.
-- ============================================================================

-- Garante RLS ligado em todas
alter table public.casorio   enable row level security;
alter table public.membro    enable row level security;
alter table public.tema      enable row level security;
alter table public.subtema   enable row level security;
alter table public.item      enable row level security;
alter table public.auditoria enable row level security;

-- Garante as funções auxiliares (SECURITY DEFINER evita recursão de RLS)
create or replace function public.is_member(p_casorio uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.membro m
    where m.casorio_id = p_casorio and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_role(p_casorio uuid, p_roles public.papel_membro[])
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.membro m
    where m.casorio_id = p_casorio
      and m.user_id = auth.uid()
      and m.papel = any(p_roles)
  );
$$;

-- casorio -------------------------------------------------------------------
drop policy if exists casorio_select on public.casorio;
drop policy if exists casorio_insert on public.casorio;
drop policy if exists casorio_update on public.casorio;
drop policy if exists casorio_delete on public.casorio;

create policy casorio_select on public.casorio
  for select to authenticated using (public.is_member(id));
create policy casorio_insert on public.casorio
  for insert to authenticated with check (auth.uid() is not null);
create policy casorio_update on public.casorio
  for update to authenticated using (public.has_role(id, array['dono']::public.papel_membro[]));
create policy casorio_delete on public.casorio
  for delete to authenticated using (public.has_role(id, array['dono']::public.papel_membro[]));

-- membro --------------------------------------------------------------------
drop policy if exists membro_select on public.membro;
drop policy if exists membro_insert on public.membro;
drop policy if exists membro_update on public.membro;
drop policy if exists membro_delete on public.membro;

create policy membro_select on public.membro
  for select to authenticated using (public.is_member(casorio_id));
create policy membro_insert on public.membro
  for insert to authenticated with check (public.has_role(casorio_id, array['dono']::public.papel_membro[]));
create policy membro_update on public.membro
  for update to authenticated using (public.has_role(casorio_id, array['dono']::public.papel_membro[]));
create policy membro_delete on public.membro
  for delete to authenticated using (public.has_role(casorio_id, array['dono']::public.papel_membro[]));

-- tema ----------------------------------------------------------------------
drop policy if exists tema_select on public.tema;
drop policy if exists tema_write on public.tema;

create policy tema_select on public.tema
  for select to authenticated using (public.is_member(casorio_id));
create policy tema_write on public.tema
  for all to authenticated
  using (public.has_role(casorio_id, array['dono','editor']::public.papel_membro[]))
  with check (public.has_role(casorio_id, array['dono','editor']::public.papel_membro[]));

-- subtema -------------------------------------------------------------------
drop policy if exists subtema_select on public.subtema;
drop policy if exists subtema_write on public.subtema;

create policy subtema_select on public.subtema
  for select to authenticated using (public.is_member(casorio_id));
create policy subtema_write on public.subtema
  for all to authenticated
  using (public.has_role(casorio_id, array['dono','editor']::public.papel_membro[]))
  with check (public.has_role(casorio_id, array['dono','editor']::public.papel_membro[]));

-- item ----------------------------------------------------------------------
drop policy if exists item_select on public.item;
drop policy if exists item_write on public.item;

create policy item_select on public.item
  for select to authenticated using (public.is_member(casorio_id));
create policy item_write on public.item
  for all to authenticated
  using (public.has_role(casorio_id, array['dono','editor']::public.papel_membro[]))
  with check (public.has_role(casorio_id, array['dono','editor']::public.papel_membro[]));

-- auditoria -----------------------------------------------------------------
-- Só SELECT p/ membros. Nada de INSERT/UPDATE/DELETE (RN22 — trilha imutável).
-- O INSERT real vem do trigger fn_auditoria (SECURITY DEFINER, ignora RLS).
drop policy if exists auditoria_select on public.auditoria;

create policy auditoria_select on public.auditoria
  for select to authenticated using (public.is_member(casorio_id));

-- ============================================================================
-- Conferência: deve listar 17 policies
-- ============================================================================
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
