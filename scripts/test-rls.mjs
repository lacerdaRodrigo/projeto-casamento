// Teste de RLS contra o Supabase REAL — só LEITURA (seguro, não grava nada).
// Prova o vetor de vazamento nº 1: um cliente ANÔNIMO (sem login) não pode ler
// NENHUMA tabela. E que um usuário autenticado consegue ler (o caminho normal).
//
// Uso: npm run test:rls   (lê URL/anon key + CASORIO_EMAIL/SENHA do .env.local)
//
// O que NÃO cobre (precisa de 2 usuários -> projeto de teste ou Docker):
//  - isolamento entre casórios diferentes (usuário A não vê o de B)
//  - Leitor não escreve / auditoria imutável (mutações — evitadas contra prod)
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

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.CASORIO_EMAIL ?? env.CASORIO_EMAIL;
const senha = process.env.CASORIO_SENHA ?? env.CASORIO_SENHA;

if (!url || !key) {
  console.error("FALTA NEXT_PUBLIC_SUPABASE_URL / ANON_KEY no .env.local");
  process.exit(2);
}

const TABELAS = ["casorio", "membro", "tema", "subtema", "item", "auditoria"];
let falhas = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const fail = (m) => {
  console.error(`  ✗ ${m}`);
  falhas++;
};

// 1) ANÔNIMO (sem sessão) não pode LER nada — RLS é "to authenticated".
console.log("Anônimo (sem login) não lê nenhuma tabela:");
const anon = createClient(url, key, { auth: { persistSession: false } });
for (const t of TABELAS) {
  const { data, error } = await anon.from(t).select("*").limit(1);
  const linhas = data?.length ?? 0;
  if (linhas === 0) ok(`${t}: 0 linhas (bloqueado)`);
  else fail(`${t}: VAZOU ${linhas} linha(s) pra anônimo! ${error?.message ?? ""}`);
}

// 2) AUTENTICADO consegue ler o próprio casório (caminho normal funciona).
if (email && senha) {
  console.log("\nAutenticado lê o próprio casório:");
  const authed = createClient(url, key, { auth: { persistSession: false } });
  const { error: erroLogin } = await authed.auth.signInWithPassword({ email, password: senha });
  if (erroLogin) {
    fail(`login falhou: ${erroLogin.message}`);
  } else {
    const { data, error } = await authed.from("casorio").select("id").limit(1);
    if (error) fail(`select casorio deu erro: ${error.message}`);
    else ok(`select casorio sem erro (${data.length} visível — o próprio)`);
  }
  await authed.auth.signOut();
} else {
  console.log("\n(pulei o teste autenticado — sem CASORIO_EMAIL/SENHA no .env.local)");
}

console.log("");
if (falhas > 0) {
  console.error(`RLS: ${falhas} FALHA(S) — vazamento! Revisar policies.`);
  process.exit(1);
}
console.log("RLS OK — anônimo bloqueado, autenticado lê o próprio.");
