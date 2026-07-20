// Troca o code do magic link por uma sessão e volta pra home (RF01).
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/adapters/supabase/client";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const sb = await createSupabaseServerClient();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?erro=${encodeURIComponent(error.message)}`);
    }
  }
  return NextResponse.redirect(`${origin}/`);
}
