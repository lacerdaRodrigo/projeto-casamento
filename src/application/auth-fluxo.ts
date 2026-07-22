// Lógica PURA do fluxo de autenticação (validação + pra onde redirecionar).
// Separada das server actions pra ser testável sem Supabase nem next/navigation.
import { z } from "zod";

const emailSchema = z.string().trim().email();
const senhaSchema = z.string().min(6);

export type Credenciais = { ok: true; email: string; senha: string } | { ok: false };

/** Valida e-mail + senha vindos do form (dado externo é hostil — §9). */
export function parseCredenciais(email: unknown, senha: unknown): Credenciais {
  const e = emailSchema.safeParse(email);
  const s = senhaSchema.safeParse(senha);
  if (!e.success || !s.success) return { ok: false };
  return { ok: true, email: e.data, senha: s.data };
}

/** Valida só o e-mail (magic link / reenvio). null = inválido. */
export function parseEmail(email: unknown): string | null {
  const e = emailSchema.safeParse(email);
  return e.success ? e.data : null;
}

/**
 * Destino após o signUp:
 * - com sessão (confirmação DESLIGADA) → entra direto ("/")
 * - sem sessão (confirmação LIGADA) → volta pro login pedindo confirmação
 */
export function destinoCadastro(res: { temSessao: boolean }): string {
  return res.temSessao ? "/" : "/login?confirme=1";
}

/**
 * Destino após ERRO de login. "E-mail não confirmado" ganha mensagem própria e
 * liga o bloco de reenvio (`&confirmar=1`); o resto vira erro genérico de
 * credenciais (não revela se o e-mail existe).
 */
export function destinoErroLogin(codigoErro: string | undefined): string {
  const naoConfirmado = codigoErro === "email_not_confirmed";
  const msg = naoConfirmado
    ? "Confirme seu e-mail antes de entrar — veja a caixa de entrada (e o spam)."
    : "E-mail ou senha incorretos.";
  return `/login?erro=${encodeURIComponent(msg)}${naoConfirmado ? "&confirmar=1" : ""}`;
}
