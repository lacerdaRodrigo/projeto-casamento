# AGENTS.md — contexto pra IAs neste projeto

> **Leia o [PRD.md](./docs/PRD.md) primeiro — é a fonte da verdade.** Este arquivo resume as regras que você (agente de IA) deve seguir ao programar. Em qualquer conflito, o PRD vence.

## O que é
"Nosso Casório": web app privado pra um casal organizar o casamento (árvore **Tema → Subtema → Item**, com status, orçamento e prazos). Contexto completo: PRD §1.

## Regras de ouro (inegociáveis)
1. **Núcleo puro isolado por contratos.** Persistência/integração entram por **porta** (interface). O `/domain` **não importa** infra — nem Supabase, nem React, nem `fetch`.
2. **A garantia mora na camada mais baixa.** Controle de acesso = **RLS no Postgres** (não só na UI). Regra de negócio = no domínio (não espalhada).
3. **Todo dado externo é hostil.** Validar no servidor (zod) antes de gravar — **além** do RLS.

## Convenções cravadas (não reinvente)
- 💸 **Dinheiro em centavos (inteiro)** — nunca `float`. (D08)
- ⏰ **Prazos em `America/Sao_Paulo`, comparados por data.** O núcleo **recebe o "hoje" injetado** — não chama o relógio dentro do domínio. (D08)
- 🔢 **Regras de negócio são numeradas (RN01…)** no PRD §3 — referencie a RN no código e nos testes.
- 🗂️ **Árvore = 3 tabelas** (tema/subtema/item), com `casorio_id` em todas. (§5, D01)
- 📝 **Auditoria é automática (trigger) e imutável.** Não logue na mão; não crie UPDATE/DELETE nela. (D07, RN22)
- 🔄 **Status:** item *sem custo* → `a_fazer→feito`; *com custo* → `a_decidir→decidido→contratado→pago`. *Contratado/pago* exige custo real. (RN05–08)
- 🏷️ **Commits = Conventional Commits.** A versão do app é **SemVer bumpada automaticamente** pelo CI: `fix:`=PATCH, `feat:`=MINOR, `feat!:`/`BREAKING CHANGE:`=MAJOR. Nunca edite a versão na mão. (D15, §9.4)

## Stack & estrutura
Next.js (React + TS, App Router) · Supabase (Postgres + Auth + RLS) · Vercel · GitHub Actions · SonarCloud.
Pastas: `/domain /application /ports /adapters/supabase /app /components` · `/supabase/migrations`. (§4.5)

## Como trabalhar
- **TDD no núcleo:** escreva o teste (Vitest) das RNs/cálculos **antes** da implementação. Muitos unit no `/domain`; poucos E2E (Playwright) nos fluxos críticos. (§8)
- **RLS sempre:** toda tabela com RLS habilitado; toda policy com teste (Supabase local). (§9)
- **Segredos nunca no git.** Só `.env.local` (git-ignored) / env vars. **Nunca** use a `service_role` key no cliente. (§9)
- **O servidor fala com o Supabase usando o token do usuário** (pra o RLS valer). (§4.4)
- **Consistência viva:** mudou algo que o PRD descreve? Atualize o PRD e todas as seções afetadas.

## Ordem de construção (roadmap — §11)
**M1** esqueleto fim-a-fim (auth + 1 item salvando com RLS) → **M2** árvore + dinheiro + painéis → **M3** colaboração (papéis/convite/auditoria) → **M4** acabamento.
Comece sempre pela **fatia vertical** (§7.1): entrar → ver a árvore → mexer num item → ver painel e trilha reagirem.

## Comandos
`npm run dev` · `npm test` · `npm run test:e2e` · `npm run test:rls` · `npm run typecheck` · `npm run build` · `npm run seed:conta`
> Dev usa o **Supabase da nuvem** (não local); login por conta fixa (`.env.local` + `seed:conta`). Deploy/versão automáticos no push da `main`. Detalhes de operação em `docs/pendencias.md`.
