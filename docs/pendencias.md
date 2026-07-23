# Pendências & operação

Estado do V1 e o que sobrou. **V1 está no ar, seguro e testado** — o que resta é opcional. Ao mexer em algo, atualize também o **[PRD](./PRD.md)** (consistência viva).

## ✅ Concluído
- **Login:** e-mail + senha com **conta fixa do casal** (`npm run seed:conta`, credenciais no `.env.local`). **Cadastro público fechado** no Supabase. (D18)
- **Entrega:** repositório no GitHub, **CI** (`ci.yml`), **deploy automático na Vercel** a cada push na `main`, **versão automática** (`release.yml` + semantic-release, D15).
- **RLS:** policies auditadas + smoke `npm run test:rls` (anônimo não lê nada; autenticado lê o próprio).
- **E2E:** `npm run test:e2e` (Playwright) — fatia vertical: entrar → item → painel reage → apaga (escopado + auto-limpante).
- **Desempenho:** casório + árvore numa query só; índices conferidos.
- **Redesign** (D16) + **item direto no tema** (D17).
- **Limpeza do banco** (funções de diagnóstico e contas de teste) — feita manualmente pelo dono.

## 🟢 Opcional (decisões tomadas — só se pedirem)
- **Confirmação de e-mail / SMTP / magic link / Google:** **dispensados** (D18). Código do fluxo de confirmação fica dormente em `src/app/login/actions.ts` + `/auth/callback`; se um dia quiser ligar: Supabase → Auth → Providers → Email → *Confirm email* ON + SMTP próprio (Resend/Brevo) + URL Configuration.
- **M3 — Colaboração** (contas separadas, convite por e-mail, papéis Dono/Editor/Leitor, tela de atividade, responsável por item): **não necessário** com a conta compartilhada. A base (RLS por membro, tabela `membro`, trigger de auditoria) já existe.
- **RLS — isolamento entre 2 casórios** provado por teste automatizado: exige um 2º projeto Supabase (ou Docker). Risco baixo (existe 1 casório). Audit + anônimo-bloqueado cobrem o essencial.
- **Botão "+ Subtema"** escondido atrás da flag `MOSTRAR_ADD_SUBTEMA` (`src/app/ui-flags.ts`) — em teste sem ele. Voltar = `true`.

## 🟡 Melhorias futuras (nice-to-have)
- **Updates otimistas** — hoje cada salvamento revalida a página (in-place, mas re-renderiza). Otimista deixaria instantâneo.
- **Reordenar** temas/itens (arrastar).
- **Exportar** CSV/JSON (porta `Exporter` planejada no PRD).
- **Toast de exclusão** é otimista (dispara na confirmação, porque a exclusão remove o próprio botão). Em erro raro mostra verde e depois vermelho.
- **SonarCloud** (quality gate extra) — não configurado.
