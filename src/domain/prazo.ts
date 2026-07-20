// C3 — Motor de Prazos (PRD §6). Núcleo PURO: recebe o "hoje" injetado (D08),
// nunca lê o relógio aqui. Comparação por DATA (yyyy-mm-dd) — o fuso
// America/Sao_Paulo é resolvido na borda, antes de chamar estas funções.
//
// Onde este componente costuma errar:
//  - usar hora em vez de data (item vence "amanhã de manhã"?)
//  - marcar como atrasado algo que já está resolvido
//  - esquecer que item descartado sai de todos os painéis (RN23)
//  - errar as bordas: hoje ainda não venceu; o 7º dia ainda é "a vencer"
import { isResolvido, type StatusItem } from "./status";

/** Janela de "está chegando" (RN17). */
export const DIAS_A_VENCER = 7;

export interface ItemPrazo {
  temCusto: boolean;
  status: StatusItem;
  /** yyyy-mm-dd, ou null quando não tem prazo. */
  dataAlvo: string | null;
}

export type SituacaoPrazo =
  /** Fora de tudo — não vai ter (RN23). */
  | "descartado"
  /** Já resolvido: nunca atrasa (RN16). */
  | "resolvido"
  /** Sem data-alvo: não dá pra cobrar prazo. */
  | "sem_data"
  /** Data já passou e não resolveu (RN16). */
  | "atrasado"
  /** Vence nos próximos 7 dias (RN17). */
  | "a_vencer"
  /** Tem data, mas ainda dá tempo. */
  | "ok";

/** Dias inteiros de hojeISO até alvoISO (negativo = já passou). Ambos yyyy-mm-dd. */
export function diasEntre(hojeISO: string, alvoISO: string): number {
  const MS_DIA = 86_400_000;
  const a = Date.parse(`${hojeISO}T00:00:00Z`);
  const b = Date.parse(`${alvoISO}T00:00:00Z`);
  return Math.round((b - a) / MS_DIA);
}

/** Classifica o item quanto ao prazo (RN16/RN17). */
export function classificarPrazo(item: ItemPrazo, hojeISO: string): SituacaoPrazo {
  if (item.status === "descartado") return "descartado";
  if (isResolvido(item.status, item.temCusto)) return "resolvido";
  if (!item.dataAlvo) return "sem_data";

  const dias = diasEntre(hojeISO, item.dataAlvo);
  if (dias < 0) return "atrasado"; // venceu ontem ou antes
  if (dias <= DIAS_A_VENCER) return "a_vencer"; // hoje conta como a vencer
  return "ok";
}

/** Item atrasado (RN16). */
export function isAtrasado(item: ItemPrazo, hojeISO: string): boolean {
  return classificarPrazo(item, hojeISO) === "atrasado";
}

/** Item a vencer nos próximos 7 dias (RN17). */
export function isAVencer(item: ItemPrazo, hojeISO: string): boolean {
  return classificarPrazo(item, hojeISO) === "a_vencer";
}

export interface PainelPrazos {
  atrasados: number;
  aVencer: number;
  /** Itens com prazo que ainda não foram resolvidos (base dos dois acima). */
  comPrazoPendente: number;
}

export function calcularPainelPrazos(
  itens: readonly ItemPrazo[],
  hojeISO: string,
): PainelPrazos {
  let atrasados = 0;
  let aVencer = 0;
  let comPrazoPendente = 0;

  for (const item of itens) {
    const situacao = classificarPrazo(item, hojeISO);
    if (situacao === "atrasado") atrasados++;
    if (situacao === "a_vencer") aVencer++;
    if (situacao === "atrasado" || situacao === "a_vencer" || situacao === "ok") {
      comPrazoPendente++;
    }
  }

  return { atrasados, aVencer, comPrazoPendente };
}
