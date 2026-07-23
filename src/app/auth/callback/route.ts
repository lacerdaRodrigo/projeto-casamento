// Troca o code (magic link OU confirmação de e-mail) por uma sessão e volta pra
// home. Link expirado/inválido -> volta pro login com aviso e opção de reenviar.
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/adapters/supabase/client";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // o Supabase pode devolver o próprio erro na URL (ex.: link expirado)
  const erroUrl = searchParams.get("error_description") ?? searchParams.get("error");

  if (erroUrl) {
    const msg = "O link expirou ou já foi usado. Reenvie a confirmação e tente de novo.";
    return NextResponse.redirect(
      `${origin}/login?erro=${encodeURIComponent(msg)}&confirmar=1`,
    );
  }

  if (code) {
    const sb = await createSupabaseServerClient();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) {
      const msg = "Não deu pra confirmar o e-mail. Reenvie a confirmação e tente de novo.";
      return NextResponse.redirect(
        `${origin}/login?erro=${encodeURIComponent(msg)}&confirmar=1`,
      );
    }
  }
  return NextResponse.redirect(`${origin}/`);
}
