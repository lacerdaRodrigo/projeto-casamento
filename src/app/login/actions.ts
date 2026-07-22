"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/adapters/supabase/client";

const emailSchema = z.string().trim().email("E-mail inválido");
const senhaSchema = z.string().min(6, "Senha precisa de ao menos 6 caracteres");

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Magic link por e-mail (RF01). Limitado no free-tier (~poucos/hora). */
export async function enviarMagicLink(formData: FormData) {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) redirect(`/login?erro=${encodeURIComponent("E-mail inválido")}`);

  const sb = await createSupabaseServerClient();
  const { error } = await sb.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo: `${await origin()}/auth/callback` },
  });
  if (error) redirect(`/login?erro=${encodeURIComponent(error.message)}`);
  redirect("/login?enviado=1");
}

/** Login por e-mail + senha (rápido, sem e-mail — bom pra dev). */
export async function entrarComSenha(formData: FormData) {
  const email = emailSchema.safeParse(formData.get("email"));
  const senha = senhaSchema.safeParse(formData.get("senha"));
  if (!email.success || !senha.success) {
    redirect(`/login?erro=${encodeURIComponent("E-mail ou senha inválidos")}`);
  }

  const sb = await createSupabaseServerClient();
  const { error } = await sb.auth.signInWithPassword({
    email: email.data,
    password: senha.data,
  });
  if (error) {
    // e-mail ainda não confirmado tem tratamento próprio (com opção de reenviar)
    const naoConfirmado = error.code === "email_not_confirmed";
    const msg = naoConfirmado
      ? "Confirme seu e-mail antes de entrar — veja a caixa de entrada (e o spam)."
      : "E-mail ou senha incorretos.";
    redirect(`/login?erro=${encodeURIComponent(msg)}${naoConfirmado ? "&confirmar=1" : ""}`);
  }
  redirect("/");
}

/**
 * Criar conta por e-mail + senha. Com "Confirm email" LIGADO no Supabase, não
 * vem sessão — o usuário precisa clicar no link do e-mail (que volta pro
 * /auth/callback graças ao emailRedirectTo). Sem confirmação, loga na hora.
 */
export async function cadastrarComSenha(formData: FormData) {
  const email = emailSchema.safeParse(formData.get("email"));
  const senha = senhaSchema.safeParse(formData.get("senha"));
  if (!email.success || !senha.success) {
    redirect(`/login?erro=${encodeURIComponent("E-mail inválido ou senha curta (mín. 6)")}`);
  }

  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.auth.signUp({
    email: email.data,
    password: senha.data,
    options: { emailRedirectTo: `${await origin()}/auth/callback` },
  });
  if (error) redirect(`/login?erro=${encodeURIComponent(error.message)}`);

  // Confirmação desligada -> já vem sessão -> home. Ligada -> sem sessão -> avisa.
  if (data.session) redirect("/");
  redirect("/login?confirme=1");
}

/** Reenvia o e-mail de confirmação (link expirou / não chegou). */
export async function reenviarConfirmacao(formData: FormData) {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) {
    redirect(`/login?erro=${encodeURIComponent("Informe um e-mail válido para reenviar.")}`);
  }

  const sb = await createSupabaseServerClient();
  const { error } = await sb.auth.resend({
    type: "signup",
    email: email.data,
    options: { emailRedirectTo: `${await origin()}/auth/callback` },
  });
  if (error) redirect(`/login?erro=${encodeURIComponent(error.message)}`);
  redirect("/login?reenviado=1");
}
