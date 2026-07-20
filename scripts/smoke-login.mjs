// Teste de fumaça do login REAL (mesmo caminho do app: @supabase/supabase-js).
// Uso: SMOKE_EMAIL=... SMOKE_SENHA=... node scripts/smoke-login.mjs
// Lê URL/anon key do .env.local. Não guarda senha em disco.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadEnvLocal() {
  const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const out = {};
  for (const line of txt.split("\n")) {
    const i = line.indexOf("=");
    if (i > 0 && !line.trimStart().startsWith("#")) {
      out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return out;
}

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.SMOKE_EMAIL;
const senha = process.env.SMOKE_SENHA;

if (!url || !key) {
  console.error("FALTA NEXT_PUBLIC_SUPABASE_URL/ANON_KEY no .env.local");
  process.exit(2);
}
if (!email || !senha) {
  console.error("Passe SMOKE_EMAIL e SMOKE_SENHA no ambiente.");
  process.exit(2);
}

const sb = createClient(url, key);
const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });

if (error) {
  console.error(`LOGIN FALHOU: [${error.code ?? error.status}] ${error.message}`);
  process.exit(1);
}
console.log(`LOGIN OK — usuário: ${data.user?.email} (id ${data.user?.id})`);
process.exit(0);
