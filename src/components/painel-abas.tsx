"use client";
// Abas de tema + visão geral com troca INSTANTÂNEA no cliente.
//
// Por quê client: trocar de aba não muda dado — só a vista. Antes cada aba era
// um <Link> que re-rodava auth + getArvore no Supabase a cada clique (4-5s).
// Agora o servidor renderiza a visão geral e TODOS os temas uma vez; aqui só
// mostramos o ativo. Sem ida ao servidor, sem refetch.
//
// A URL (?aba=) é atualizada por history.replaceState (sem navegar), pra a aba
// sobreviver a um F5 e pra os forms de dentro do tema (que já vêm com
// voltarPara=/?aba=<id>) devolverem o casal ao mesmo lugar após salvar.
import { useState, type ReactNode } from "react";

export interface AbaInfo {
  id: string;
  nome: string;
  atrasados: number;
}

export interface CardTema {
  id: string;
  nome: string;
  percentual: number;
  resolvidos: number;
  total: number;
  estimado: string | null;
  essenciaisPendentes: number;
  atrasados: number;
}

export interface TemaRenderizado {
  id: string;
  nome: string;
  visiveis: number;
  node: ReactNode;
}

export function PainelAbas({
  initialAba,
  abas,
  cards,
  temas,
}: {
  initialAba: string;
  abas: AbaInfo[];
  cards: CardTema[];
  temas: TemaRenderizado[];
}) {
  const [aba, setAba] = useState(initialAba);

  function ir(id: string) {
    setAba(id);
    const url = id === "overview" ? "/" : `/?aba=${id}`;
    try {
      window.history.replaceState(null, "", url);
    } catch {
      /* ambientes sem history: só não persiste na URL */
    }
  }

  const temaAtivo = aba === "overview" ? null : temas.find((t) => t.id === aba);

  return (
    <>
      <nav className="abas" aria-label="Temas">
        <button
          type="button"
          onClick={() => ir("overview")}
          className={`aba ${aba === "overview" ? "ativa" : ""}`}
          aria-current={aba === "overview" ? "page" : undefined}
        >
          Visão geral
        </button>
        {abas.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => ir(a.id)}
            className={`aba ${aba === a.id ? "ativa" : ""}`}
            aria-current={aba === a.id ? "page" : undefined}
          >
            {a.nome}
            {a.atrasados > 0 && <span className="aba-badge">{a.atrasados}</span>}
          </button>
        ))}
      </nav>

      {aba === "overview" && (
        <div className="overview-grid">
          {cards.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => ir(c.id)}
              className="overview-card"
            >
              <div className="oc-topo">
                <span className="oc-nome">{c.nome}</span>
                <span className="oc-pct">{c.percentual}%</span>
              </div>
              <span className="oc-barra" aria-hidden="true">
                <span style={{ width: `${c.percentual}%` }} />
              </span>
              <span className="oc-meta">
                {c.resolvidos}/{c.total} resolvidos
                {c.estimado && <> · {c.estimado}</>}
              </span>
              <div className="oc-marcas">
                {c.essenciaisPendentes > 0 && (
                  <span className="ess">★ {c.essenciaisPendentes} essenciais</span>
                )}
                {c.atrasados > 0 && <span className="atr">⏰ {c.atrasados} atrasados</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {temaAtivo && (
        <>
          <div className="lista-titulo">
            <h2>{temaAtivo.nome}</h2>
            <span className="contagem">
              {temaAtivo.visiveis} {temaAtivo.visiveis === 1 ? "item" : "itens"}
            </span>
          </div>
          {temaAtivo.node}
        </>
      )}
    </>
  );
}
