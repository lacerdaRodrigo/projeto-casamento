// Filtros da árvore (RF13) — núcleo puro, sem infra.
// Reusa `isResolvido` (domain/status) em vez de reimplementar a regra RN08.
import type { SubtemaComItens, TemaComFilhos } from "./entities";
import { isResolvido } from "./status";
import { classificarPrazo } from "./prazo";

export type Situacao = "todos" | "pendentes" | "resolvidos";
export type FiltroPrazo = "todos" | "atrasados" | "a_vencer";

export interface Filtros {
  situacao: Situacao;
  somenteEssenciais: boolean;
  /** Id do tema, ou null pra todos. */
  temaId: string | null;
  /** Recorte por prazo (RN16/RN17) — precisa do "hoje" injetado. */
  prazo: FiltroPrazo;
}

export const FILTROS_VAZIOS: Filtros = {
  situacao: "todos",
  somenteEssenciais: false,
  temaId: null,
  prazo: "todos",
};

/** Tem algum filtro ligado? (a UI abre os temas automaticamente quando sim) */
export function filtroAtivo(f: Filtros): boolean {
  return (
    f.situacao !== "todos" || f.somenteEssenciais || f.temaId !== null || f.prazo !== "todos"
  );
}

/** Quantos itens a árvore tem no total. */
export function contarItens(arvore: readonly TemaComFilhos[]): number {
  return arvore.reduce(
    (n, tema) => n + tema.subtemas.reduce((m, sub) => m + sub.itens.length, 0),
    0,
  );
}

function itemPassa(
  item: SubtemaComItens["itens"][number],
  f: Filtros,
  hojeISO: string,
): boolean {
  if (f.somenteEssenciais && !item.essencial) return false;

  if (f.prazo !== "todos") {
    const situacao = classificarPrazo(item, hojeISO);
    if (f.prazo === "atrasados" && situacao !== "atrasado") return false;
    if (f.prazo === "a_vencer" && situacao !== "a_vencer") return false;
  }

  if (f.situacao === "todos") return true;
  const resolvido = isResolvido(item.status, item.temCusto);
  return f.situacao === "resolvidos" ? resolvido : !resolvido;
}

/**
 * Aplica os filtros devolvendo uma árvore NOVA (não mexe na original).
 * Subtemas e temas que ficarem sem item são descartados — não faz sentido
 * mostrar um tema vazio como resultado de busca.
 */
export function filtrarArvore(
  arvore: readonly TemaComFilhos[],
  f: Filtros,
  hojeISO: string,
): TemaComFilhos[] {
  return arvore
    .filter((tema) => f.temaId === null || tema.id === f.temaId)
    .map((tema) => ({
      ...tema,
      subtemas: tema.subtemas
        .map((sub) => ({ ...sub, itens: sub.itens.filter((i) => itemPassa(i, f, hojeISO)) }))
        .filter((sub) => sub.itens.length > 0),
    }))
    .filter((tema) => tema.subtemas.length > 0);
}
