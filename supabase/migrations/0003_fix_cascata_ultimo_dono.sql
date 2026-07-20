-- ============================================================================
-- Fix: a proteção do último Dono (RN19) bloqueava o DELETE em cascata do
-- casório — tornando impossível apagar um casório.
--
-- Regra correta: proteger o último Dono só enquanto o casório EXISTE. Se o
-- próprio casório está sendo apagado, a cascata em `membro` deve passar.
-- ============================================================================

create or replace function public.fn_protege_ultimo_dono()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_donos_restantes integer;
begin
  -- Cascata: o casório já foi removido nesta mesma transação -> deixa passar.
  if (tg_op = 'DELETE') then
    if not exists (select 1 from public.casorio c where c.id = old.casorio_id) then
      return old;
    end if;
  end if;

  -- só interessa quando o alvo É dono e deixa de ser (remoção ou rebaixamento)
  if (old.papel = 'dono') and (tg_op = 'DELETE' or new.papel <> 'dono') then
    select count(*) into v_donos_restantes
    from public.membro
    where casorio_id = old.casorio_id and papel = 'dono' and id <> old.id;

    if v_donos_restantes = 0 then
      raise exception 'Não é possível remover ou rebaixar o último Dono do casório (RN19).';
    end if;
  end if;

  if (tg_op = 'DELETE') then return old; else return new; end if;
end;
$$;
