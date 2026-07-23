import type { Metadata } from "next";
import "./globals.css";
import { ToasterClient } from "@/components/toaster-client";
import { version } from "../../package.json";

export const metadata: Metadata = {
  title: "Nosso Casório 💍",
  description: "Organize o casamento numa árvore Tema → Subtema → Item.",
};

// Aplica o tema salvo ANTES do primeiro paint, pra não piscar. Default: escuro
// (o alvo do redesign). Roda como primeiro nó do <html>, antes do body pintar.
const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem('tema');document.documentElement.dataset.theme=t==='claro'?'claro':'escuro';}catch(e){document.documentElement.dataset.theme='escuro';}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // versão do package.json (o semantic-release bumpa/commita sozinho no CI);
  // env var opcional pode sobrescrever.
  const versao = process.env.NEXT_PUBLIC_APP_VERSION ?? version;
  return (
    <html lang="pt-BR" data-theme="escuro" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      {/* suppressHydrationWarning: extensões de navegador (ex.: Bitdefender)
          injetam atributos no <body> antes do React hidratar. */}
      <body suppressHydrationWarning>
        {children}
        <ToasterClient />
        <footer className="rodape">Nosso Casório · v{versao}</footer>
      </body>
    </html>
  );
}
