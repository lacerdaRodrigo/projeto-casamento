// Teste de fumaça do MODELO PRONTO + EXCLUSÃO contra o Supabase real.
// Prova: semear a árvore -> contagens batem -> excluir item -> excluir subtema
//        (leva itens) -> excluir tema (leva tudo) -> auditoria registrou.
//
// SEGURANÇA: só apaga o casório que ESTE script criou (id guardado em variável).
// Nunca varrer tabela. Ver memória "nunca-deletar-sem-escopo".
//
// Uso: SMOKE_EMAIL=... SMOKE_SENHA=... node scripts/smoke-modelo.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
// Node 24 remove os tipos na hora, então o script lê a MESMA fonte da verdade
// que o app usa — sem duplicar a lista do modelo aqui.
import { TEMPLATE_CASORIO, contarTemplate } from "../src/domain/template-casorio.ts";

function loadEnvLocal() {
  const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const out = {};
  for (const line of txt.split("\n")) {
    const i = line.indexOf("=");
    if (i > 0 && !line.trimStart().startsWith("#")) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

let passos = 0;
const ok = (m) => {
  passos++;
  console.log(`  ✓ ${m}`);
};
const falhar = (m, e) => {
  console.error(`  ✗ ${m}${e ? `: ${e.message ?? e}` : ""}`);
  process.exitCode = 1;
  throw new Error(m);
};

const env = loadEnvLocal();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const email = process.env.SMOKE_EMAIL;
const senha = process.env.SMOKE_SENHA;
if (!email || !senha) falhar("faltou SMOKE_EMAIL / SMOKE_SENHA");

const esperado = contarTemplate(TEMPLATE_CASORIO);
let casorioId = null;

try {
  console.log("\n1. Autenticação");
  const { data: auth, error: eAuth } = await sb.auth.signInWithPassword({ email, password: senha });
  if (eAuth) falhar("login", eAuth);
  ok(`logado como ${auth.user.email}`);

  console.log("\n2. Casório isolado só pra este teste");
  casorioId = crypto.randomUUID();
  const { error: eCas } = await sb
    .from("casorio")
    .insert({ id: casorioId, nome: "SMOKE modelo (temporário)", orcamento_total: 0 });
  if (eCas) falhar("criar casório", eCas);
  ok(`casório ${casorioId.slice(0, 8)}… criado (só ele será apagado no fim)`);

  console.log("\n3. Semear o modelo (3 inserts em lote)");
  const linhasTema = [];
  const linhasSubtema = [];
  const linhasItem = [];
  TEMPLATE_CASORIO.forEach((tema, iT) => {
    const temaId = crypto.randomUUID();
    linhasTema.push({ id: temaId, casorio_id: casorioId, nome: tema.nome, ordem: iT });
    tema.subtemas.forEach((sub, iS) => {
      const subId = crypto.randomUUID();
      linhasSubtema.push({ id: subId, tema_id: temaId, casorio_id: casorioId, nome: sub.nome, ordem: iS });
      sub.itens.forEach((item, iI) => {
        linhasItem.push({
          id: crypto.randomUUID(),
          subtema_id: subId,
          casorio_id: casorioId,
          titulo: item.titulo,
          tem_custo: item.temCusto,
          status: item.temCusto ? "a_decidir" : "a_fazer",
          essencial: item.essencial ?? false,
          ordem: iI,
        });
      });
    });
  });
  for (const [tabela, linhas] of [["tema", linhasTema], ["subtema", linhasSubtema], ["item", linhasItem]]) {
    const { error } = await sb.from(tabela).insert(linhas);
    if (error) falhar(`insert em lote (${tabela})`, error);
  }
  ok(`semeado: ${esperado.temas} temas · ${esperado.subtemas} subtemas · ${esperado.itens} itens`);

  console.log("\n4. Contagens no banco batem com o modelo");
  const conta = async (tabela) => {
    const { count, error } = await sb
      .from(tabela).select("id", { count: "exact", head: true }).eq("casorio_id", casorioId);
    if (error) falhar(`contar ${tabela}`, error);
    return count;
  };
  const [nT, nS, nI] = [await conta("tema"), await conta("subtema"), await conta("item")];
  if (nT !== esperado.temas || nS !== esperado.subtemas || nI !== esperado.itens) {
    falhar(`contagem divergente: ${nT}/${nS}/${nI} vs ${esperado.temas}/${esperado.subtemas}/${esperado.itens}`);
  }
  ok(`banco confere: ${nT} temas · ${nS} subtemas · ${nI} itens`);

  console.log("\n5. Excluir um ITEM (só ele)");
  const { data: umItem } = await sb.from("item").select("id,titulo").eq("casorio_id", casorioId).limit(1).single();
  const { error: eDelItem } = await sb.from("item").delete().eq("id", umItem.id);
  if (eDelItem) falhar("excluir item", eDelItem);
  if ((await conta("item")) !== esperado.itens - 1) falhar("contagem de itens não caiu em 1");
  ok(`item "${umItem.titulo}" apagado; resto intacto`);

  console.log("\n6. Excluir um SUBTEMA (leva os itens junto — cascata RN03)");
  const { data: umSub } = await sb.from("subtema").select("id,nome").eq("casorio_id", casorioId).limit(1).single();
  const { count: itensDoSub } = await sb
    .from("item").select("id", { count: "exact", head: true }).eq("subtema_id", umSub.id);
  const itensAntes = await conta("item");
  const { error: eDelSub } = await sb.from("subtema").delete().eq("id", umSub.id);
  if (eDelSub) falhar("excluir subtema", eDelSub);
  const { count: sobrouDoSub } = await sb
    .from("item").select("id", { count: "exact", head: true }).eq("subtema_id", umSub.id);
  if (sobrouDoSub !== 0) falhar(`cascata falhou: ${sobrouDoSub} item(ns) órfão(s)`);
  if ((await conta("item")) !== itensAntes - itensDoSub) falhar("contagem de itens não bate após cascata");
  ok(`subtema "${umSub.nome}" apagado com ${itensDoSub} item(ns) junto`);

  console.log("\n7. Excluir um TEMA (leva subtemas e itens)");
  const { data: umTema } = await sb.from("tema").select("id,nome").eq("casorio_id", casorioId).limit(1).single();
  const { data: subsDoTema } = await sb.from("subtema").select("id").eq("tema_id", umTema.id);
  const idsSubs = (subsDoTema ?? []).map((s) => s.id);
  const { error: eDelTema } = await sb.from("tema").delete().eq("id", umTema.id);
  if (eDelTema) falhar("excluir tema", eDelTema);
  const { count: subsSobrando } = await sb
    .from("subtema").select("id", { count: "exact", head: true }).eq("tema_id", umTema.id);
  if (subsSobrando !== 0) falhar("subtemas órfãos após apagar tema");
  if (idsSubs.length > 0) {
    const { count: itensOrfaos } = await sb
      .from("item").select("id", { count: "exact", head: true }).in("subtema_id", idsSubs);
    if (itensOrfaos !== 0) falhar(`${itensOrfaos} item(ns) órfão(s) após apagar tema`);
  }
  ok(`tema "${umTema.nome}" apagado com ${idsSubs.length} subtema(s) e seus itens`);

  console.log("\n8. Auditoria registrou as exclusões sozinha (RN22)");
  const { data: trilha, error: eAud } = await sb
    .from("auditoria").select("acao,entidade,entidade_rotulo").eq("casorio_id", casorioId).eq("acao", "excluiu");
  if (eAud) falhar("ler auditoria", eAud);
  if (!trilha || trilha.length === 0) falhar("nenhum registro 'excluiu' na trilha");
  const entidades = [...new Set(trilha.map((t) => t.entidade))].sort().join(", ");
  ok(`${trilha.length} exclusões registradas (entidades: ${entidades})`);

  console.log(`\n✅ MODELO + EXCLUSÃO OK — ${passos} verificações passaram.`);
} catch {
  // erro já reportado por falhar()
} finally {
  if (casorioId) {
    // apaga SOMENTE o casório criado por este script
    const { error } = await sb.from("casorio").delete().eq("id", casorioId);
    console.log(error ? `\n⚠️ limpeza falhou: ${error.message}` : "\n🧹 casório de teste removido (cascata).");
  }
}
