import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nosso Casório 💍",
  description: "Organize o casamento numa árvore Tema → Subtema → Item.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const versao = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
  return (
    <html lang="pt-BR">
      {/* suppressHydrationWarning: extensões de navegador (ex.: Bitdefender)
          injetam atributos no <body> antes do React hidratar. */}
      <body suppressHydrationWarning>
        {children}
        <footer className="rodape">Nosso Casório · v{versao}</footer>
      </body>
    </html>
  );
}
