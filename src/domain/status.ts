// C2 — Máquina de Status do Item (núcleo puro). PRD §6, RN05–08, RN23.
// Zero dependência de infra. Regras garantidas também no banco (CHECK) — defesa em profundidade.

import type { Centavos } from "./money";

export type StatusItem =
  | "a_fazer"
  | "feito"
  | "a_decidir"
  | "decidido"
  | "contratado"
  | "pago"
  | "descartado";

export const STATUS_SEM_CUSTO = ["a_fazer", "feito"] as const;
export const STATUS_COM_CUSTO = ["a_decidir", "decidido", "contratado", "pago"] as const;

/** Status válido pro tipo do item (RN05). "descartado" vale pra qualquer um (RN23). */
export function statusValidoParaTipo(status: StatusItem, temCusto: boolean): boolean {
  if (status === "descartado") return true;
  return temCusto
    ? (STATUS_COM_CUSTO as readonly string[]).includes(status)
    : (STATUS_SEM_CUSTO as readonly string[]).includes(status);
}

/** Status inicial ao criar/converter (RN05). */
export function statusInicial(temCusto: boolean): StatusItem {
  return temCusto ? "a_decidir" : "a_fazer";
}

/** Status que exigem custo real > 0 (RN06). */
export function exigeCustoReal(status: StatusItem): boolean {
  return status === "contratado" || status === "pago";
}

/** Item "resolvido" (RN08): pago (com custo) ou feito (sem custo). Descartado NÃO conta. */
export function isResolvido(status: StatusItem, temCusto: boolean): boolean {
  return temCusto ? status === "pago" : status === "feito";
}

export type ResultadoTransicao = { ok: true } | { ok: false; erro: string };

/**
 * Valida uma transição de status (RN05/06/07). Ordem é livre (RN07) — só
 * checa validade pro tipo e a exigência de custo real (RN06).
 */
export function validarTransicao(params: {
  temCusto: boolean;
  novoStatus: StatusItem;
  custoRealCentavos: Centavos;
}): ResultadoTransicao {
  const { temCusto, novoStatus, custoRealCentavos } = params;

  if (!statusValidoParaTipo(novoStatus, temCusto)) {
    return {
      ok: false,
      erro: `Status "${novoStatus}" inválido para item ${temCusto ? "com" : "sem"} custo (RN05).`,
    };
  }
  if (exigeCustoReal(novoStatus) && custoRealCentavos <= 0) {
    return {
      ok: false,
      erro: `Status "${novoStatus}" exige custo real preenchido (> 0) (RN06).`,
    };
  }
  return { ok: true };
}

/**
 * Conversão ao trocar tem_custo (C2). Custos são preservados no banco, só ocultos;
 * aqui devolvemos só o novo status coerente:
 *  - pago/contratado -> feito ; demais -> a_fazer   (ao virar SEM custo)
 *  - qualquer -> a_decidir                          (ao virar COM custo)
 */
export function converterAoTrocarTemCusto(
  statusAtual: StatusItem,
  novoTemCusto: boolean,
): StatusItem {
  if (statusAtual === "descartado") return "descartado";
  if (novoTemCusto) return "a_decidir";
  return statusAtual === "pago" || statusAtual === "contratado" ? "feito" : "a_fazer";
}
