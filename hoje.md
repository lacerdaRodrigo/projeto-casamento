# hoje.md — prioridades

Ordenado da **mais importante** (topo) à **mais leve** (fim). O app já roda (M1 + M2 + redesign), mas **só local** — o maior valor agora é ele ficar usável no ar, com segurança, pro casal planejar a dois.

> Fonte: [docs/pendencias.md](./docs/pendencias.md) e [docs/PRD.md](./docs/PRD.md). Ao fechar um item, atualizar os dois (consistência viva).

---

## 1. 🔒 Segurança mínima pra poder expor  🔴
Sem isto, não dá pra colocar no ar com segurança.
- **Reativar confirmação de e-mail** (Supabase → Auth → Providers → Email → Confirm email). Hoje desligada → qualquer um cria conta com e-mail alheio.
- **Testes de RLS** (§8.2): provar que Leitor não edita, que outro casório não vê nada, que auditoria é imutável. É a garantia central do projeto e está sem prova.
- *Depende de:* um Supabase de teste (ou local) pra rodar as policies.

## 2. 🚀 Colocar no ar (a meta: largar a planilha)  🔴
Enquanto for local, o casal não usa.
- `git init` + repositório (GitHub).
- Deploy na **Vercel** (env vars do Supabase; nunca a `service_role` no cliente).
- **CI** (GitHub Actions): typecheck + testes + lint como quality gate.

## 3. 👥 Colaboração — M3 (planejar a dois)  🟠
É a razão do app: os dois mexendo juntos.
- Papéis **Dono / Editor / Leitor** (RLS já é a base).
- **Convite por e-mail** (RF02).
- *Sem isto, hoje só o Dono existe.*

## 4. 🧩 Completar o V1  🟠
- **Responsável por item** + filtro "meus itens" (RF06/RF13) — depende do item 3 (ter membros).
- **Tela de atividade** (RF14): a auditoria já é gravada por trigger, falta a UI que mostra quem fez o quê.

## 5. ⚡ Desempenho (RNF04 ~1s)  🟡
- Cada salvamento re-renderiza a página inteira rebuscando do Supabase remoto (lento).
- **Supabase local em dev** (`supabase start`) mata a latência; **updates otimistas** evitam o refetch.

## 6. 🧪 E2E (Playwright)  🟡
- Fluxo crítico: entrar → criar casório → mexer no item → painel/trilha reagirem. Cobrir também abas e a tela Montar.

## 7. 🔐 Auth extra  🟢
- **SMTP próprio** (Resend/Brevo) pra sair do limite do free-tier → destrava o resto.
- Religar **magic link** (RF01) na UI (código já existe em `login/actions.ts`).
- **Login com Google** (previsto no V1).

## 8. 🧹 Limpeza  🟢
- Apagar funções de diagnóstico SQL (`debug_whoami`, `debug_policies`).
- Apagar casórios de teste (`t1`, smoke) — só depois da migration `0003`.
- Toast de exclusão é otimista (dispara na confirmação) → trocar por `useActionState` pra confirmar antes.

## 9. 🏷️ Versionamento automático  🟢
- SemVer via Conventional Commits + `semantic-release` (D15). *Depende do item 2 (CI).* Hoje a versão do rodapé é lida na mão.

---

### Sugestão de ataque
Fazer **1 + 2 juntos** (ir pro ar já com segurança) → depois **3 + 4** (colaboração fecha o V1) → o resto é robustez e polimento.
