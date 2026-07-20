// Progresso da árvore (RF11) — núcleo puro. Base do resumo por tema e, depois,
// do painel geral. Descartados ficam fora da conta (RN08/RN23).
import { isResolvido, type StatusItem } from "./status";

export interface ItemProgresso {
  temCusto: boolean;
  status: StatusItem;
  essencial: boolean;
}

export interface Progresso {
  /** Itens que contam (descartados excluídos). */
  total: number;
  resolvidos: number;
  /** 0–100, arredondado. Sem itens = 0 (nada de divisão por zero). */
  percentual: number;
  /** Essenciais ainda não resolvidos — o que mais importa (RN24). */
  essenciaisPendentes: number;
}

/** Item entra na conta de progresso? Descartado não (RN23). */
function contaNoProgresso(item: ItemProgresso): boolean {
  return item.status !== "descartado";
}

export function progressoDe(itens: readonly ItemProgresso[]): Progresso {
  const ativos = itens.filter(contaNoProgresso);
  const resolvidos = ativos.filter((i) => isResolvido(i.status, i.temCusto)).length;
  const total = ativos.length;

  return {
    total,
    resolvidos,
    percentual: total === 0 ? 0 : Math.round((resolvidos / total) * 100),
    essenciaisPendentes: ativos.filter(
      (i) => i.essencial && !isResolvido(i.status, i.temCusto),
    ).length,
  };
}
