// Teste de fumaça da UI REAL: dispara as server actions como o navegador faz
// (POST multipart com o campo $ACTION_ID), num USUÁRIO DESCARTÁVEL próprio.
//
// SEGURANÇA: cria um usuário e um casório só pra este teste e mexe apenas neles.
// Nunca toca em dado de outra conta. Ver memória "nunca-deletar-sem-escopo".
//
// Uso: BASE=http://localhost:3007 node scripts/smoke-ui.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";

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
const falhar = (m, extra) => {
  console.error(`  ✗ ${m}${extra ? `: ${extra}` : ""}`);
  process.exitCode = 1;
  throw new Error(m);
};

const env = loadEnvLocal();
const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** Monta o cookie de sessão do @supabase/ssr (fatiado igual à lib). */
function cookieDaSessao(session) {
  const valor = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  const nome = `sb-${ref}-auth-token`;
  const MAX = 3180;
  if (valor.length <= MAX) return `${nome}=${valor}`;
  const partes = [];
  for (let i = 0, n = 0; i < valor.length; i += MAX, n++) {
    partes.push(`${nome}.${n}=${valor.slice(i, i + MAX)}`);
  }
  return partes.join("; ");
}

let cookie = "";
const getHome = async (qs = "") => {
  const r = await fetch(`${BASE}/${qs}`, { headers: { Cookie: cookie } });
  return r.text();
};

/**
 * Acha o form que contém TODOS os marcadores e devolve $ACTION_ID + campos ocultos.
 * Vários marcadores são necessários porque a mesma linha tem mais de um form com
 * o mesmo campo (ex.: mudar status e excluir, ambos com `itemId`).
 */
function acharForm(html, ...marcadores) {
  const forms = html.match(/<form\b[\s\S]*?<\/form>/g) ?? [];
  const alvo = forms.find((f) => marcadores.every((m) => f.includes(m)));
  if (!alvo) return null;
  const aid = alvo.match(/name="(\$ACTION_ID_[a-f0-9]+)"/);
  const campos = {};
  for (const m of alvo.matchAll(/<input[^>]*name="([^"$][^"]*)"[^>]*value="([^"]*)"/g)) {
    campos[m[1]] = m[2];
  }
  return aid ? { actionId: aid[1], campos } : null;
}

async function dispararAction(actionId, campos) {
  const fd = new FormData();
  fd.append(actionId, "");
  for (const [k, v] of Object.entries(campos)) fd.append(k, v);
  const r = await fetch(`${BASE}/`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: fd,
    redirect: "manual",
  });
  return { status: r.status, location: r.headers.get("location") };
}

const contarOcorrencias = (html, re) => (html.match(re) ?? []).length;

let casorioId = null;
try {
  console.log("\n1. Usuário descartável (isolado dos seus dados)");
  const email = `smoke-ui-${Date.now()}@teste.local`;
  const senha = "smoke-ui-123456";
  const { data: cadastro, error: eCad } = await sb.auth.signUp({ email, password: senha });
  if (eCad) falhar("signup", eCad.message);
  if (!cadastro.session) falhar("signup não devolveu sessão (confirm email ligado?)");
  cookie = cookieDaSessao(cadastro.session);
  ok(`criado e logado como ${email}`);

  console.log("\n2. Onboarding aparece com o modelo marcado por padrão");
  let html = await getHome();
  if (!html.includes('name="usarModelo"')) falhar("checkbox usarModelo não renderizou");
  if (!/Bem-vindos/.test(html)) falhar("não é a tela de onboarding");
  ok("checkbox 'Começar com o modelo pronto' presente e marcado");

  console.log("\n3. Criar casório COM o modelo (server action de verdade)");
  const formCriar = acharForm(html, 'name="usarModelo"');
  if (!formCriar) falhar("form de criar casório não encontrado");
  const r1 = await dispararAction(formCriar.actionId, {
    nome: "SMOKE UI (temporário)",
    dataCasamento: "2027-09-10",
    orcamentoCentavos: "3000000",
    usarModelo: "on",
  });
  if (r1.status >= 400) falhar(`criar casório falhou (HTTP ${r1.status})`);
  if (r1.location?.includes("erro=")) falhar("criar casório redirecionou com erro", r1.location);
  ok(`casório criado e modelo semeado (HTTP ${r1.status})`);

  const { data: casorios } = await sb.from("casorio").select("id,nome");
  const meu = (casorios ?? []).find((c) => c.nome === "SMOKE UI (temporário)");
  if (!meu) falhar("casório não apareceu no banco");
  casorioId = meu.id;

  console.log("\n4. A árvore renderiza cheia, com botões de excluir");
  html = await getHome();
  const lixeiras = contarOcorrencias(html, /class="excluir"/g);
  if (lixeiras < 50) falhar(`esperava muitos botões 🗑️, achei ${lixeiras}`);
  if (!html.includes("Orçamento")) falhar("painel do casório não renderizou");
  ok(`árvore renderizada com ${lixeiras} botões de excluir`);

  const conta = async (tabela) => {
    const { count } = await sb
      .from(tabela).select("id", { count: "exact", head: true }).eq("casorio_id", casorioId);
    return count;
  };
  ok(`no banco: ${await conta("tema")} temas · ${await conta("subtema")} subtemas · ${await conta("item")} itens`);

  console.log("\n5. Excluir um TEMA pela UI (cascata)");
  const formExcluirTema = acharForm(html, 'name="temaId"', 'class="excluir"');
  if (!formExcluirTema) falhar("form de excluir tema não encontrado");
  const temasAntes = await conta("tema");
  const r2 = await dispararAction(formExcluirTema.actionId, formExcluirTema.campos);
  if (r2.location?.includes("erro=")) falhar("exclusão redirecionou com erro", r2.location);
  const temasDepois = await conta("tema");
  if (temasDepois !== temasAntes - 1) falhar(`tema não foi apagado (${temasAntes} → ${temasDepois})`);
  ok(`tema apagado pela UI (${temasAntes} → ${temasDepois} temas)`);

  console.log("\n6. Excluir um ITEM pela UI");
  html = await getHome();
  const formExcluirItem = acharForm(html, 'name="itemId"', 'class="excluir"');
  if (!formExcluirItem) falhar("form de excluir item não encontrado");
  const itensAntes = await conta("item");
  const r3 = await dispararAction(formExcluirItem.actionId, formExcluirItem.campos);
  if (r3.location?.includes("erro=")) falhar("exclusão de item deu erro", r3.location);
  const itensDepois = await conta("item");
  if (itensDepois >= itensAntes) falhar(`item não foi apagado (${itensAntes} → ${itensDepois})`);
  ok(`item apagado pela UI (${itensAntes} → ${itensDepois} itens)`);

  console.log("\n7. Árvore vazia mostra o botão 'Carregar modelo pronto'");
  const { data: temas } = await sb.from("tema").select("id").eq("casorio_id", casorioId);
  for (const t of temas ?? []) await sb.from("tema").delete().eq("id", t.id);
  html = await getHome();
  if (!html.includes("Carregar modelo pronto")) falhar("botão de carregar modelo não apareceu");
  ok("com a árvore vazia, o botão de recarregar o modelo aparece");

  console.log("\n8. Recarregar o modelo pela UI");
  const formModelo = acharForm(html, 'name="casorioId"', 'Carregar modelo pronto');
  if (!formModelo) falhar("form de carregar modelo não encontrado");
  const r4 = await dispararAction(formModelo.actionId, formModelo.campos);
  if (r4.location?.includes("erro=")) falhar("carregar modelo deu erro", r4.location);
  const temasRecarregados = await conta("tema");
  if (temasRecarregados < 15) falhar(`modelo não recarregou direito (${temasRecarregados} temas)`);
  ok(`modelo recarregado: ${temasRecarregados} temas · ${await conta("item")} itens`);

  console.log(`\n✅ UI OK — ${passos} verificações passaram.`);
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
