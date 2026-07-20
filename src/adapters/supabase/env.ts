// Lê as env vars públicas do Supabase. Segredos ficam fora do git (§9.1).
// A anon key é pública (protegida por RLS). service_role NUNCA entra aqui.

export function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL ausente — copie .env.local.example para .env.local");
  return url;
}

export function supabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY ausente — copie .env.local.example para .env.local");
  return key;
}
