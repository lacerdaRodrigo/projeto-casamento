"use client";
// Compositor de adição: fechado por padrão (só um botão "+ X"). Clicou, abre o
// formulário COMPLETO — nome + tem custo (com valor) + ⭐ essencial + Salvar.
// Usado pra tema, subtema e item, no painel e na tela Montar.
//
// Depois de salvar, a action redireciona e a página recarrega — o compositor
// volta fechado sozinho. Quer adicionar outro? Clica no "+" de novo.
import { useState } from "react";
import { CampoDinheiro } from "./campo-dinheiro";
import { SubmitButton } from "./submit-button";

export interface CampoOculto {
  name: string;
  value: string;
}

export function Compositor({
  action,
  ocultos,
  campoNome,
  placeholder,
  rotuloAbrir,
  comCustoEssencial = true,
}: {
  /** Server action que grava (recebe o FormData). */
  action: (formData: FormData) => Promise<void>;
  /** Campos escondidos: voltarPara, casorioId, temaId, subtemaId… */
  ocultos: CampoOculto[];
  /** Nome do campo de texto no FormData ("nome" ou "titulo"). */
  campoNome: string;
  placeholder: string;
  /** Texto do botão fechado ("+ Subtema", "+ Item", "+ Novo tema"). */
  rotuloAbrir: string;
  /** Mostra tem custo/valor/essencial (default true). */
  comCustoEssencial?: boolean;
}) {
  const [aberto, setAberto] = useState(false);

  if (!aberto) {
    return (
      <button type="button" className="btn-add" onClick={() => setAberto(true)}>
        {rotuloAbrir}
      </button>
    );
  }

  return (
    <form action={action} className="compositor">
      {ocultos.map((o) => (
        <input key={o.name} type="hidden" name={o.name} value={o.value} />
      ))}
      <div className="compositor-linha1">
        <input
          name={campoNome}
          placeholder={placeholder}
          required
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
        <SubmitButton mensagemSucesso="Adicionado" onConcluir={() => setAberto(false)}>
          Salvar
        </SubmitButton>
        <button type="button" className="leve" onClick={() => setAberto(false)}>
          Cancelar
        </button>
      </div>

      {comCustoEssencial && (
        <div className="compositor-controles">
          <label className="linha mini">
            <input type="checkbox" name="temCusto" /> tem custo
          </label>
          <span className="so-com-custo">
            <CampoDinheiro
              name="custoEstimadoCentavos"
              placeholder="valor estimado R$"
              aria-label="Valor estimado"
            />
          </span>
          <label className="linha mini">
            <input type="checkbox" name="essencial" /> ⭐ essencial
          </label>
        </div>
      )}
    </form>
  );
}
