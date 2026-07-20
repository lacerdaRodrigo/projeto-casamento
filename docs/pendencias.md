# Pendências — fazer no final (antes de produção)

Dívidas assumidas de propósito pra destravar o desenvolvimento. Cada uma tem o **porquê** e o **como voltar**.

## 🔐 Auth

### 1. Reativar confirmação de e-mail
- **Agora:** desligada (ou a confirmar na mão) pra conseguir logar em dev — o free-tier limita a poucos e-mails/hora e travou o cadastro.
- **No final:** religar **Authentication → Providers → Email → Confirm email**. Sem isso qualquer um cria conta com e-mail alheio.
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

## 🧹 Limpeza

### 9. Apagar as funções de diagnóstico
Criadas pra investigar o RLS de fora. Não expõem dado sensível, mas não devem ficar:
```sql
drop function if exists public.debug_whoami();
drop function if exists public.debug_policies();
```

### 10. Apagar os casórios de teste
Sobraram do smoke test (`t1`, `Casório de Teste (smoke)`). Só dá pra apagar **depois** da migration `0003`.

## 🧭 Consistência
- Ao fechar qualquer item acima, atualizar o **[PRD](./PRD.md)** e as seções afetadas (regra de consistência viva).
