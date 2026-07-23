"use client";
// Coluna direita do item: valor (estimado × real) em cima e, abaixo, os ícones
// ✏️ Editar e 🗑️ Excluir. O ✏️ abre/fecha o editor, que aparece em LARGURA
// TOTAL embaixo da linha (recebido como `editor`).
import { useEffect, useState, type ReactNode } from "react";
import { BotaoExcluir } from "./botao-excluir";
import { ValorItem } from "./valor-item";
import { excluirItemAction } from "@/app/actions";

export function AcoesItem({
  itemId,
  titulo,
  temCusto,
  custoEstimado,
  custoReal,
  voltarPara,
  editor,
}: {
  itemId: string;
  titulo: string;
  temCusto: boolean;
  custoEstimado: number;
  custoReal: number;
  voltarPara: string;
  editor: ReactNode;
}) {
  const [editando, setEditando] = useState(false);

  // fecha o editor quando QUALQUER "Salvar" deste item concluir (status rápido
  // ou "Salvar item") — some o modal grande depois de salvar.
  useEffect(() => {
    function aoSalvar(e: Event) {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (id === itemId) setEditando(false);
    }
    window.addEventListener("casorio:fechar-item", aoSalvar);
    return () => window.removeEventListener("casorio:fechar-item", aoSalvar);
  }, [itemId]);

  return (
    <>
      <div className="item-lado">
        <ValorItem temCusto={temCusto} custoEstimado={custoEstimado} custoReal={custoReal} />
        <div className="item-acoes">
          <button
            type="button"
            className="btn-icone"
            aria-expanded={editando}
            aria-label="Editar item"
            title="Editar"
            onClick={() => setEditando((v) => !v)}
          >
            ✏️
          </button>
          <form action={excluirItemAction}>
            <input type="hidden" name="voltarPara" value={voltarPara} />
            <input type="hidden" name="itemId" value={itemId} />
            <BotaoExcluir
              titulo={`Excluir item ${titulo}`}
              aviso={`Apagar o item "${titulo}"?\n\nIsso não tem volta.`}
            />
          </form>
        </div>
      </div>

      {editando && <div className="item-editor">{editor}</div>}
    </>
  );
}
