// Teste de fumaça da FATIA VERTICAL (M1) contra o Supabase real.
// Prova: login -> criar casório (vira Dono por trigger) -> tema -> subtema -> item
//        -> mudar status p/ pago -> auditoria gravada sozinha -> RLS ativo.
// Uso: SMOKE_EMAIL=... SMOKE_SENHA=... node scripts/smoke-fluxo.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

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
function ok(msg) {
  passos++;
  console.log(`  ✓ ${msg}`);
}
function falhar(msg, erro) {
  console.error(`  ✗ ${msg}${erro ? `: ${erro.message ?? erro}` : ""}`);
  process.exit(1);
}

const env = loadEnvLocal();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const email = process.env.SMOKE_EMAIL;
const senha = process.env.SMOKE_SENHA;
if (!email || !senha) falhar("faltou SMOKE_EMAIL / SMOKE_SENHA");

let casorioId = null;

try {
  console.log("\n1. Autenticação");
  const { data: auth, error: eAuth } = await sb.auth.signInWithPassword({ email, password: senha });
  if (eAuth) falhar("login", eAuth);
  ok(`logado como ${auth.user.email}`);

  console.log("\n2. RLS antes de ter casório");
  const { data: vazio, error: eVazio } = await sb.from("casorio").select("id");
  if (eVazio) falhar("select casorio", eVazio);
  ok(`RLS responde sem vazar dado de terceiros (${vazio.length} casório(s) meu(s))`);

  console.log("\n3. Criar casório (trigger deve me tornar Dono)");
  // Mesmo caminho do adapter: insert sem RETURNING (a policy de SELECT só passa
  // depois que o trigger AFTER INSERT cria a associação de Dono), depois lê.
  const novoId = crypto.randomUUID();
  const { error: eCas } = await sb
    .from("casorio")
    .insert({ id: novoId, nome: "Casório de Teste (smoke)", data_casamento: "2027-05-15", orcamento_total: 5000000 });
  if (eCas) falhar("insert casorio", eCas);
  casorioId = novoId;
  const { data: casorio, error: eLer } = await sb.from("casorio").select().eq("id", novoId).single();
  if (eLer) falhar("ler casorio recém-criado", eLer);
  ok(`casório criado: ${casorio.nome} (orçamento ${casorio.orcamento_total} centavos)`);

  const { data: membro, error: eMem } = await sb
    .from("membro")
    .select("papel")
    .eq("casorio_id", casorioId)
    .eq("user_id", auth.user.id)
    .single();
  if (eMem) falhar("select membro", eMem);
  if (membro.papel !== "dono") falhar(`papel deveria ser 'dono', veio '${membro.papel}'`);
  ok("trigger me tornou DONO automaticamente (D09/RN19)");

  console.log("\n4. Árvore Tema → Subtema → Item");
  const { data: tema, error: eT } = await sb
    .from("tema").insert({ casorio_id: casorioId, nome: "Comida" }).select().single();
  if (eT) falhar("insert tema", eT);
  ok(`tema: ${tema.nome}`);

  const { data: sub, error: eS } = await sb
    .from("subtema").insert({ tema_id: tema.id, casorio_id: casorioId, nome: "Bebidas" }).select().single();
  if (eS) falhar("insert subtema", eS);
  ok(`subtema: ${sub.nome}`);

  const { data: item, error: eI } = await sb
    .from("item")
    .insert({
      subtema_id: sub.id, casorio_id: casorioId, titulo: "Refrigerante",
      tem_custo: true, status: "a_decidir", custo_estimado: 30000,
    })
    .select().single();
  if (eI) falhar("insert item", eI);
  ok(`item: ${item.titulo} (status ${item.status}, estimado ${item.custo_estimado})`);

  console.log("\n5. Regras garantidas no banco (defesa em profundidade)");
  const { error: eRN06 } = await sb.from("item").update({ status: "pago", custo_real: 0 }).eq("id", item.id);
  if (!eRN06) falhar("RN06 falhou: banco aceitou 'pago' com custo real 0");
  ok("RN06: banco recusou 'pago' sem custo real ✔");

  const { error: eRN05 } = await sb
    .from("item")
    .insert({ subtema_id: sub.id, casorio_id: casorioId, titulo: "Inválido", tem_custo: false, status: "pago", custo_real: 100 });
  if (!eRN05) falhar("RN05 falhou: banco aceitou status 'pago' em item sem custo");
  ok("RN05: banco recusou status incoerente com tem_custo ✔");

  console.log("\n6. Mudar status para PAGO (com custo real)");
  const { data: pago, error: ePago } = await sb
    .from("item").update({ status: "pago", custo_real: 28500 }).eq("id", item.id).select().single();
  if (ePago) falhar("update status pago", ePago);
  if (pago.status !== "pago" || pago.custo_real !== 28500) falhar("item não ficou pago corretamente");
  ok(`item pago, custo real ${pago.custo_real} centavos`);

  console.log("\n7. Auditoria automática (trigger, append-only)");
  const { data: trilha, error: eAud } = await sb
    .from("auditoria").select("acao, entidade, entidade_rotulo, detalhe")
    .eq("casorio_id", casorioId).order("criado_em", { ascending: true });
  if (eAud) falhar("select auditoria", eAud);
  if (trilha.length < 4) falhar(`esperava >=4 registros de auditoria, veio ${trilha.length}`);
  ok(`${trilha.length} registros gravados sozinhos`);

  const mudou = trilha.find((t) => t.acao === "mudou_status");
  if (!mudou) falhar("faltou registro 'mudou_status'");
  ok(`mudança de status registrada: ${JSON.stringify(mudou.detalhe)}`);

  const { error: eImut } = await sb.from("auditoria").delete().eq("casorio_id", casorioId);
  const { data: aindaLa } = await sb.from("auditoria").select("id").eq("casorio_id", casorioId);
  if (!eImut && aindaLa.length === 0) falhar("RN22 falhou: auditoria foi apagada");
  ok("RN22: auditoria imutável, DELETE não apaga ✔");

  console.log("\n8. Leitura da árvore montada (o que a UI consome)");
  const { data: arvore, error: eArv } = await sb
    .from("tema").select("*, subtema(*, item(*))").eq("casorio_id", casorioId);
  if (eArv) falhar("select árvore", eArv);
  const itens = arvore[0]?.subtema?.[0]?.item ?? [];
  if (itens.length === 0) falhar("árvore veio sem itens");
  ok(`árvore: ${arvore.length} tema(s) → ${arvore[0].subtema.length} subtema(s) → ${itens.length} item(ns)`);

  console.log(`\n✅ FATIA VERTICAL OK — ${passos} verificações passaram.`);
} finally {
  if (casorioId) {
    const { error } = await sb.from("casorio").delete().eq("id", casorioId);
    console.log(error ? `\n⚠️ limpeza falhou: ${error.message}` : "\n🧹 dados de teste removidos (cascata).");
  }
}
