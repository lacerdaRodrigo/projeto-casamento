import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { cadastrarComSenha, entrarComSenha } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; confirme?: string }>;
}) {
  const sp = await searchParams;

  return (
    <main className="centro">
      <div className="cartao">
        <div className="app-header-acoes" style={{ justifyContent: "flex-end", marginBottom: "0.5rem" }}>
          <ThemeToggle />
        </div>
        <div className="avatar lg" aria-hidden="true">
          R&amp;J
        </div>
        <h1>Nosso Casório</h1>
        <p className="sub">Entre para organizar o casamento, a dois.</p>

        {/* Magic link desativado por ora (rate limit do free-tier).
            Volta antes de produção — ver docs/pendencias.md */}
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

        {sp.confirme && <p className="ok">✅ Conta criada! Confirme pelo e-mail para entrar.</p>}
        {sp.erro && <p className="erro">⚠️ {sp.erro}</p>}

        <p className="sub mini" style={{ marginTop: "1rem", textAlign: "center" }}>
          <Link href="/ajuda">📖 Como funciona o app</Link>
        </p>
      </div>
    </main>
  );
}
