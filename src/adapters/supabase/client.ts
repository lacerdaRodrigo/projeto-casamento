// Client Supabase (servidor) via @supabase/ssr. Usa o TOKEN DO USUÁRIO
// (cookies) — assim o RLS é a garantia real (PRD §4.4). A service_role nunca é
// usada. (O client de browser foi removido: o app só fala com o Supabase pelo
// servidor.)
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "./env";

/** Client pro servidor (Server Components, Server Actions, Route Handlers). */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Chamado de um Server Component (só leitura de cookies). O refresh
          // de sessão acontece no middleware — pode ignorar aqui.
        }
      },
    },
  });
}
