// Teste de fumaça do PAINEL FINANCEIRO (C1) na tela real.
// Monta um cenário com números conhecidos, confere o que o painel mostra e
// verifica que o alerta de estouro (RN15/D05) aparece na hora certa.
//
// SEGURANÇA: usuário e casório descartáveis; apaga só o que criou.
//
// Uso: BASE=http://localhost:3007 node scripts/smoke-financeiro.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { calcularPainelFinanceiro } from "../src/domain/financeiro.ts";
import { formatarBRL } from "../src/domain/money.ts";

const BASE = process.env.BASE ?? "http://localhost:3000";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

let passos = 0;
const ok = (m) => {
  passos++;
  console.log(`  ✓ ${m}`);
};
const falhar = (m, extra) => {
  console.error(`  ✗ ${m}${extra ? `: ${extra}` : ""}`);
  process.exitCode = 1;
  throw new Error(m);
};

const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function cookieDaSessao(session) {
  const valor = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  const nome = `sb-${ref}-auth-token`;
  const MAX = 3180;
  if (valor.length <= MAX) return `${nome}=${valor}`;
  const partes = [];
  for (let i = 0, n = 0; i < valor.length; i += MAX, n++) partes.push(`${nome}.${n}=${valor.slice(i, i + MAX)}`);
  return partes.join("; ");
}

let cookie = "";
const getHome = async () => (await fetch(`${BASE}/`, { headers: { Cookie: cookie } })).text();
/** O HTML do RSC escapa acentos e usa NBSP no R$ — normaliza pra comparar. */
const normalizar = (s) => s.replace(/\\u00a0| |&nbsp;/g, " ").replace(/\s+/g, " ");

const ORCAMENTO = 1_000_000; // R$ 10.000,00
let casorioId = null;

try {
  console.log("\n1. Usuário e casório descartáveis");
  const email = `smoke-fin-${Date.now()}@teste.local`;
  const { data: cad, error: eCad } = await sb.auth.signUp({ email, password: "smoke-fin-123456" });
  if (eCad) falhar("signup", eCad.message);
  cookie = cookieDaSessao(cad.session);
  casorioId = crypto.randomUUID();
  const { error: eCas } = await sb
    .from("casorio")
    .insert({ id: casorioId, nome: "SMOKE financeiro", orcamento_total: ORCAMENTO });
  if (eCas) falhar("criar casório", eCas.message);
  ok(`casório com orçamento ${formatarBRL(ORCAMENTO)}`);

  console.log("\n2. Cenário com números escolhidos a dedo");
  const temaId = crypto.randomUUID();
  const subId = crypto.randomUUID();
  await sb.from("tema").insert({ id: temaId, casorio_id: casorioId, nome: "Gastos" });
  await sb.from("subtema").insert({ id: subId, tema_id: temaId, casorio_id: casorioId, nome: "Tudo" });

  const cenario = [
    { titulo: "Só estimado", tem_custo: true, status: "a_decidir", custo_estimado: 100_000, custo_real: 0 },
    { titulo: "Decidido", tem_custo: true, status: "decidido", custo_estimado: 200_000, custo_real: 0 },
    { titulo: "Contratado", tem_custo: true, status: "contratado", custo_estimado: 300_000, custo_real: 280_000 },
    { titulo: "Pago", tem_custo: true, status: "pago", custo_estimado: 500_000, custo_real: 450_000 },
    { titulo: "Descartado (fora)", tem_custo: true, status: "descartado", custo_estimado: 900_000, custo_real: 0 },
    { titulo: "Sem custo", tem_custo: false, status: "a_fazer", custo_estimado: 0, custo_real: 0 },
    { titulo: "Com custo SEM preço", tem_custo: true, status: "a_decidir", custo_estimado: 0, custo_real: 0 },
  ];
  const { error: eItens } = await sb.from("item").insert(
    cenario.map((c, i) => ({ id: crypto.randomUUID(), subtema_id: subId, casorio_id: casorioId, ordem: i, ...c })),
  );
  if (eItens) falhar("inserir itens", eItens.message);
  ok(`${cenario.length} itens gravados (inclui descartado, sem custo e sem preço)`);

  console.log("\n3. O que o domínio (C1) calcula");
  const esperado = calcularPainelFinanceiro(
    cenario.map((c) => ({
      temCusto: c.tem_custo,
      status: c.status,
      custoEstimado: c.custo_estimado,
      custoReal: c.custo_real,
    })),
    ORCAMENTO,
  );
  console.log(
    `     planejado=${formatarBRL(esperado.estimadoTotal)} comprometido=${formatarBRL(esperado.comprometido)} ` +
      `pago=${formatarBRL(esperado.pago)} saldo=${formatarBRL(esperado.saldo)} estourou=${esperado.estourou} semPreco=${esperado.semPreco}`,
  );
  if (esperado.estimadoTotal !== 1_030_000) falhar(`planejado deveria ser 1.030.000, veio ${esperado.estimadoTotal}`);
  if (esperado.comprometido !== 730_000) falhar(`comprometido deveria ser 730.000, veio ${esperado.comprometido}`);
  if (esperado.pago !== 450_000) falhar(`pago deveria ser 450.000, veio ${esperado.pago}`);
  if (esperado.semPreco !== 1) falhar(`semPreco deveria ser 1, veio ${esperado.semPreco}`);
  ok("descartado ficou de fora; comprometido e pago com os status certos");

  console.log("\n4. A TELA mostra exatamente esses números");
  const html = normalizar(await getHome());
  for (const [rotulo, valor] of [
    ["Orçamento", ORCAMENTO],
    ["Planejado", esperado.estimadoTotal],
    ["Comprometido", esperado.comprometido],
    ["Pago", esperado.pago],
  ]) {
    const texto = normalizar(formatarBRL(valor));
    if (!html.includes(texto)) falhar(`a tela não mostra ${rotulo} = ${texto}`);
    ok(`${rotulo}: ${texto}`);
  }

  console.log("\n5. Estouro do orçamento (RN15/D05 — avisa pelo PLANEJADO)");
  if (!esperado.estourou) falhar("cenário deveria estourar (1.030.000 > 1.000.000)");
  if (!html.includes("passou do orçamento")) falhar("alerta de estouro não apareceu na tela");
  if (!html.includes(normalizar(formatarBRL(-esperado.saldo)))) falhar("a tela não mostra o quanto estourou");
  ok(`alerta na tela: estourou em ${formatarBRL(-esperado.saldo)}`);

  console.log("\n6. Aviso de item com custo sem preço");
  if (!html.includes("sem valor")) falhar("aviso de item sem preço não apareceu");
  ok("a tela avisa que 1 item tem custo mas está sem valor");

  console.log("\n7. Aumentar o orçamento tira o alerta");
  await sb.from("casorio").update({ orcamento_total: 2_000_000 }).eq("id", casorioId);
  const html2 = normalizar(await getHome());
  if (html2.includes("passou do orçamento")) falhar("alerta continuou depois de aumentar o orçamento");
  if (!html2.includes(normalizar(formatarBRL(2_000_000 - esperado.estimadoTotal)))) {
    falhar("saldo novo não apareceu");
  }
  ok(`sem alerta; saldo agora ${formatarBRL(2_000_000 - esperado.estimadoTotal)}`);

  console.log(`\n✅ PAINEL FINANCEIRO OK — ${passos} verificações passaram.`);
} catch (e) {
  // erro inesperado (rede, dev server fora do ar) não pode passar calado
  if (process.exitCode !== 1) {
    console.error(`\n  ✗ ERRO INESPERADO: ${e?.message ?? e}`);
    process.exitCode = 1;
  }
} finally {
  if (casorioId) {
    const { error } = await sb.from("casorio").delete().eq("id", casorioId);
    console.log(error ? `\n⚠️ limpeza falhou: ${error.message}` : "\n🧹 casório de teste removido (só o dele).");
  }
}
