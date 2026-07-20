// Teste de fumaça da EDIÇÃO na tela real (RF04/RF05/RF06/RF09).
// Edita casório (nome/data/orçamento), renomeia tema e subtema, e preenche o
// item inteiro — inclusive a conversão de status ao ganhar/perder custo (C2).
//
// SEGURANÇA: usuário e casório descartáveis; apaga só o que criou.
//
// Uso: BASE=http://localhost:3009 node scripts/smoke-editar.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
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
const normalizar = (s) => s.replace(/\\u00a0| |&nbsp;/g, " ").replace(/\s+/g, " ");

function acharForm(html, ...marcadores) {
  const forms = html.match(/<form\b[\s\S]*?<\/form>/g) ?? [];
  const alvo = forms.find((f) => marcadores.every((m) => f.includes(m)));
  if (!alvo) return null;
  const aid = alvo.match(/name="(\$ACTION_ID_[a-f0-9]+)"/);
  const campos = {};
  for (const m of alvo.matchAll(/<input[^>]*name="([^"$][^"]*)"[^>]*value="([^"]*)"/g)) campos[m[1]] = m[2];
  return aid ? { actionId: aid[1], campos } : null;
}

async function disparar(actionId, campos) {
  const fd = new FormData();
  fd.append(actionId, "");
  for (const [k, v] of Object.entries(campos)) fd.append(k, v);
  const r = await fetch(`${BASE}/`, { method: "POST", headers: { Cookie: cookie }, body: fd, redirect: "manual" });
  const location = r.headers.get("location");
  if (location?.includes("erro=")) {
    falhar("action devolveu erro", decodeURIComponent(location.split("erro=")[1]));
  }
  return { status: r.status, location };
}

let casorioId = null;
try {
  console.log("\n1. Cenário descartável");
  const { data: cad, error: eCad } = await sb.auth.signUp({
    email: `smoke-edit-${Date.now()}@teste.local`,
    password: "smoke-edit-123456",
  });
  if (eCad) falhar("signup", eCad.message);
  cookie = cookieDaSessao(cad.session);

  casorioId = crypto.randomUUID();
  const temaId = crypto.randomUUID();
  const subId = crypto.randomUUID();
  const itemId = crypto.randomUUID();
  await sb.from("casorio").insert({ id: casorioId, nome: "Nome Antigo", orcamento_total: 3_000_000 });
  await sb.from("tema").insert({ id: temaId, casorio_id: casorioId, nome: "Tema Antigo" });
  await sb.from("subtema").insert({ id: subId, tema_id: temaId, casorio_id: casorioId, nome: "Sub Antigo" });
  await sb.from("item").insert({
    id: itemId, subtema_id: subId, casorio_id: casorioId,
    titulo: "Montar o cronograma do dia", tem_custo: false, status: "a_fazer",
  });
  ok("casório, tema, subtema e item sem custo criados");

  const lerCasorio = async () => (await sb.from("casorio").select().eq("id", casorioId).single()).data;
  const lerItem = async () => (await sb.from("item").select().eq("id", itemId).single()).data;

  console.log("\n2. Editar o casório: nome, data e orçamento 30.000 → 25.000 (RF09)");
  let html = await getHome();
  const formCasorio = acharForm(html, 'name="casorioId"', 'name="orcamentoCentavos"');
  if (!formCasorio) falhar("form de editar casório não encontrado");
  await disparar(formCasorio.actionId, {
    casorioId,
    nome: "Rodrigo & Jennifer",
    dataCasamento: "2027-11-20",
    orcamentoCentavos: "2500000",
  });
  const casorio = await lerCasorio();
  if (casorio.nome !== "Rodrigo & Jennifer") falhar(`nome não mudou: ${casorio.nome}`);
  if (casorio.data_casamento !== "2027-11-20") falhar(`data não mudou: ${casorio.data_casamento}`);
  if (casorio.orcamento_total !== 2_500_000) falhar(`orçamento não mudou: ${casorio.orcamento_total}`);
  ok(`nome, data (20/11/2027) e orçamento (${formatarBRL(2_500_000)}) atualizados`);

  html = normalizar(await getHome());
  if (!html.includes(normalizar(formatarBRL(2_500_000)))) falhar("painel não mostra o orçamento novo");
  ok("o painel financeiro já reflete o orçamento novo");

  console.log("\n3. Renomear tema e subtema (RF04/RF05)");
  html = await getHome();
  const formTema = acharForm(html, 'name="temaId"', 'name="nome"');
  await disparar(formTema.actionId, { temaId, nome: "Planejamento Geral" });
  const { data: tema } = await sb.from("tema").select().eq("id", temaId).single();
  if (tema.nome !== "Planejamento Geral") falhar(`tema não renomeou: ${tema.nome}`);
  ok(`tema renomeado para "${tema.nome}"`);

  html = await getHome();
  const formSub = acharForm(html, 'name="subtemaId"', 'name="nome"');
  await disparar(formSub.actionId, { subtemaId: subId, nome: "Definições Iniciais" });
  const { data: sub } = await sb.from("subtema").select().eq("id", subId).single();
  if (sub.nome !== "Definições Iniciais") falhar(`subtema não renomeou: ${sub.nome}`);
  ok(`subtema renomeado para "${sub.nome}"`);

  console.log("\n4. Editar o item SEM custo: título, data, essencial, observação");
  html = await getHome();
  const formItem = acharForm(html, 'name="statusAtual"');
  if (!formItem) falhar("form de editar item não encontrado");
  await disparar(formItem.actionId, {
    itemId, statusAtual: "a_fazer", temCustoAtual: "false",
    titulo: "Cronograma do dia",
    dataAlvo: "2027-10-01",
    essencial: "on",
    observacao: "alinhar com a cerimonialista",
    custoEstimadoCentavos: "0",
    custoRealCentavos: "0",
  });
  let item = await lerItem();
  if (item.titulo !== "Cronograma do dia") falhar(`título não mudou: ${item.titulo}`);
  if (item.data_alvo !== "2027-10-01") falhar(`data-alvo não gravou: ${item.data_alvo}`);
  if (!item.essencial) falhar("essencial não marcou");
  if (item.observacao !== "alinhar com a cerimonialista") falhar("observação não gravou");
  if (item.status !== "a_fazer") falhar(`status mudou sem precisar: ${item.status}`);
  ok("título, data-alvo, essencial e observação gravados; status intacto");

  console.log("\n5. Dar CUSTO ao item — status deve converter pra 'a decidir' (C2)");
  html = await getHome();
  const formItem2 = acharForm(html, 'name="statusAtual"');
  await disparar(formItem2.actionId, {
    itemId, statusAtual: "a_fazer", temCustoAtual: "false",
    titulo: "Cronograma do dia",
    temCusto: "on",
    custoEstimadoCentavos: "150000",
    custoRealCentavos: "0",
    dataAlvo: "2027-10-01",
    essencial: "on",
    fornecedorNome: "Cerimonial Silva",
    fornecedorContato: "(11) 98888-7777",
    fornecedorLink: "https://cerimonialsilva.com.br",
  });
  item = await lerItem();
  if (!item.tem_custo) falhar("tem_custo não virou true");
  if (item.status !== "a_decidir") falhar(`status deveria virar 'a_decidir', veio '${item.status}'`);
  if (item.custo_estimado !== 150000) falhar(`estimado errado: ${item.custo_estimado}`);
  if (item.fornecedor_nome !== "Cerimonial Silva") falhar("fornecedor não gravou");
  ok(`virou item com custo (${formatarBRL(150000)}), status convertido pra 'a decidir'`);
  ok("fornecedor (nome, telefone, link) gravado");

  console.log("\n6. O painel financeiro passou a contar esse item");
  html = normalizar(await getHome());
  if (!html.includes(normalizar(formatarBRL(150000)))) falhar("painel não somou o novo custo");
  ok(`planejado agora inclui ${formatarBRL(150000)}`);

  console.log("\n7. Marcar como PAGO e tirar o custo — deve virar 'feito' (C2)");
  await sb.from("item").update({ status: "pago", custo_real: 140000 }).eq("id", itemId);
  html = await getHome();
  const formItem3 = acharForm(html, 'name="statusAtual"');
  await disparar(formItem3.actionId, {
    itemId, statusAtual: "pago", temCustoAtual: "true",
    titulo: "Cronograma do dia",
    custoEstimadoCentavos: "150000",
    custoRealCentavos: "140000",
    dataAlvo: "2027-10-01",
  });
  item = await lerItem();
  if (item.tem_custo) falhar("tem_custo deveria ser false");
  if (item.status !== "feito") falhar(`status deveria virar 'feito', veio '${item.status}'`);
  if (item.custo_real !== 140000) falhar("custo real deveria ser preservado (só oculto)");
  ok("item pago virou 'feito' ao perder o custo; valores preservados");

  console.log("\n8. Regra ainda protege: zerar o valor de um item PAGO é recusado (RN06)");
  await sb.from("item").update({ tem_custo: true, status: "pago", custo_real: 140000 }).eq("id", itemId);
  html = await getHome();
  const formItem4 = acharForm(html, 'name="statusAtual"');
  const fd = new FormData();
  fd.append(formItem4.actionId, "");
  for (const [k, v] of Object.entries({
    itemId, statusAtual: "pago", temCustoAtual: "true",
    titulo: "Cronograma do dia", temCusto: "on",
    custoEstimadoCentavos: "150000", custoRealCentavos: "0",
  })) fd.append(k, v);
  const r = await fetch(`${BASE}/`, { method: "POST", headers: { Cookie: cookie }, body: fd, redirect: "manual" });
  const loc = r.headers.get("location") ?? "";
  if (!loc.includes("erro=")) falhar("deveria ter recusado (RN06)");
  if (!decodeURIComponent(loc).includes("RN06")) falhar("mensagem não cita RN06", decodeURIComponent(loc));
  item = await lerItem();
  if (item.custo_real !== 140000) falhar("gravou mesmo recusando!");
  ok(`recusado com aviso: ${decodeURIComponent(loc.split("erro=")[1])}`);
  ok("nada foi gravado — o valor original continua lá");

  console.log(`\n✅ EDIÇÃO OK — ${passos} verificações passaram.`);
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
