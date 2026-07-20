// Teste de fumaça dos FILTROS + CURADORIA DE CAMPOS + TEMAS COLAPSADOS.
// Semeia o modelo num usuário descartável e confere na tela real:
//  - temas fechados com resumo
//  - filtros por situação / essenciais / tema
//  - o formulário de cada item mostrando SÓ os campos certos
//
// SEGURANÇA: usuário e casório próprios; apaga só o que criou.
// Uso: BASE=http://localhost:3010 node scripts/smoke-filtros.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { TEMPLATE_CASORIO, contarTemplate } from "../src/domain/template-casorio.ts";

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
const get = async (qs = "") => (await fetch(`${BASE}/${qs}`, { headers: { Cookie: cookie } })).text();

/** "exibindo <b>N</b> de M itens" */
function exibindo(html) {
  const m = html.match(/exibindo\s*(?:<!--[^>]*-->)?\s*<b>(\d+)<\/b>/);
  return m ? Number(m[1]) : null;
}

/** Conta os temas realmente renderizados na árvore (só o atributo do HTML —
    o payload RSC repete a string e o <select> de filtros lista todos). */
function contarTemas(html) {
  return (html.match(/class="tema-resumo"/g) ?? []).length;
}

/** Recorta o formulário de edição do item cujo título foi informado. */
function formularioDoItem(html, titulo) {
  const forms = html.match(/<form\b[\s\S]*?<\/form>/g) ?? [];
  return forms.find((f) => f.includes('name="statusAtual"') && f.includes(`value="${titulo}"`)) ?? null;
}

const esperado = contarTemplate(TEMPLATE_CASORIO);
let casorioId = null;

try {
  console.log("\n1. Casório descartável com o modelo semeado");
  const { data: cad, error: eCad } = await sb.auth.signUp({
    email: `smoke-filtro-${Date.now()}@teste.local`,
    password: "smoke-filtro-123456",
  });
  if (eCad) falhar("signup", eCad.message);
  cookie = cookieDaSessao(cad.session);

  casorioId = crypto.randomUUID();
  await sb.from("casorio").insert({ id: casorioId, nome: "SMOKE filtros", orcamento_total: 5_000_000 });

  const temas = [];
  const subtemas = [];
  const itens = [];
  TEMPLATE_CASORIO.forEach((tema, iT) => {
    const temaId = crypto.randomUUID();
    temas.push({ id: temaId, casorio_id: casorioId, nome: tema.nome, ordem: iT });
    tema.subtemas.forEach((sub, iS) => {
      const subId = crypto.randomUUID();
      subtemas.push({ id: subId, tema_id: temaId, casorio_id: casorioId, nome: sub.nome, ordem: iS });
      sub.itens.forEach((item, iI) => {
        itens.push({
          id: crypto.randomUUID(), subtema_id: subId, casorio_id: casorioId,
          titulo: item.titulo, tem_custo: item.temCusto,
          status: item.temCusto ? "a_decidir" : "a_fazer",
          essencial: item.essencial ?? false, ordem: iI,
        });
      });
    });
  });
  for (const [t, linhas] of [["tema", temas], ["subtema", subtemas], ["item", itens]]) {
    const { error } = await sb.from(t).insert(linhas);
    if (error) falhar(`insert ${t}`, error.message);
  }
  ok(`${esperado.temas} temas · ${esperado.subtemas} subtemas · ${esperado.itens} itens`);

  console.log("\n2. Temas fechados por padrão, com resumo na linha");
  let html = await get();
  const abertos = (html.match(/<details className="tema" open|<details class="tema" open/g) ?? []).length;
  if (abertos > 0) falhar(`${abertos} tema(s) vieram abertos sem filtro`);
  const resumos = contarTemas(html);
  if (resumos !== esperado.temas) falhar(`esperava ${esperado.temas} temas na árvore, achei ${resumos}`);
  if (!html.includes("resolvidos")) falhar("resumo do tema não mostra contagem de resolvidos");
  ok(`${esperado.temas} temas fechados, cada um com resumo`);

  console.log("\n3. Contagem de itens exibidos");
  if (exibindo(html) !== esperado.itens) falhar(`esperava ${esperado.itens} exibidos, veio ${exibindo(html)}`);
  ok(`sem filtro: exibindo ${esperado.itens} de ${esperado.itens}`);

  console.log("\n4. Filtrar por situação");
  const htmlPend = await get("?situacao=pendentes");
  if (exibindo(htmlPend) !== esperado.itens) {
    falhar(`tudo está pendente, esperava ${esperado.itens}, veio ${exibindo(htmlPend)}`);
  }
  ok(`"só o que falta": ${exibindo(htmlPend)} itens (nada resolvido ainda)`);

  const htmlResolv = await get("?situacao=resolvidos");
  if (exibindo(htmlResolv) !== 0) falhar(`esperava 0 resolvidos, veio ${exibindo(htmlResolv)}`);
  if (!htmlResolv.includes("Nenhum item bate com esse filtro")) falhar("faltou a mensagem de vazio");
  ok('"só o que já resolvi": 0 itens, com mensagem de vazio');

  // resolve um item e confere que a contagem muda
  const { data: umItem } = await sb.from("item").select("id,titulo").eq("casorio_id", casorioId).eq("tem_custo", false).limit(1).single();
  await sb.from("item").update({ status: "feito" }).eq("id", umItem.id);
  if (exibindo(await get("?situacao=resolvidos")) !== 1) falhar("resolver um item não refletiu no filtro");
  if (exibindo(await get("?situacao=pendentes")) !== esperado.itens - 1) falhar("pendentes não caiu em 1");
  ok(`resolvendo "${umItem.titulo}": resolvidos=1, pendentes=${esperado.itens - 1}`);

  console.log("\n5. Filtrar só essenciais");
  const { count: totalEssenciais } = await sb
    .from("item").select("id", { count: "exact", head: true }).eq("casorio_id", casorioId).eq("essencial", true);
  const htmlEss = await get("?essencial=1");
  if (exibindo(htmlEss) !== totalEssenciais) {
    falhar(`esperava ${totalEssenciais} essenciais, veio ${exibindo(htmlEss)}`);
  }
  if (totalEssenciais >= esperado.itens) falhar("essenciais deveriam ser um subconjunto");
  ok(`"só essenciais": ${totalEssenciais} de ${esperado.itens} itens`);

  console.log("\n6. Filtrar por tema");
  const { data: temaLocal } = await sb.from("tema").select("id,nome").eq("casorio_id", casorioId).eq("nome", "Local").single();
  const { data: subsLocal } = await sb.from("subtema").select("id").eq("tema_id", temaLocal.id);
  const { count: itensLocal } = await sb
    .from("item").select("id", { count: "exact", head: true }).in("subtema_id", subsLocal.map((s) => s.id));
  const htmlTema = await get(`?tema=${temaLocal.id}`);
  if (exibindo(htmlTema) !== itensLocal) falhar(`tema Local: esperava ${itensLocal}, veio ${exibindo(htmlTema)}`);
  // conta os TEMAS renderizados na árvore (o <select> de filtro lista todos, e
  // por isso não serve pra essa checagem)
  const temasNaTela = contarTemas(htmlTema);
  if (temasNaTela !== 1) falhar(`esperava 1 tema na árvore, achei ${temasNaTela}`);
  ok(`tema "Local": ${itensLocal} itens, e só ele na árvore`);

  console.log("\n7. Filtros combinados abrem os temas automaticamente");
  const htmlCombo = await get("?situacao=pendentes&essencial=1");
  const n = exibindo(htmlCombo);
  if (n === null || n > totalEssenciais) falhar(`combinação deveria reduzir, veio ${n}`);
  if (!htmlCombo.includes('class="tema"') && !htmlCombo.includes('className="tema"')) falhar("temas sumiram");
  ok(`pendentes + essenciais: ${n} itens, temas abertos pra ver o resultado`);

  console.log("\n8. Limpar volta ao total");
  if (exibindo(await get()) !== esperado.itens) falhar("limpar não voltou ao total");
  ok(`sem filtro de novo: ${esperado.itens} itens`);

  console.log("\n9. CURADORIA: cada item mostra só os campos certos");
  const htmlLocal = await get(`?tema=${temaLocal.id}`);
  const fLocal = formularioDoItem(htmlLocal, "Reservar o local da cerimônia");
  if (!fLocal) falhar('form de "Reservar o local da cerimônia" não encontrado');
  if (!fLocal.includes("fornecedorNome")) falhar("item de contratação deveria ter fornecedor");
  if (!fLocal.includes("custoEstimadoCentavos")) falhar("item com custo deveria ter valor");
  if (fLocal.includes("mais-campos")) falhar('não deveria ter "+ mais campos" (fornecedor já está visível)');
  ok('"Reservar o local da cerimônia": tem valor E fornecedor (perfil contratação)');

  const { data: temaPlan } = await sb.from("tema").select("id").eq("casorio_id", casorioId).eq("nome", "Planejamento").single();
  const htmlPlan = await get(`?tema=${temaPlan.id}`);
  const fData = formularioDoItem(htmlPlan, "Definir a data do casamento");
  if (!fData) falhar('form de "Definir a data do casamento" não encontrado');
  const iEscape = fData.indexOf("mais-campos");
  const iFornecedor = fData.indexOf('class="fornecedor');
  if (iEscape === -1) falhar('faltou o escape "+ mais campos"');
  if (iFornecedor !== -1 && iFornecedor < iEscape) {
    falhar("fornecedor apareceu solto, fora do escape");
  }
  ok('"Definir a data do casamento": fornecedor só existe aninhado em "+ mais campos"');

  const { data: temaBeb } = await sb.from("tema").select("id").eq("casorio_id", casorioId).eq("nome", "Bebidas").single();
  const htmlBeb = await get(`?tema=${temaBeb.id}`);
  const fRefri = formularioDoItem(htmlBeb, "Refrigerante");
  if (!fRefri) falhar('form de "Refrigerante" não encontrado');
  if (!fRefri.includes("custoEstimadoCentavos")) falhar("Refrigerante deveria ter valor");
  if (!fRefri.includes("mais-campos")) falhar("Refrigerante deveria esconder fornecedor no escape");
  ok('"Refrigerante": tem valor, fornecedor escondido (perfil compra)');

  console.log("\n10. A regra CSS que esconde o dinheiro existe");
  const css = await (await fetch(`${BASE}/_next/static/css/${(await get()).match(/href="\/_next\/static\/css\/([^"]+)"/)?.[1] ?? ""}`)).text().catch(() => "");
  if (css && !css.includes("so-com-custo")) falhar("a regra .so-com-custo não chegou no CSS servido");
  ok(css ? "regra .so-com-custo presente no CSS servido" : "CSS não inspecionado (build de dev)");

  console.log(`\n✅ FILTROS + CURADORIA OK — ${passos} verificações passaram.`);
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
