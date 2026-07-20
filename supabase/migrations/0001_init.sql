-- ============================================================================
-- Nosso Casório — Migration 0001 (M1, fatia vertical)
-- Escopo M1: casorio, membro, tema, subtema, item, auditoria + RLS + triggers.
-- convite/papéis-avançados ficam pro M3 (PRD §11).
--
-- Regras de ouro (AGENTS.md / PRD §9):
--  - Controle de acesso mora no banco (RLS), não só na UI.
--  - Dinheiro em CENTAVOS (inteiro), nunca float. (D08)
--  - Auditoria automática por trigger, append-only, imutável. (D07/RN22)
-- ============================================================================

-- Enums -----------------------------------------------------------------------
create type public.papel_membro as enum ('dono', 'editor', 'leitor');

-- 7 valores, incluindo descartado (RN05/RN23, D13)
create type public.status_item as enum (
  'a_fazer', 'feito',                                  -- sem custo
  'a_decidir', 'decidido', 'contratado', 'pago',       -- com custo
  'descartado'                                         -- qualquer item
);

-- ============================================================================
-- Tabelas
-- ============================================================================

-- casorio: o Espaço (1 no V1). orcamento_total em CENTAVOS. (RN09, D08)
create table public.casorio (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null check (length(trim(nome)) > 0),
  data_casamento  date,
  orcamento_total integer not null default 0 check (orcamento_total >= 0),  -- centavos
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- membro: usuário ↔ casório + papel. Base do RLS. (D04, RN18–20)
create table public.membro (
  id         uuid primary key default gen_random_uuid(),
  casorio_id uuid not null references public.casorio(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  papel      public.papel_membro not null,
  created_at timestamptz not null default now(),
  unique (casorio_id, user_id)
);

-- tema: categoria de topo
create table public.tema (
  id         uuid primary key default gen_random_uuid(),
  casorio_id uuid not null references public.casorio(id) on delete cascade,
  nome       text not null check (length(trim(nome)) > 0),   -- RN02
  ordem      integer not null default 0,                     -- RN04
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);

-- subtema: divisão de um tema. casorio_id desnormalizado (RLS trivial).
create table public.subtema (
  id         uuid primary key default gen_random_uuid(),
  tema_id    uuid not null references public.tema(id) on delete cascade,
  casorio_id uuid not null references public.casorio(id) on delete cascade,
  nome       text not null check (length(trim(nome)) > 0),
  ordem      integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);

-- item: unidade de decisão. Custos em CENTAVOS. (RN02/05/06/10, D08, D13, D14)
create table public.item (
  id                    uuid primary key default gen_random_uuid(),
  subtema_id            uuid not null references public.subtema(id) on delete cascade,
  casorio_id            uuid not null references public.casorio(id) on delete cascade,
  titulo                text not null check (length(trim(titulo)) > 0),
  tem_custo             boolean not null default false,
  status                public.status_item not null default 'a_fazer',
  custo_estimado        integer not null default 0 check (custo_estimado >= 0),  -- centavos
  custo_real            integer not null default 0 check (custo_real >= 0),      -- centavos
  data_alvo             date,
  observacao            text,
  motivo_descarte       text,
  essencial             boolean not null default false,       -- RN24
  responsavel_membro_id uuid references public.membro(id) on delete set null,
  fornecedor_nome       text,
  fornecedor_contato    text,
  fornecedor_link       text,
  ordem                 integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid default auth.uid(),
  updated_by            uuid default auth.uid(),

  -- Coerência status × tem_custo (RN05) — garantia na camada mais baixa
  constraint status_coerente_com_custo check (
    (tem_custo = false and status in ('a_fazer', 'feito', 'descartado'))
    or (tem_custo = true and status in ('a_decidir', 'decidido', 'contratado', 'pago', 'descartado'))
  ),
  -- Contratado/pago exige custo real > 0 (RN06)
  constraint contratado_pago_exige_real check (
    status not in ('contratado', 'pago') or custo_real > 0
  )
);

-- auditoria: trilha imutável (append-only). INSERT só por trigger. (D07/RN22/RF14)
create table public.auditoria (
  id              uuid primary key default gen_random_uuid(),
  casorio_id      uuid not null references public.casorio(id) on delete cascade,
  ator_user_id    uuid,
  ator_nome       text,                 -- snapshot p/ leitura
  acao            text not null,        -- criou · editou · excluiu · mudou_status
  entidade        text not null,        -- tema · subtema · item
  entidade_id     uuid,
  entidade_rotulo text,                 -- snapshot p/ leitura
  detalhe         jsonb not null default '{}'::jsonb,
  criado_em       timestamptz not null default now()
);

-- Índices p/ as buscas por casório
create index idx_membro_user      on public.membro(user_id);
create index idx_membro_casorio   on public.membro(casorio_id);
create index idx_tema_casorio     on public.tema(casorio_id);
create index idx_subtema_casorio  on public.subtema(casorio_id);
create index idx_subtema_tema     on public.subtema(tema_id);
create index idx_item_casorio     on public.item(casorio_id);
create index idx_item_subtema     on public.item(subtema_id);
create index idx_auditoria_casorio on public.auditoria(casorio_id, criado_em desc);

-- ============================================================================
-- Helpers de acesso (SECURITY DEFINER p/ evitar recursão de RLS na membro)
-- ============================================================================

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

-- ============================================================================
-- Trigger: ao criar casório, quem criou vira DONO (D09 / reforça RN19)
--   SECURITY DEFINER: o INSERT em membro passa por cima do RLS "só dono mexe".
-- ============================================================================

create or replace function public.fn_casorio_cria_dono()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.membro (casorio_id, user_id, papel)
  values (new.id, auth.uid(), 'dono');
  return new;
end;
$$;

create trigger trg_casorio_cria_dono
  after insert on public.casorio
  for each row execute function public.fn_casorio_cria_dono();

-- ============================================================================
-- Trigger: proteger o ÚLTIMO dono (RN19) — não remover/rebaixar
-- ============================================================================

create or replace function public.fn_protege_ultimo_dono()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_donos_restantes integer;
begin
  -- só interessa quando o alvo É dono e deixa de ser (delete ou rebaixe)
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

create trigger trg_protege_ultimo_dono
  before update or delete on public.membro
  for each row execute function public.fn_protege_ultimo_dono();

-- ============================================================================
-- Trigger genérico de auditoria (tema/subtema/item) — automático e imutável
--   Usa to_jsonb(record) p/ ler colunas que variam entre tabelas. (D07/RN22)
-- ============================================================================

create or replace function public.fn_auditoria()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_rec        jsonb;
  v_old        jsonb;
  v_casorio    uuid;
  v_rotulo     text;
  v_acao       text;
  v_detalhe    jsonb := '{}'::jsonb;
  v_entidade   text := tg_table_name;
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
    -- mudança de status vira ação específica + detalhe de/para
    if (v_old ? 'status') and (v_old->>'status' is distinct from v_rec->>'status') then
      v_acao := 'mudou_status';
      v_detalhe := jsonb_build_object('de', v_old->>'status', 'para', v_rec->>'status');
    end if;
  end if;

  v_casorio     := (v_rec->>'casorio_id')::uuid;
  v_entidade_id := (v_rec->>'id')::uuid;
  v_rotulo      := coalesce(v_rec->>'titulo', v_rec->>'nome', v_rec->>'id');

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

create trigger trg_auditoria_tema
  after insert or update or delete on public.tema
  for each row execute function public.fn_auditoria();
create trigger trg_auditoria_subtema
  after insert or update or delete on public.subtema
  for each row execute function public.fn_auditoria();
create trigger trg_auditoria_item
  after insert or update or delete on public.item
  for each row execute function public.fn_auditoria();

-- ============================================================================
-- Trigger de "touch": mantém updated_at / updated_by nas edições
-- ============================================================================

create or replace function public.fn_touch()
returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger trg_touch_tema    before update on public.tema
  for each row execute function public.fn_touch();
create trigger trg_touch_subtema before update on public.subtema
  for each row execute function public.fn_touch();
create trigger trg_touch_item    before update on public.item
  for each row execute function public.fn_touch();

-- casorio tem updated_at mas sem updated_by
create or replace function public.fn_touch_casorio()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end;
$$;
create trigger trg_touch_casorio before update on public.casorio
  for each row execute function public.fn_touch_casorio();

-- ============================================================================
-- RLS — habilitado em TODAS as tabelas (garantia na camada mais baixa)
-- ============================================================================

alter table public.casorio   enable row level security;
alter table public.membro    enable row level security;
alter table public.tema      enable row level security;
alter table public.subtema   enable row level security;
alter table public.item      enable row level security;
alter table public.auditoria enable row level security;

-- casorio ----------------------------------------------------------------
-- ver: só membros. criar: qualquer autenticado (vira dono via trigger).
create policy casorio_select on public.casorio
  for select using (public.is_member(id));
create policy casorio_insert on public.casorio
  for insert with check (auth.uid() is not null);
create policy casorio_update on public.casorio
  for update using (public.has_role(id, array['dono']::public.papel_membro[]));
create policy casorio_delete on public.casorio
  for delete using (public.has_role(id, array['dono']::public.papel_membro[]));

-- membro -----------------------------------------------------------------
-- ver: membros do casório. mexer: só Dono (RN18). Último dono protegido por trigger.
create policy membro_select on public.membro
  for select using (public.is_member(casorio_id));
create policy membro_insert on public.membro
  for insert with check (public.has_role(casorio_id, array['dono']::public.papel_membro[]));
create policy membro_update on public.membro
  for update using (public.has_role(casorio_id, array['dono']::public.papel_membro[]));
create policy membro_delete on public.membro
  for delete using (public.has_role(casorio_id, array['dono']::public.papel_membro[]));

-- tema / subtema / item --------------------------------------------------
-- ver: membros. escrever: Dono ou Editor (RN20).
create policy tema_select on public.tema
  for select using (public.is_member(casorio_id));
create policy tema_write on public.tema
  for all
  using (public.has_role(casorio_id, array['dono','editor']::public.papel_membro[]))
  with check (public.has_role(casorio_id, array['dono','editor']::public.papel_membro[]));

create policy subtema_select on public.subtema
  for select using (public.is_member(casorio_id));
create policy subtema_write on public.subtema
  for all
  using (public.has_role(casorio_id, array['dono','editor']::public.papel_membro[]))
  with check (public.has_role(casorio_id, array['dono','editor']::public.papel_membro[]));

create policy item_select on public.item
  for select using (public.is_member(casorio_id));
create policy item_write on public.item
  for all
  using (public.has_role(casorio_id, array['dono','editor']::public.papel_membro[]))
  with check (public.has_role(casorio_id, array['dono','editor']::public.papel_membro[]));

-- auditoria --------------------------------------------------------------
-- ver: membros. SEM insert/update/delete p/ ninguém (RN22).
-- O INSERT real acontece via fn_auditoria() (SECURITY DEFINER, ignora RLS).
create policy auditoria_select on public.auditoria
  for select using (public.is_member(casorio_id));
