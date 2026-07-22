# Pendências — fazer no final (antes de produção)

Dívidas assumidas de propósito pra destravar o desenvolvimento. Cada uma tem o **porquê** e o **como voltar**.

## 🔐 Auth

### 1. Reativar confirmação de e-mail  — 🚧 código pronto (branch `feat/confirmar-email`)
- **Código (feito):** `signUp` manda `emailRedirectTo=/auth/callback`; login trata "e-mail não confirmado"; callback trata link expirado; tela de login mostra aviso + **reenviar confirmação**.
- **Falta (painel Supabase — parte manual):**
  1. **Authentication → Providers → Email → Confirm email = ON**.
  2. **Authentication → URL Configuration:** Site URL + Redirect URLs incluindo `http://localhost:3000/auth/callback` (e a URL de produção quando houver).
  3. *(Recomendado)* **SMTP próprio** (item 3) — o SMTP padrão do Supabase limita ~3-4 e-mails/h.
- **Risco se esquecer:** 🔴 alto — cadastro sem verificação de identidade.

### 2. Voltar o login por magic link (RF01)
- **Agora:** removido da tela; só e-mail+senha. A server action `enviarMagicLink` continua em `src/app/login/actions.ts`, só não está ligada na UI.
- **No final:** religar o formulário na tela de login e testar o fluxo `/auth/callback`.
- **Depende de:** item 3 (SMTP), senão volta o rate limit.

### 3. SMTP próprio (sair do limite do free-tier)
- **Problema:** SMTP padrão do Supabase = ~2–4 e-mails/hora → magic link e confirmação quebram.
- **No final:** configurar SMTP próprio (ex.: Resend/Brevo, free-tier) em **Authentication → SMTP Settings**.

### 4. Login com Google (PRD §2.4)
- Previsto pro V1, ainda não implementado. Precisa criar credenciais OAuth no Google Cloud e habilitar o provider.

## 🧪 Testes

### 5. Testes de RLS (§8.2 — segurança)
- **Faltam:** provar que Leitor não edita, que membro de outro casório não vê nada, que auditoria não é editável (RN21/RN22).
- **Bloqueio:** pedem Supabase local (Docker, descartado) **ou** um projeto Supabase separado de teste.
- **Risco se esquecer:** 🔴 alto — o controle de acesso é a garantia central do projeto.

### 6. E2E (Playwright) da fatia vertical (§8.1)
- Fluxo: entrar → criar casório → mexer no item → painel/trilha reagirem.

## 🚚 Entrega (ignorado por decisão — só local por ora)

### 7. Git + CI + deploy
- Sem repositório git, sem GitHub Actions, sem Vercel, sem SonarCloud.
- **No final:** `git init`, quality gate no CI (§9.2), deploy na Vercel.

### 8. Versionamento automático (D15 / §9.4)
- SemVer com bump automático via Conventional Commits + `semantic-release`.
- **Depende de:** item 7 (git + CI). Hoje a versão do rodapé lê o `package.json` na mão.

## 🧩 Funcionalidades ainda não construídas (V1)

### 11. Responsável por item (RF06 / RF13 / D14)
- **Falta:** campo `responsavel` no item + filtro "meus itens".
- **Depende de:** M3 (ter membros pra atribuir). Enquanto não há convite, não há a quem atribuir.

### 12. Tela de atividade / auditoria visível (RF14 / M3)
- **Agora:** a trilha **é gravada** por trigger no Postgres (imutável). **Falta a tela** que lista quem fez o quê e quando.

### 13. Colaboração — convite + papéis (RF02 / RF03 / M3)
- Dono/Editor/Leitor, convite por e-mail. Ainda não implementado (só o Dono, dono de tudo).

## 🧹 Limpeza

### 9. Apagar as funções de diagnóstico
Criadas pra investigar o RLS de fora. Não expõem dado sensível, mas não devem ficar:
```sql
drop function if exists public.debug_whoami();
drop function if exists public.debug_policies();
```

### 10. Apagar os casórios de teste
Sobraram do smoke test (`t1`, `Casório de Teste (smoke)`). Só dá pra apagar **depois** da migration `0003`.

## 🎨 UX do redesign (dívidas pequenas — D16)

### 14. Toast de exclusão é otimista
- **Agora:** o "Excluído" (verde) dispara na **confirmação**, porque a exclusão remove o próprio botão da tela (não dá pra esperar o fim ali). Se a exclusão falhar (raro), aparece o verde e, por cima, o vermelho do `?erro=`.
- **Melhor no final:** usar `useActionState` pra confirmar sucesso/erro antes de mostrar o toast.

### 15. Cada salvamento ainda re-renderiza a página inteira
- **Agora:** salvar revalida no lugar (sem trocar de tela, com "Salvando…"), mas o servidor **re-renderiza tudo** rebuscando do Supabase. Em dev remoto isso custa segundos.
- **Melhor no final:** **Supabase local** em dev (`supabase start`) mata a latência; updates otimistas evitam o refetch. Liga-se ao item 5 (RLS local) e ao RNF04 (~1s).

## 🧭 Consistência
- Ao fechar qualquer item acima, atualizar o **[PRD](./PRD.md)** e as seções afetadas (regra de consistência viva).
- **Feito nesta rodada (D16):** redesign do painel (tema escuro + toggle claro), abas + visão geral, tela `/montar`, comparação estimado×real, feedback in-place + toasts. PRD atualizado (RF08/RF13, roadmap, D16).
