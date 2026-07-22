// Adapter Supabase da porta AuthService.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthService, UsuarioAutenticado } from "@/ports/auth-service";

export class SupabaseAuthService implements AuthService {
  constructor(private readonly sb: SupabaseClient) {}

  async usuarioAtual(): Promise<UsuarioAutenticado | null> {
    const { data, error } = await this.sb.auth.getUser();
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  }

  async usuarioDaSessao(): Promise<UsuarioAutenticado | null> {
    // getSession lê do cookie (sem rede) — o middleware já refrescou a sessão a
    // cada request. Evita um segundo getUser remoto por navegação.
    const { data } = await this.sb.auth.getSession();
    const user = data.session?.user;
    if (!user) return null;
    return { id: user.id, email: user.email ?? null };
  }
}
