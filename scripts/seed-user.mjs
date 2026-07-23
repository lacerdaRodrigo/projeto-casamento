// Cria (ou garante) a conta fixa do casal no Supabase, lendo o e-mail/senha do
// .env.local (CASORIO_EMAIL / CASORIO_SENHA). Idempotente: se a conta já existe,
// só avisa. Uso: `npm run seed:conta`.
//
// Segurança: as credenciais vivem SÓ no .env.local (git-ignored) — nunca no
// código versionado. A senha em si é guardada pelo Supabase como hash.
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
const email = process.env.CASORIO_EMAIL ?? env.CASORIO_EMAIL;
const senha = process.env.CASORIO_SENHA ?? env.CASORIO_SENHA;

if (!url || !key) {
  console.error("FALTA NEXT_PUBLIC_SUPABASE_URL / ANON_KEY no .env.local");
  process.exit(2);
}
if (!email || !senha) {
  console.error("FALTA CASORIO_EMAIL / CASORIO_SENHA no .env.local");
  process.exit(2);
}

const sb = createClient(url, key);
const { data, error } = await sb.auth.signUp({ email, password: senha });

if (error) {
  const jaExiste = error.code === "user_already_exists" || /already/i.test(error.message);
  if (jaExiste) {
    console.log(`OK — a conta ${email} já existe. Nada a fazer.`);
    process.exit(0);
  }
  console.error(`FALHOU: [${error.code ?? error.status}] ${error.message}`);
  process.exit(1);
}

console.log(
  data.session
    ? `CONTA CRIADA e já ativa: ${email}`
    : `CONTA CRIADA: ${email} (confirmação de e-mail está ligada — confirme pelo link).`,
);
