import { describe, it, expect } from "vitest";
import {
  calcularPainelPrazos,
  classificarPrazo,
  diasEntre,
  DIAS_A_VENCER,
  isAtrasado,
  isAVencer,
  type ItemPrazo,
} from "./prazo";
import type { StatusItem } from "./status";

const HOJE = "2026-07-19";

function item(p: {
  dataAlvo?: string | null;
  status?: StatusItem;
  temCusto?: boolean;
} = {}): ItemPrazo {
  return {
    dataAlvo: p.dataAlvo ?? null,
    status: p.status ?? "a_fazer",
    temCusto: p.temCusto ?? false,
  };
}

describe("diasEntre", () => {
  it("conta dias pra frente e pra trás", () => {
    expect(diasEntre(HOJE, "2026-07-19")).toBe(0);
    expect(diasEntre(HOJE, "2026-07-20")).toBe(1);
    expect(diasEntre(HOJE, "2026-07-18")).toBe(-1);
    expect(diasEntre(HOJE, "2026-07-26")).toBe(7);
  });

  it("atravessa virada de mês e de ano", () => {
    expect(diasEntre("2026-07-31", "2026-08-01")).toBe(1);
    expect(diasEntre("2026-12-31", "2027-01-01")).toBe(1);
    expect(diasEntre("2026-01-01", "2026-12-31")).toBe(364);
  });

  it("lida com ano bissexto", () => {
    expect(diasEntre("2028-02-28", "2028-03-01")).toBe(2); // 2028 tem 29/02
    expect(diasEntre("2026-02-28", "2026-03-01")).toBe(1);
  });

  it("não é afetado por horário de verão (compara data pura, em UTC)", () => {
    // outubro é quando historicamente virava o horário de verão no Brasil
    expect(diasEntre("2026-10-17", "2026-10-19")).toBe(2);
  });
});

describe("classificarPrazo — bordas do atraso (RN16)", () => {
  it("vence HOJE ainda não está atrasado", () => {
    expect(classificarPrazo(item({ dataAlvo: HOJE }), HOJE)).toBe("a_vencer");
  });

  it("venceu ONTEM está atrasado", () => {
    expect(classificarPrazo(item({ dataAlvo: "2026-07-18" }), HOJE)).toBe("atrasado");
  });

  it("venceu há meses continua atrasado", () => {
    expect(classificarPrazo(item({ dataAlvo: "2026-01-10" }), HOJE)).toBe("atrasado");
  });
});

describe("classificarPrazo — bordas da janela de 7 dias (RN17)", () => {
  it("amanhã está a vencer", () => {
    expect(classificarPrazo(item({ dataAlvo: "2026-07-20" }), HOJE)).toBe("a_vencer");
  });

  it("exatamente no 7º dia AINDA é a vencer", () => {
    expect(classificarPrazo(item({ dataAlvo: "2026-07-26" }), HOJE)).toBe("a_vencer");
    expect(diasEntre(HOJE, "2026-07-26")).toBe(DIAS_A_VENCER);
  });

  it("no 8º dia já é só 'ok' (ainda dá tempo)", () => {
    expect(classificarPrazo(item({ dataAlvo: "2026-07-27" }), HOJE)).toBe("ok");
  });

  it("daqui a meses é 'ok'", () => {
    expect(classificarPrazo(item({ dataAlvo: "2027-05-15" }), HOJE)).toBe("ok");
  });
});

describe("classificarPrazo — quem NÃO entra na cobrança", () => {
  it("sem data-alvo não tem prazo a cobrar", () => {
    expect(classificarPrazo(item({ dataAlvo: null }), HOJE)).toBe("sem_data");
  });

  it("item RESOLVIDO nunca atrasa, mesmo com data vencida (RN16)", () => {
    expect(classificarPrazo(item({ dataAlvo: "2026-01-01", status: "feito" }), HOJE)).toBe(
      "resolvido",
    );
    expect(
      classificarPrazo(item({ dataAlvo: "2026-01-01", status: "pago", temCusto: true }), HOJE),
    ).toBe("resolvido");
  });

  it("item DESCARTADO sai de tudo, mesmo vencido (RN23)", () => {
    expect(classificarPrazo(item({ dataAlvo: "2026-01-01", status: "descartado" }), HOJE)).toBe(
      "descartado",
    );
  });

  it("contratado ainda não é resolvido — pode atrasar", () => {
    expect(
      classificarPrazo(
        item({ dataAlvo: "2026-07-01", status: "contratado", temCusto: true }),
        HOJE,
      ),
    ).toBe("atrasado");
  });
});

describe("isAtrasado / isAVencer", () => {
  it("respondem em booleano", () => {
    expect(isAtrasado(item({ dataAlvo: "2026-07-18" }), HOJE)).toBe(true);
    expect(isAtrasado(item({ dataAlvo: "2026-07-20" }), HOJE)).toBe(false);
    expect(isAVencer(item({ dataAlvo: "2026-07-20" }), HOJE)).toBe(true);
    expect(isAVencer(item({ dataAlvo: "2026-07-18" }), HOJE)).toBe(false);
  });

  it("resolvido não é nem atrasado nem a vencer", () => {
    const resolvido = item({ dataAlvo: "2026-07-18", status: "feito" });
    expect(isAtrasado(resolvido, HOJE)).toBe(false);
    expect(isAVencer(resolvido, HOJE)).toBe(false);
  });
});

describe("calcularPainelPrazos (RF10)", () => {
  it("lista vazia zera tudo", () => {
    expect(calcularPainelPrazos([], HOJE)).toEqual({
      atrasados: 0,
      aVencer: 0,
      comPrazoPendente: 0,
    });
  });

  it("conta atrasados e a vencer, ignorando quem não entra", () => {
    const painel = calcularPainelPrazos(
      [
        item({ dataAlvo: "2026-07-10" }), //                         atrasado
        item({ dataAlvo: "2026-07-18" }), //                         atrasado
        item({ dataAlvo: HOJE }), //                                 a vencer
        item({ dataAlvo: "2026-07-26" }), //                         a vencer (borda)
        item({ dataAlvo: "2026-09-01" }), //                         ok
        item({ dataAlvo: "2026-01-01", status: "feito" }), //         resolvido
        item({ dataAlvo: "2026-01-01", status: "descartado" }), //    descartado
        item({ dataAlvo: null }), //                                  sem data
      ],
      HOJE,
    );
    expect(painel.atrasados).toBe(2);
    expect(painel.aVencer).toBe(2);
    expect(painel.comPrazoPendente).toBe(5); // 2 + 2 + 1 "ok"
  });

  it("o mesmo item nunca é contado duas vezes", () => {
    const painel = calcularPainelPrazos([item({ dataAlvo: "2026-07-18" })], HOJE);
    expect(painel.atrasados + painel.aVencer).toBe(1);
  });

  it("resolver um item atrasado tira ele da conta", () => {
    const atrasado = item({ dataAlvo: "2026-07-10" });
    expect(calcularPainelPrazos([atrasado], HOJE).atrasados).toBe(1);
    expect(calcularPainelPrazos([{ ...atrasado, status: "feito" }], HOJE).atrasados).toBe(0);
  });

  it("o 'hoje' é injetado: mudar a data muda a classificação", () => {
    const umItem = [item({ dataAlvo: "2026-07-20" })];
    expect(calcularPainelPrazos(umItem, "2026-07-19").aVencer).toBe(1); // véspera
    expect(calcularPainelPrazos(umItem, "2026-07-21").atrasados).toBe(1); // dia seguinte
    expect(calcularPainelPrazos(umItem, "2026-06-01").aVencer).toBe(0); // longe: só "ok"
  });
});
