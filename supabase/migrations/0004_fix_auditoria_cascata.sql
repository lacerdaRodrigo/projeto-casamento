-- ============================================================================
-- Fix: ao apagar um casório, a cascata remove tema/subtema/item e o trigger de
-- auditoria tentava gravar o "excluiu" referenciando um casório que já não
-- existe na mesma transação -> viola auditoria_casorio_id_fkey.
--
-- Regra correta: se o casório já foi removido, não há o que auditar — a própria
-- trilha dele também está sendo apagada em cascata. Só pular a gravação.
-- ============================================================================

create or replace function public.fn_auditoria()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_rec         jsonb;
  v_old         jsonb;
  v_casorio     uuid;
  v_rotulo      text;
  v_acao        text;
  v_detalhe     jsonb := '{}'::jsonb;
  v_entidade    text := tg_table_name;
  v_entidade_id uuid;
begin
  if (tg_op = 'DELETE') then
    v_rec := to_jsonb(old);
    v_acao := 'excluiu';
  elsif (tg_op = 'INSERT') then
    v_rec := to_jsonb(new);
    v_acao := 'criou';
  else
    v_rec := to_jsonb(new);
    v_old := to_jsonb(old);
    v_acao := 'editou';
    if (v_old ? 'status') and (v_old->>'status' is distinct from v_rec->>'status') then
      v_acao := 'mudou_status';
      v_detalhe := jsonb_build_object('de', v_old->>'status', 'para', v_rec->>'status');
    end if;
  end if;

  v_casorio     := (v_rec->>'casorio_id')::uuid;
  v_entidade_id := (v_rec->>'id')::uuid;
  v_rotulo      := coalesce(v_rec->>'titulo', v_rec->>'nome', v_rec->>'id');

  -- Cascata: casório já removido nesta transação -> nada a auditar.
  if not exists (select 1 from public.casorio c where c.id = v_casorio) then
    if (tg_op = 'DELETE') then return old; else return new; end if;
  end if;

  insert into public.auditoria (
    casorio_id, ator_user_id, ator_nome, acao, entidade, entidade_id, entidade_rotulo, detalhe
  ) values (
    v_casorio,
    auth.uid(),
    coalesce(auth.jwt() ->> 'email', 'sistema'),
    v_acao, v_entidade, v_entidade_id, v_rotulo, v_detalhe
  );

  if (tg_op = 'DELETE') then return old; else return new; end if;
end;
$$;
