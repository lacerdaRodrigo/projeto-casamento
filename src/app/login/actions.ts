"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/adapters/supabase/client";
import {
  destinoCadastro,
  destinoErroLogin,
  mensagemErroCadastro,
  parseCredenciais,
  parseEmail,
} from "@/application/auth-fluxo";

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Magic link por e-mail (RF01). Limitado no free-tier (~poucos/hora). */
export async function enviarMagicLink(formData: FormData) {
  const email = parseEmail(formData.get("email"));
  if (!email) redirect(`/login?erro=${encodeURIComponent("E-mail inválido")}`);

  const sb = await createSupabaseServerClient();
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${await origin()}/auth/callback` },
  });
  if (error) redirect(`/login?erro=${encodeURIComponent(error.message)}`);
  redirect("/login?enviado=1");
}

/** Login por e-mail + senha. */
export async function entrarComSenha(formData: FormData) {
  const cred = parseCredenciais(formData.get("email"), formData.get("senha"));
  if (!cred.ok) redirect(`/login?erro=${encodeURIComponent("E-mail ou senha inválidos")}`);

  const sb = await createSupabaseServerClient();
  const { error } = await sb.auth.signInWithPassword({
    email: cred.email,
    password: cred.senha,
  });
  if (error) redirect(destinoErroLogin(error.code));
  redirect("/");
}

/**
 * Criar conta por e-mail + senha. Com "Confirm email" LIGADO no Supabase, não
 * vem sessão — o usuário precisa clicar no link do e-mail (que volta pro
 * /auth/callback graças ao emailRedirectTo). Sem confirmação, loga na hora.
 */
export async function cadastrarComSenha(formData: FormData) {
  const cred = parseCredenciais(formData.get("email"), formData.get("senha"));
  if (!cred.ok) {
    redirect(`/login?erro=${encodeURIComponent("E-mail inválido ou senha curta (mín. 6)")}`);
  }

  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.auth.signUp({
    email: cred.email,
    password: cred.senha,
    options: { emailRedirectTo: `${await origin()}/auth/callback` },
  });
  if (error) {
    redirect(`/login?erro=${encodeURIComponent(mensagemErroCadastro(error.code, error.message))}`);
  }

  redirect(destinoCadastro({ temSessao: Boolean(data.session) }));
}

/** Reenvia o e-mail de confirmação (link expirou / não chegou). */
export async function reenviarConfirmacao(formData: FormData) {
  const email = parseEmail(formData.get("email"));
  if (!email) {
    redirect(`/login?erro=${encodeURIComponent("Informe um e-mail válido para reenviar.")}`);
  }

  const sb = await createSupabaseServerClient();
  const { error } = await sb.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${await origin()}/auth/callback` },
  });
  if (error) redirect(`/login?erro=${encodeURIComponent(error.message)}`);
  redirect("/login?reenviado=1");
}
