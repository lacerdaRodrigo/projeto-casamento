// Teste de fumaça do C3 — MOTOR DE PRAZOS na tela real.
// Monta itens com datas calculadas a partir de HOJE e confere painel, etiquetas
// e o filtro "só atrasados" / "vencendo".
//
// SEGURANÇA: usuário e casório descartáveis; apaga só o que criou.
// Uso: BASE=http://localhost:3013 node scripts/smoke-prazos.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// Espelha DIAS_A_VENCER do domínio (RN17). A classificação em si já tem 22
// testes unitários; aqui o alvo é a TELA.
const DIAS_A_VENCER = 7;

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
/** O React SSR insere <!-- --> entre texto estático e interpolação; tira isso
    pra poder procurar frases inteiras ("vence em 7 dias"). */
const limpar = (html) => html.replace(/<!--[^>]*-->/g, "");
const get = async (url) =>
  limpar(await (await fetch(`${BASE}${url}`, { headers: { Cookie: cookie } })).text());
const exibindo = (html) => {
  const m = html.match(/exibindo\s*(?:<!--[^>]*-->)?\s*<b>(\d+)<\/b>/);
  return m ? Number(m[1]) : null;
};

/** Mesmo "hoje" que o app usa: data em America/Sao_Paulo. */
const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
/** Data deslocada N dias a partir de hoje, em yyyy-mm-dd. */
function emDias(n) {
  const base = Date.parse(`${hoje}T00:00:00Z`) + n * 86_400_000;
  return new Date(base).toISOString().slice(0, 10);
}

let casorioId = null;
try {
  console.log(`\n1. Cenário descartável (hoje = ${hoje})`);
  const { data: cad, error: eCad } = await sb.auth.signUp({
    email: `smoke-prazo-${Date.now()}@teste.local`,
    password: "smoke-prazo-123456",
  });
  if (eCad) falhar("signup", eCad.message);
  cookie = cookieDaSessao(cad.session);

  casorioId = crypto.randomUUID();
  const temaId = crypto.randomUUID();
  const subId = crypto.randomUUID();
  await sb.from("casorio").insert({ id: casorioId, nome: "SMOKE prazos", orcamento_total: 1_000_000 });
  await sb.from("tema").insert({ id: temaId, casorio_id: casorioId, nome: "Prazos" });
  await sb.from("subtema").insert({ id: subId, tema_id: temaId, casorio_id: casorioId, nome: "Tudo" });

  const cenario = [
    { titulo: "Venceu há 10 dias", data_alvo: emDias(-10), status: "a_fazer", esperado: "atrasado" },
    { titulo: "Venceu ontem", data_alvo: emDias(-1), status: "a_fazer", esperado: "atrasado" },
    { titulo: "Vence hoje", data_alvo: emDias(0), status: "a_fazer", esperado: "a_vencer" },
    { titulo: "Vence amanha", data_alvo: emDias(1), status: "a_fazer", esperado: "a_vencer" },
    { titulo: "Vence no 7o dia", data_alvo: emDias(DIAS_A_VENCER), status: "a_fazer", esperado: "a_vencer" },
    { titulo: "Vence no 8o dia", data_alvo: emDias(DIAS_A_VENCER + 1), status: "a_fazer", esperado: "ok" },
    { titulo: "Vencido mas feito", data_alvo: emDias(-5), status: "feito", esperado: "resolvido" },
    { titulo: "Vencido e descartado", data_alvo: emDias(-5), status: "descartado", esperado: "descartado" },
    { titulo: "Sem data nenhuma", data_alvo: null, status: "a_fazer", esperado: "sem_data" },
  ];
  const { error: eItens } = await sb.from("item").insert(
    cenario.map((c, i) => ({
      id: crypto.randomUUID(), subtema_id: subId, casorio_id: casorioId,
      titulo: c.titulo, data_alvo: c.data_alvo, status: c.status, tem_custo: false, ordem: i,
    })),
  );
  if (eItens) falhar("inserir itens", eItens.message);
  ok(`${cenario.length} itens com datas de teste`);

  console.log("\n3. Painel de prazos na tela");
  let html = await get("/");
  if (!html.includes("itens atrasados")) falhar("painel não mostra atrasados");
  if (!/2<\/b>\s*itens atrasados/.test(html)) falhar("contagem de atrasados errada (esperava 2)");
  if (!html.includes(`vencem em até ${DIAS_A_VENCER} dias`)) falhar("painel não mostra os a vencer");
  ok("painel: 2 atrasados e 3 vencendo em até 7 dias");

  console.log("\n4. Etiquetas em linguagem de gente");
  for (const esperado of ["atrasado 10 dias", "atrasado 1 dia", "vence hoje", "vence amanhã", "vence em 7 dias"]) {
    if (!html.includes(esperado)) falhar(`faltou a etiqueta "${esperado}"`);
    ok(`etiqueta: "${esperado}"`);
  }

  console.log("\n5. Item resolvido e descartado NÃO ganham etiqueta de atraso");
  const trecho = html.slice(0, html.length);
  if (/Vencido mas feito[\s\S]{0,400}?atrasado \d/.test(trecho)) {
    falhar("item resolvido apareceu como atrasado");
  }
  if (/Vencido e descartado[\s\S]{0,400}?atrasado \d/.test(trecho)) {
    falhar("item descartado apareceu como atrasado");
  }
  ok("resolvido e descartado ficam de fora (RN16/RN23)");

  console.log("\n6. Filtro 'só atrasados'");
  const htmlAtrasados = await get("/?prazo=atrasados");
  if (exibindo(htmlAtrasados) !== 2) falhar(`esperava 2 atrasados, veio ${exibindo(htmlAtrasados)}`);
  if (!htmlAtrasados.includes("Venceu ontem")) falhar("faltou o item atrasado na lista");
  if (htmlAtrasados.includes("Vence no 8o dia")) falhar("item 'ok' vazou no filtro de atrasados");
  ok("filtro de atrasados: 2 itens, e só eles");

  console.log("\n7. Filtro 'vencendo em 7 dias'");
  const htmlVencendo = await get("/?prazo=a_vencer");
  if (exibindo(htmlVencendo) !== 3) falhar(`esperava 3 a vencer, veio ${exibindo(htmlVencendo)}`);
  if (htmlVencendo.includes("Venceu ontem")) falhar("atrasado vazou no filtro de a vencer");
  ok("filtro de vencendo: 3 itens (hoje, amanhã e o 7º dia)");

  console.log("\n8. Prazo combina com os outros filtros");
  const htmlCombo = await get("/?prazo=atrasados&situacao=resolvidos");
  if (exibindo(htmlCombo) !== 0) falhar("atrasado + resolvido deveria dar vazio");
  ok("atrasado + resolvido = 0 (são mutuamente exclusivos por definição)");

  console.log("\n9. Resolver um item atrasado tira ele da conta");
  const { data: atrasado } = await sb
    .from("item").select("id").eq("casorio_id", casorioId).eq("titulo", "Venceu ontem").single();
  await sb.from("item").update({ status: "feito" }).eq("id", atrasado.id);
  const depois = await get("/?prazo=atrasados");
  if (exibindo(depois) !== 1) falhar(`esperava 1 atrasado restante, veio ${exibindo(depois)}`);
  ok("marcar como feito remove o item dos atrasados na hora");

  console.log(`\n✅ PRAZOS OK — ${passos} verificações passaram.`);
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
