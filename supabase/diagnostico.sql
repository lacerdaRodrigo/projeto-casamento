-- ============================================================================
-- DIAGNÓSTICO TEMPORÁRIO — rodar no SQL Editor.
-- Expõe 2 funções de leitura pra investigar o RLS de fora.
-- APAGAR depois (ver docs/pendencias.md):
--   drop function if exists public.debug_whoami();
--   drop function if exists public.debug_policies();
-- ============================================================================

-- Quem o banco acha que eu sou, quando chamo autenticado?
create or replace function public.debug_whoami()
returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'auth_uid', auth.uid(),
    'current_role', current_user,
    'jwt_claims_presentes', (current_setting('request.jwt.claims', true) is not null)
  );
$$;

-- Quais policies existem de fato?
create or replace function public.debug_policies()
returns table(tabela text, policy text, cmd text, roles text)
language sql stable security definer set search_path = public as $$
  select tablename::text, policyname::text, cmd::text, array_to_string(roles, ',')
  from pg_policies
  where schemaname = 'public'
  order by tablename, policyname;
$$;

grant execute on function public.debug_whoami() to authenticated;
grant execute on function public.debug_policies() to authenticated;

-- Conferência local
select * from public.debug_policies();
