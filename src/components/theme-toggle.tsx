"use client";
// Alterna claro/escuro. Grava em localStorage e reflete no <html data-theme>.
// O tema inicial já foi aplicado por um script inline no layout (sem flash);
// aqui só espelhamos o estado atual e trocamos no clique.
import { useEffect, useState } from "react";

type Tema = "escuro" | "claro";

export function ThemeToggle() {
  const [tema, setTema] = useState<Tema>("escuro");

  // lê o que o script inline já decidiu, pra o botão nascer coerente
  useEffect(() => {
    const atual = document.documentElement.dataset.theme;
    setTema(atual === "claro" ? "claro" : "escuro");
  }, []);

  function alternar() {
    const proximo: Tema = tema === "escuro" ? "claro" : "escuro";
    document.documentElement.dataset.theme = proximo;
    try {
      localStorage.setItem("tema", proximo);
    } catch {
      /* modo privado: só não persiste */
    }
    setTema(proximo);
  }

  const proximoLabel = tema === "escuro" ? "claro" : "escuro";
  return (
    <button
      type="button"
      className="btn-tema"
      onClick={alternar}
      aria-label={`Mudar para tema ${proximoLabel}`}
      title={`Tema ${proximoLabel}`}
    >
      {tema === "escuro" ? "☀️" : "🌙"}
    </button>
  );
}
