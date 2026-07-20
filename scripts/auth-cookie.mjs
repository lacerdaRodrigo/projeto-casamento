// Gera o cookie de sessão do @supabase/ssr pra testar páginas AUTENTICADAS
// por fora do navegador (curl, scripts). Imprime o header Cookie pronto.
//
// Uso:
//   COOKIE=$(SMOKE_EMAIL=... SMOKE_SENHA=... node scripts/auth-cookie.mjs)
//   curl -H "Cookie: $COOKIE" http://localhost:3000/
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const env = Object.fromEntries(
  txt
    .split("\n")
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const { data, error } = await sb.auth.signInWithPassword({
  email: process.env.SMOKE_EMAIL,
  password: process.env.SMOKE_SENHA,
});
if (error) {
  console.error("login falhou:", error.message);
  process.exit(1);
}

const valor = "base64-" + Buffer.from(JSON.stringify(data.session)).toString("base64url");
const nome = `sb-${ref}-auth-token`;
const MAX = 3180; // @supabase/ssr fatia o cookie nesse tamanho

const partes = [];
if (valor.length <= MAX) {
  partes.push(`${nome}=${valor}`);
} else {
  for (let i = 0, n = 0; i < valor.length; i += MAX, n++) {
    partes.push(`${nome}.${n}=${valor.slice(i, i + MAX)}`);
  }
}
console.log(partes.join("; "));
