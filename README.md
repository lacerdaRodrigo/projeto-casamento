# 💍 Nosso Casório

App web privado para **Rodrigo & Jennifer** organizarem o casamento numa árvore **Tema → Subtema → Item**, enxergando num relance o que já resolveram, o que falta, **quanto custa** e o que está **perto do prazo** — a dois (e com convidados de confiança), do celular ou do PC.

> 📖 **Documento mestre:** todo o desenho do produto, regras e arquitetura estão no **[PRD.md](./docs/PRD.md)** — a fonte da verdade. Este README só te coloca pra rodar.

## Stack
- **Next.js** (React + TypeScript) — App Router
- **Supabase** — Postgres + Auth + RLS
- **Vercel** (deploy) · **GitHub Actions** (CI) · **SonarCloud** (qualidade)
- Testes: **Vitest** · **React Testing Library** · **Playwright**

## Arquitetura (resumo)
Monólito modular, **hexagonal**: núcleo de domínio puro (regras + cálculos), isolado do mundo por contratos (portas). O acesso é garantido no banco (**RLS**), não só na tela. Detalhes → [PRD §4](./docs/PRD.md).

```
/src
  /domain        # entidades + regras (RN) + cálculos — puro, sem infra
  /application   # casos de uso
  /ports         # interfaces (contratos)
  /adapters/supabase
  /app           # Next.js App Router
  /components    # UI React
/supabase/migrations   # schema SQL + policies RLS
```

## Como rodar (local)

Pré-requisitos: **Node 20+**, **Docker** (pro Supabase local) e **Supabase CLI**.

```bash
# 1. Instalar dependências
npm install

# 2. Subir o Supabase local (Postgres + Auth + Studio)
supabase start

# 3. Aplicar schema e policies
supabase db reset

# 4. Variáveis de ambiente (crie .env.local — NUNCA comitar!)
#    NEXT_PUBLIC_SUPABASE_URL  e  NEXT_PUBLIC_SUPABASE_ANON_KEY
#    (o comando `supabase start` imprime os dois)

# 5. Rodar o app
npm run dev        # http://localhost:3000
```

## Scripts
```bash
npm run dev        # desenvolvimento
npm run build      # build de produção
npm test           # unit + componente (Vitest)
npm run test:e2e   # E2E (Playwright)
npm run lint       # ESLint + Prettier
npm run typecheck  # tsc
```

## Deploy
- **App:** Vercel (conecta no repo; env vars no painel).
- **Banco:** Supabase (projeto na nuvem; aplicar migrations).
- Segredos **só** em variáveis de ambiente — nunca no git.

## Roadmap
V1 em marcos: **M1** esqueleto fim-a-fim → **M2** núcleo (árvore + dinheiro) → **M3** colaboração → **M4** acabamento. Detalhes → [PRD §11](./docs/PRD.md).

## Licença
[MIT](./LICENSE) © 2026 Rodrigo e Jennifer
