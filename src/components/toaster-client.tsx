"use client";
// Toaster 100% client: mostra o "verde" de sucesso SEM navegar. Qualquer lugar
// dispara com dispararToast(); este componente (montado no layout) escuta e
// renderiza. Empilha e some sozinho.
import { useEffect, useState } from "react";

interface ToastItem {
  id: number;
  tipo: "ok" | "erro";
  mensagem: string;
}

let seq = 0;

/** Dispara um toast de qualquer client component (ex.: ao concluir um save). */
export function dispararToast(mensagem: string, tipo: "ok" | "erro" = "ok") {
  window.dispatchEvent(new CustomEvent("casorio:toast", { detail: { mensagem, tipo } }));
}

export function ToasterClient() {
  const [itens, setItens] = useState<ToastItem[]>([]);

  useEffect(() => {
    function aoReceber(e: Event) {
      const { mensagem, tipo } = (e as CustomEvent<{ mensagem: string; tipo: "ok" | "erro" }>)
        .detail;
      const id = ++seq;
      setItens((l) => [...l, { id, tipo, mensagem }]);
      window.setTimeout(() => setItens((l) => l.filter((t) => t.id !== id)), 3200);
    }
    window.addEventListener("casorio:toast", aoReceber);
    return () => window.removeEventListener("casorio:toast", aoReceber);
  }, []);

  if (itens.length === 0) return null;

  return (
    <div className="toaster" role="status" aria-live="polite">
      {itens.map((t) => (
        <div key={t.id} className={`toaster-item ${t.tipo}`}>
          <span>
            {t.tipo === "erro" ? "⚠️" : "✅"} {t.mensagem}
          </span>
          <button
            type="button"
            className="toaster-fechar"
            aria-label="Fechar aviso"
            onClick={() => setItens((l) => l.filter((x) => x.id !== t.id))}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
