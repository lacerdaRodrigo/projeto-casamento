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
}
