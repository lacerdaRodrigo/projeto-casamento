// Teste de fumaça do RETORNO VISÍVEL: toda ação devolve toast, e os filtros
// ativos sobrevivem tanto ao sucesso quanto ao erro.
//
// SEGURANÇA: usuário e casório descartáveis; apaga só o que criou.
// Uso: BASE=http://localhost:3011 node scripts/smoke-toast.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

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
const get = async (url) => (await fetch(`${BASE}${url}`, { headers: { Cookie: cookie } })).text();

/** O HTML escapa & como &amp; — o navegador decodifica ao enviar; aqui também. */
const desescapar = (s) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');

function acharForm(html, ...marcadores) {
  const forms = html.match(/<form\b[\s\S]*?<\/form>/g) ?? [];
  const alvo = forms.find((f) => marcadores.every((m) => f.includes(m)));
  if (!alvo) return null;
  const aid = alvo.match(/name="(\$ACTION_ID_[a-f0-9]+)"/);
  const campos = {};
  for (const m of alvo.matchAll(/<input[^>]*name="([^"$][^"]*)"[^>]*value="([^"]*)"/g)) {
    campos[m[1]] = desescapar(m[2]);
  }
  return aid ? { actionId: aid[1], campos } : null;
}

/** Dispara a action e devolve o destino do redirect. */
async function disparar(actionId, campos) {
  const fd = new FormData();
  fd.append(actionId, "");
  for (const [k, v] of Object.entries(campos)) fd.append(k, v);
  const r = await fetch(`${BASE}/`, { method: "POST", headers: { Cookie: cookie }, body: fd, redirect: "manual" });
  const location = r.headers.get("location");
  if (!location) falhar(`action não redirecionou (HTTP ${r.status})`);
  return location;
}

const mensagemDe = (url, chave) => new URLSearchParams(url.split("?")[1] ?? "").get(chave);

let casorioId = null;
try {
  console.log("\n1. Cenário descartável");
  const { data: cad, error: eCad } = await sb.auth.signUp({
    email: `smoke-toast-${Date.now()}@teste.local`,
    password: "smoke-toast-123456",
  });
  if (eCad) falhar("signup", eCad.message);
  cookie = cookieDaSessao(cad.session);

  casorioId = crypto.randomUUID();
  const temaId = crypto.randomUUID();
  const subId = crypto.randomUUID();
  const itemId = crypto.randomUUID();
  await sb.from("casorio").insert({ id: casorioId, nome: "SMOKE toast", orcamento_total: 1_000_000 });
  await sb.from("tema").insert({ id: temaId, casorio_id: casorioId, nome: "Local" });
  await sb.from("subtema").insert({ id: subId, tema_id: temaId, casorio_id: casorioId, nome: "Espaços" });
  await sb.from("item").insert({
    id: itemId, subtema_id: subId, casorio_id: casorioId, titulo: "Salão",
    tem_custo: true, status: "a_decidir", custo_estimado: 500_000,
  });
  ok("casório com 1 item criado");

  console.log("\n2. Salvar item devolve toast de sucesso");
  let html = await get("/");
  const formItem = acharForm(html, 'name="statusAtual"');
  if (!formItem) falhar("form de editar item não encontrado");
  let destino = await disparar(formItem.actionId, {
    voltarPara: "/",
    itemId, statusAtual: "a_decidir", temCustoAtual: "true",
    titulo: "Salão de festas", temCusto: "on",
    custoEstimadoCentavos: "500000", custoRealCentavos: "0",
  });
  if (mensagemDe(destino, "ok") !== "Item salvo ✅") {
    falhar("mensagem de sucesso errada", destino);
  }
  ok(`redirect com ?ok= "${mensagemDe(destino, "ok")}"`);

  console.log("\n3. O toast realmente RENDERIZA na tela");
  html = await get(destino);
  if (!html.includes('class="toast toast-ok"')) falhar("elemento do toast não apareceu");
  if (!html.includes("Item salvo")) falhar("texto do toast não apareceu");
  if (!html.includes('role="status"')) falhar("faltou role=status (acessibilidade)");
  ok("toast verde na tela, com role=status");

  console.log("\n4. Cada ação tem sua própria mensagem");
  html = await get("/");
  const formStatus = acharForm(html, 'name="novoStatus"');
  destino = await disparar(formStatus.actionId, {
    voltarPara: "/", itemId, temCusto: "true", novoStatus: "decidido", custoRealCentavos: "0",
  });
  if (mensagemDe(destino, "ok") !== "Status atualizado") falhar("mensagem do status errada", destino);
  ok(`mudar status: "${mensagemDe(destino, "ok")}"`);

  html = await get("/");
  const formTema = acharForm(html, 'name="casorioId"', 'placeholder="Novo tema (ex.: Comida)"');
  destino = await disparar(formTema.actionId, { voltarPara: "/", casorioId, nome: "Comida" });
  if (mensagemDe(destino, "ok") !== "Tema criado") falhar("mensagem do tema errada", destino);
  ok(`criar tema: "${mensagemDe(destino, "ok")}"`);

  console.log("\n5. Erro de regra também vira toast (vermelho), sem crash");
  await sb.from("item").update({ status: "pago", custo_real: 450_000 }).eq("id", itemId);
  html = await get("/");
  const formItem2 = acharForm(html, 'name="statusAtual"');
  destino = await disparar(formItem2.actionId, {
    voltarPara: "/",
    itemId, statusAtual: "pago", temCustoAtual: "true",
    titulo: "Salão de festas", temCusto: "on",
    custoEstimadoCentavos: "500000", custoRealCentavos: "0",
  });
  const erro = mensagemDe(destino, "erro");
  if (!erro?.includes("RN06")) falhar("esperava erro RN06", destino);
  html = await get(destino);
  if (!html.includes('class="toast toast-erro"')) falhar("toast de erro não renderizou");
  ok(`erro vira toast vermelho: "${erro}"`);

  console.log("\n6. FILTRO ativo sobrevive ao salvar (era o furo antigo)");
  const comFiltro = "/?situacao=pendentes&essencial=1";
  html = await get(comFiltro);
  const formComFiltro = acharForm(html, 'name="voltarPara"', 'name="casorioId"', 'placeholder="Novo tema (ex.: Comida)"');
  if (!formComFiltro) falhar("form não carregou o campo voltarPara");
  if (formComFiltro.campos.voltarPara !== comFiltro) {
    falhar(`voltarPara errado: ${formComFiltro.campos.voltarPara}`);
  }
  destino = await disparar(formComFiltro.actionId, {
    voltarPara: comFiltro, casorioId, nome: "Bebidas",
  });
  const p = new URLSearchParams(destino.split("?")[1]);
  if (p.get("situacao") !== "pendentes") falhar("filtro de situação se perdeu", destino);
  if (p.get("essencial") !== "1") falhar("filtro de essenciais se perdeu", destino);
  if (p.get("ok") !== "Tema criado") falhar("mensagem se perdeu", destino);
  ok(`voltou pra ${destino} — filtros intactos`);

  console.log("\n7. Filtro sobrevive ao ERRO também");
  destino = await disparar(formItem2.actionId, {
    voltarPara: comFiltro,
    itemId, statusAtual: "pago", temCustoAtual: "true",
    titulo: "Salão", temCusto: "on", custoEstimadoCentavos: "0", custoRealCentavos: "0",
  });
  const pe = new URLSearchParams(destino.split("?")[1]);
  if (pe.get("situacao") !== "pendentes") falhar("filtro se perdeu no erro", destino);
  if (!pe.get("erro")) falhar("erro não veio", destino);
  ok("erro mantém os filtros e mostra o aviso");

  console.log("\n8. Fechar o toast leva pra URL limpa (com os filtros)");
  html = await get(comFiltro + "&ok=Item+salvo");
  const fechar = html.match(/class="toast-fechar"[^>]*href="([^"]+)"|href="([^"]+)"[^>]*class="toast-fechar"/);
  const alvoFechar = desescapar(fechar?.[1] ?? fechar?.[2] ?? "");
  if (!alvoFechar) falhar("botão de fechar não encontrado");
  if (alvoFechar.includes("ok=")) falhar(`fechar ainda leva a mensagem: ${alvoFechar}`);
  if (!alvoFechar.includes("situacao=pendentes")) falhar(`fechar perdeu os filtros: ${alvoFechar}`);
  ok(`× leva pra ${alvoFechar}`);


  console.log("\n9. Orçamento NÃO definido: nada de alarme falso");
  await sb.from("casorio").update({ orcamento_total: 0 }).eq("id", casorioId);
  html = await get("/");
  if (html.includes("passou do orçamento")) falhar("alarme falso com orçamento zerado");
  if (!html.includes("ainda não definiu")) falhar("faltou o convite pra definir o orçamento");
  ok("com orçamento 0: sem 🚨, e com convite pra definir");

  console.log("\n10. Definindo o orçamento, o alerta volta a fazer sentido");
  await sb.from("casorio").update({ orcamento_total: 100_000 }).eq("id", casorioId);
  html = await get("/");
  if (!html.includes("passou do orçamento")) falhar("com teto baixo deveria acusar estouro");
  if (html.includes("ainda não definiu")) falhar("convite continuou depois de definir");
  ok("com orçamento definido e estourado: 🚨 aparece de novo");

  console.log("\n11. Salvar volta pra âncora do item (não perde o lugar)");
  html = await get("/");
  const formAncora = acharForm(html, 'name="statusAtual"');
  const destinoAncora = await disparar(formAncora.actionId, {
    voltarPara: `/#item-${itemId}`,
    itemId, statusAtual: "pago", temCustoAtual: "true",
    titulo: "Salão de festas", temCusto: "on",
    custoEstimadoCentavos: "500000", custoRealCentavos: "450000",
  });
  if (!destinoAncora.endsWith(`#item-${itemId}`)) falhar("perdeu a âncora", destinoAncora);
  if (!mensagemDe(destinoAncora, "ok")) falhar("perdeu a mensagem", destinoAncora);
  html = await get(destinoAncora);
  if (!html.includes(`id="item-${itemId}"`)) falhar("a âncora não existe na página");
  ok(`volta pra ${destinoAncora}`);

  console.log(`\n✅ TOAST OK — ${passos} verificações passaram.`);
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
