import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { cadastrarComSenha, entrarComSenha, reenviarConfirmacao } from "./actions";

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
