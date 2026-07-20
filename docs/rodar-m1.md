# Rodar o M1 (local + Supabase Cloud, sem Docker)

App roda no seu PC; banco + Auth + RLS num projeto **Supabase Cloud grátis**.

## 1. Criar o projeto Supabase
1. Entre em https://supabase.com → **New project** (plano free).
2. Região: **South America (São Paulo)**. Guarde a senha do banco.

## 2. Aplicar o schema + RLS + triggers
No painel do projeto: **SQL Editor** → **New query** → cole todo o conteúdo de
[`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql) → **Run**.
> Cria tabelas, RLS em todas, triggers de auditoria, dono-automático e proteção do último dono.

## 3. Configurar Auth (magic link)
**Authentication → URL Configuration**:
- **Site URL:** `http://localhost:3000`
- **Redirect URLs:** adicione `http://localhost:3000/auth/callback`

Provider **Email** já vem ligado (magic link). *(Honestidade: o SMTP grátis do Supabase é limitado a poucos e-mails/hora — suficiente pra uso pessoal.)*

## 4. Variáveis de ambiente
```bash
cp .env.local.example .env.local
```
Preencha com **Project Settings → API**:
- `NEXT_PUBLIC_SUPABASE_URL` = Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon / public key

> A anon key é pública (protegida por RLS). **Nunca** use a `service_role` key aqui.

## 5. Rodar
```bash
npm run dev      # http://localhost:3000
```

## Fluxo pra testar a fatia vertical
1. Abre `http://localhost:3000` → redireciona pro **/login**.
2. Digita e-mail → recebe o link → clica → volta logado.
3. 1ª vez: tela de **onboarding** → cria o casório (você vira **Dono**).
4. Cria **Tema → Subtema → Item**.
5. Muda o status do item (marca **pago** informando o custo real) → o número no topo reage.
6. No painel do Supabase, tabela `auditoria`: a ação foi gravada sozinha (trigger).

## Comandos
```bash
npm run dev        # desenvolvimento
npm run build      # build de produção
npm test           # unit do domínio (Vitest)
npm run typecheck  # tsc
```

## O que ficou de fora do M1 (próximos marcos — PRD §11)
- **M2:** painel financeiro (C1), prazos (C3), progresso, template inicial, CRUD completo.
- **M3:** convite + papéis Editor/Leitor, tela de atividade (auditoria visível).
- **Testes de RLS** (Leitor não edita, isolamento entre casórios): precisam de Supabase local (Docker) **ou** um projeto Supabase de teste. Ficam pra quando encaixar.
