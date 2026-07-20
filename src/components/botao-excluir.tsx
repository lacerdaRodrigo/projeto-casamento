"use client";
// Botão 🗑️ com confirmação explícita antes de apagar (RN03 — a cascata leva os
// filhos junto). O texto do aviso vem pronto do servidor, com a contagem real.

export function BotaoExcluir({ aviso, titulo }: { aviso: string; titulo: string }) {
  return (
    <button
      type="submit"
      className="excluir"
      title={titulo}
      aria-label={titulo}
      onClick={(e) => {
        if (!window.confirm(aviso)) e.preventDefault();
      }}
    >
      🗑️
    </button>
  );
}
