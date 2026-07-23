# 💍 Nosso Casório

App web privado para **Rodrigo & Jennifer** organizarem o casamento: uma árvore de **Temas** com **itens** (preço, status e prazo), mostrando num relance o que já resolveram, o que falta, **quanto custa** e o que está **perto do prazo** — do celular ou do PC, com **tema claro/escuro**.

> 📖 **Documento mestre:** o desenho do produto, regras e arquitetura estão no **[PRD.md](./docs/PRD.md)** — a fonte da verdade. Pendências e decisões de operação em **[docs/pendencias.md](./docs/pendencias.md)**.

## Stack
- **Next.js** (React + TypeScript) — App Router
- **Supabase** — Postgres + Auth + RLS
- **Vercel** (deploy) · **GitHub Actions** (CI + release automático)
- Testes: **Vitest** (unit) · **Playwright** (E2E)

## Como funciona (visão rápida)
- **Árvore:** cada **Tema** (ex.: "Comida") tem **itens** direto (ex.: "Bolo — R$ 800"). **Subtemas** são um agrupamento **opcional** — só quando você quer separar dentro do tema. Só o **item** carrega preço/status/prazo.
- **Painel:** contagem regressiva, anel de progresso, painel de orçamento (teto/planejado/comprometido/pago/saldo + barra empilhada), chips de prazo.
- **Navegação:** **abas de tema** + uma **visão geral** (grade de cards), em vez de rolagem infinita.
- **Montar a árvore** (`/montar`): tela dedicada pra construir/editar a estrutura.
- **Salvar é instantâneo** (na tela, sem trocar de página), com toast de confirmação.

## Arquitetura (resumo)
Monólito modular, **hexagonal**: núcleo de domínio puro (regras + cálculos) isolado do mundo por **portas** (interfaces). O controle de acesso é garantido no banco (**RLS**), não só na tela. Detalhes → [PRD §4](./docs/PRD.md).

```
/src
  /domain        # entidades + regras (RN) + cálculos — puro, sem infra
  /application   # casos de uso (+ testes)
  /ports         # interfaces (contratos)
  /adapters      # supabase (real) e memoria (testes)
  /app           # Next.js App Router (páginas + server actions)
  /components    # UI React
/supabase/migrations   # schema SQL + policies RLS
/e2e                   # testes Playwright
/scripts               # seed da conta, smoke, teste de RLS
```

## Como rodar (local)

Pré-requisitos: **Node 20+**. Não precisa de Docker — o dev usa o **mesmo Supabase da nuvem**.

```bash
# 1. Dependências
npm install

# 2. .env.local (git-ignored — NUNCA comitar). Precisa de:
#    NEXT_PUBLIC_SUPABASE_URL
#    NEXT_PUBLIC_SUPABASE_ANON_KEY   (chave pública/anon — protegida por RLS)
#    CASORIO_EMAIL / CASORIO_SENHA   (a conta fixa do casal — usada pelo seed)

# 3. Criar/garantir a conta de login (idempotente)
npm run seed:conta

# 4. Rodar
npm run dev        # http://localhost:3000
```

> ⚠️ O dev local aponta pro **Supabase de produção** (o casório real). Tudo que criar aqui é real — use um tema "TESTE" e apague depois.

### Login
O app usa **e-mail + senha** com uma **conta fixa do casal** (criada pelo `seed:conta`, credenciais no `.env.local`). O **cadastro público é fechado** no Supabase — só essa conta entra. Sem confirmação de e-mail (dispensada por decisão para um app privado).

## Scripts
```bash
npm run dev        # desenvolvimento
npm run build      # build de produção
npm run typecheck  # tsc --noEmit
npm test           # unit (Vitest)
npm run test:e2e   # E2E (Playwright) — sobe o app e roda no navegador
npm run test:rls   # smoke de RLS contra o Supabase (anônimo bloqueado)
npm run seed:conta # cria/garante a conta fixa do casal
```

## Deploy & versão
- **App:** Vercel — **deploy automático a cada push na `main`**. Env vars (`NEXT_PUBLIC_SUPABASE_*`) no painel da Vercel; segredos nunca no git.
- **Banco:** Supabase na nuvem. Migrations em `/supabase/migrations`.
- **CI (GitHub Actions):** `ci.yml` roda typecheck + testes + build em todo push/PR.
- **Versão automática (SemVer):** `release.yml` usa **semantic-release** — lê os *Conventional Commits* (`fix:`=PATCH, `feat:`=MINOR, `BREAKING CHANGE`=MAJOR), bumpa a versão, gera **CHANGELOG.md**, cria tag/release. O rodapé mostra a versão do `package.json`.

## Licença
[MIT](./LICENSE) © 2026 Rodrigo e Jennifer
