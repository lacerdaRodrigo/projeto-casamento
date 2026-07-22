import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  cadastrarComSenha,
  entrarComGoogle,
  entrarComSenha,
  reenviarConfirmacao,
} from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    erro?: string;
    confirme?: string;
    confirmar?: string;
    reenviado?: string;
  }>;
}) {
  const sp = await searchParams;
  // mostra o bloco de reenviar quando o e-mail precisa ser confirmado
  const precisaConfirmar = sp.confirme === "1" || sp.confirmar === "1";

  return (
    <main className="centro">
      <div className="cartao">
        <div
          className="app-header-acoes"
          style={{ justifyContent: "flex-end", marginBottom: "0.5rem" }}
        >
          <ThemeToggle />
        </div>
        <div className="avatar lg" aria-hidden="true">
          R&amp;J
        </div>
        <h1>Nosso Casório</h1>
        <p className="sub">Entre para organizar o casamento, a dois.</p>

        <form action={entrarComGoogle}>
          <button type="submit" className="btn-google btn-block">
            <GoogleIcon />
            Entrar com Google
          </button>
        </form>

        <div className="divisor">
          <span>ou com e-mail</span>
        </div>

        <form action={entrarComSenha} className="coluna">
          <input
            type="email"
            name="email"
            placeholder="voce@email.com"
            required
            autoComplete="email"
          />
          <input
            type="password"
            name="senha"
            placeholder="senha (mín. 6)"
            required
            minLength={6}
            autoComplete="current-password"
          />
          <div className="linha">
            <button type="submit">Entrar</button>
            <button type="submit" formAction={cadastrarComSenha} className="leve">
              Criar conta
            </button>
          </div>
        </form>

        {sp.confirme && (
          <p className="ok">
            ✅ Conta criada! Enviamos um link de confirmação pro seu e-mail. Confirme e depois
            entre. <b>Olhe também o spam.</b>
          </p>
        )}
        {sp.reenviado && (
          <p className="ok">📨 E-mail de confirmação reenviado. Olhe a caixa de entrada (e o spam).</p>
        )}
        {sp.erro && <p className="erro">⚠️ {sp.erro}</p>}

        {precisaConfirmar && (
          <details className="reenviar-confirmacao" open={sp.confirmar === "1"}>
            <summary>Não recebeu o e-mail de confirmação?</summary>
            <form action={reenviarConfirmacao} className="coluna" style={{ marginTop: "0.6rem" }}>
              <input
                type="email"
                name="email"
                placeholder="seu e-mail"
                required
                autoComplete="email"
              />
              <button type="submit" className="leve">
                Reenviar confirmação
              </button>
            </form>
          </details>
        )}

        <p className="sub mini" style={{ marginTop: "1rem", textAlign: "center" }}>
          <Link href="/ajuda">📖 Como funciona o app</Link>
        </p>
      </div>
    </main>
  );
}

/** Logo do Google (multicolor) pro botão de login. */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
