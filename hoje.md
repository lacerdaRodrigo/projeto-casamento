# hoje.md — prioridades

Status atualizado. O app está **no ar** (Vercel), com login fixo do casal, seguro, testado. Fatia vertical coberta por E2E.

> Fonte: [docs/pendencias.md](./docs/pendencias.md) e [docs/PRD.md](./docs/PRD.md).

---

## ✅ Feito
- **Login** e-mail+senha com conta fixa do casal (`casamento@casamento.com`) — `npm run seed:conta`.
- **Cadastro fechado** no Supabase (só a conta do casal entra).
- **Deploy** na Vercel + **CI** (typecheck+testes+build a cada push). URL: https://projeto-casamento-gamma.vercel.app
- **RLS** — auditoria das policies + teste automatizado (`npm run test:rls`): anônimo não lê nada; autenticado lê o próprio.
- **Desempenho** — casório+árvore numa query só (corta um round-trip por render); índices conferidos.
- **E2E** (Playwright, `npm run test:e2e`) — fatia vertical: entrar → item → painel reage → limpa (escopado + auto-limpante).
- **Limpeza** do banco (feita manualmente pelo dono).
- Redesign (tema escuro + toggle, abas/visão geral, montar, feedback in-place + toasts, contraste/subtemas).

## 🟢 Sobrou (baixa prioridade / decisões tomadas)
- **Confirmação de e-mail / SMTP / Google / magic link** — **dispensados** por decisão: conta fixa compartilhada + cadastro fechado já resolve pra um casal.
- **M3 colaboração** (contas separadas + convite + papéis) — **não necessário** enquanto usam a conta compartilhada. Fica a porta aberta (RLS por membro já existe) se quiserem depois.
- **RLS — isolamento entre 2 casórios** — só provável com 2º projeto Supabase ou Docker; risco real baixo (existe 1 casório). Audit + anônimo-bloqueado cobrem o essencial.
- **Versionamento automático** (semantic-release) — nice-to-have; hoje a versão do rodapé é manual.

---

**Resumo:** o V1 está usável, no ar, seguro e testado. O que sobra é opcional. Próximos passos só se/quando o casal pedir (ex.: contas separadas = M3).
