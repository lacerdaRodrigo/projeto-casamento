"use client";
// Botão 🗑️ com confirmação explícita antes de apagar (RN03 — a cascata leva os
// filhos junto). O texto do aviso vem pronto do servidor, com a contagem real.
//
// O toast é OTIMISTA (dispara ao confirmar): no sucesso a exclusão remove o
// próprio botão da tela, então não dá pra esperar o fim aqui. Se der erro, a
// action redireciona com ?erro= e o aviso vermelho aparece por cima.
import { dispararToast } from "./toaster-client";

export function BotaoExcluir({
  aviso,
  titulo,
  mensagemSucesso = "Excluído",
}: {
  aviso: string;
  titulo: string;
  mensagemSucesso?: string | null;
}) {
  return (
    <button
      type="submit"
      className="excluir"
      title={titulo}
      aria-label={titulo}
      onClick={(e) => {
        if (!window.confirm(aviso)) {
          e.preventDefault();
          return;
        }
        if (mensagemSucesso) dispararToast(mensagemSucesso, "ok");
      }}
    >
      🗑️
    </button>
  );
}
