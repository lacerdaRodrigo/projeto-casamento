"use client";
// Ações do tema (renomear + excluir) coladas no NOME, dentro do <summary> do
// tema. stopPropagation impede que o clique aqui abra/feche o <details>.
import { useState } from "react";
import { BotaoExcluir } from "./botao-excluir";
import { SubmitButton } from "./submit-button";
import { renomearTemaAction, excluirTemaAction } from "@/app/actions";

export function AcoesTema({
  temaId,
  temaNome,
  voltarPara,
  avisoExcluir,
}: {
  temaId: string;
  temaNome: string;
  voltarPara: string;
  avisoExcluir: string;
}) {
  const [renomeando, setRenomeando] = useState(false);

  return (
    <span className="acoes-tema" onClick={(e) => e.stopPropagation()}>
      {renomeando ? (
        <form action={renomearTemaAction} className="linha mini renome-inline">
          <input type="hidden" name="voltarPara" value={voltarPara} />
          <input type="hidden" name="temaId" value={temaId} />
          <input
            name="nome"
            defaultValue={temaNome}
            required
            aria-label="Novo nome do tema"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          <SubmitButton mensagemSucesso="Tema renomeado" onConcluir={() => setRenomeando(false)}>
            Salvar
          </SubmitButton>
          <button type="button" className="leve" onClick={() => setRenomeando(false)}>
            Cancelar
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="btn-icone"
          title="Renomear tema"
          aria-label="Renomear tema"
          onClick={() => setRenomeando(true)}
        >
          ✏️
        </button>
      )}

      <form action={excluirTemaAction}>
        <input type="hidden" name="voltarPara" value={voltarPara} />
        <input type="hidden" name="temaId" value={temaId} />
        <BotaoExcluir titulo={`Excluir tema ${temaNome}`} aviso={avisoExcluir} />
      </form>
    </span>
  );
}
