// C1 — Motor Financeiro (o componente mais crítico, PRD §6). Núcleo PURO.
// Regras RN11–RN15. Tudo em CENTAVOS (inteiro) — nunca float (D08).
//
// Onde este componente costuma errar (e por isso é testado a fundo):
//  - somar item descartado (RN12/RN23)
//  - trocar os status que contam em Comprometido e Pago (RN13/RN14)
//  - somar 0 em silêncio quando o item tem custo mas ninguém pôs preço
//  - arredondamento de float (resolvido usando centavos inteiros)

import type { Centavos } from "./money";
import type { StatusItem } from "./status";

/** O mínimo que o motor precisa saber de um item. */
export interface ItemFinanceiro {
  titulo?: string;
  temCusto: boolean;
  status: StatusItem;
  custoEstimado: Centavos;
  custoReal: Centavos;
}

export interface PainelFinanceiro {
  /** Teto planejado (RN09). */
  orcamento: Centavos;
  /**
   * O casal já definiu um teto? Orçamento 0 significa "ainda não definiu", não
   * "quer gastar zero" — ninguém casa com orçamento zero. Sem isso, qualquer
   * despesa dispararia o alerta de estouro pra quem só não preencheu ainda.
   */
  orcamentoDefinido: boolean;
  /** Soma do custo efetivo de TODOS os itens com custo ativos (RN12). */
  estimadoTotal: Centavos;
  /** Custo efetivo dos itens contratados ou pagos (RN14). */
  comprometido: Centavos;
  /** Custo real dos itens pagos (RN13). */
  pago: Centavos;
  /** Orçamento − Estimado total (RN15). Negativo = estourou. */
  saldo: Centavos;
  /** Estimado total passou do orçamento (RN15). Só vale se houver orçamento. */
  estourou: boolean;
  /** Itens com custo, ativos, mas sem nenhum valor informado. */
  semPreco: number;
}

/** Item entra nas contas? Precisa ter custo e não estar descartado (RN12/RN23). */
export function contaNoDinheiro(item: ItemFinanceiro): boolean {
  return item.temCusto && item.status !== "descartado";
}

/** Custo efetivo: real quando houver, senão o estimado (RN11). */
export function custoEfetivo(item: ItemFinanceiro): Centavos {
  return item.custoReal > 0 ? item.custoReal : item.custoEstimado;
}

/** Item com custo e ativo, mas sem preço nenhum — não pode somar 0 calado. */
export function semPreco(item: ItemFinanceiro): boolean {
  return contaNoDinheiro(item) && custoEfetivo(item) === 0;
}

const soma = (n: number[]): Centavos => n.reduce((a, b) => a + b, 0);

/**
 * Calcula o painel financeiro (RN11–RN15).
 * Invariantes garantidas: `pago ≤ comprometido ≤ estimadoTotal` e
 * `saldo = orcamento − estimadoTotal`.
 */
export function calcularPainelFinanceiro(
  itens: readonly ItemFinanceiro[],
  orcamento: Centavos,
): PainelFinanceiro {
  const ativos = itens.filter(contaNoDinheiro);

  const estimadoTotal = soma(ativos.map(custoEfetivo));

  const comprometido = soma(
    ativos.filter((i) => i.status === "contratado" || i.status === "pago").map(custoEfetivo),
  );

  const pago = soma(ativos.filter((i) => i.status === "pago").map((i) => i.custoReal));

  const orcamentoDefinido = orcamento > 0;

  return {
    orcamento,
    orcamentoDefinido,
    estimadoTotal,
    comprometido,
    pago,
    saldo: orcamento - estimadoTotal,
    // sem orçamento definido não há do que estourar — seria alarme falso
    estourou: orcamentoDefinido && estimadoTotal > orcamento,
    semPreco: ativos.filter(semPreco).length,
  };
}
