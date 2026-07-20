import { describe, it, expect } from "vitest";
import {
  statusValidoParaTipo,
  statusInicial,
  exigeCustoReal,
  isResolvido,
  validarTransicao,
  converterAoTrocarTemCusto,
} from "./status";

describe("C2 — validade de status por tipo (RN05)", () => {
  it("item sem custo aceita a_fazer/feito, rejeita fluxo de custo", () => {
    expect(statusValidoParaTipo("a_fazer", false)).toBe(true);
    expect(statusValidoParaTipo("feito", false)).toBe(true);
    expect(statusValidoParaTipo("pago", false)).toBe(false);
    expect(statusValidoParaTipo("a_decidir", false)).toBe(false);
  });

  it("item com custo aceita fluxo de custo, rejeita a_fazer/feito", () => {
    expect(statusValidoParaTipo("a_decidir", true)).toBe(true);
    expect(statusValidoParaTipo("pago", true)).toBe(true);
    expect(statusValidoParaTipo("feito", true)).toBe(false);
  });

  it("descartado vale pra qualquer tipo (RN23)", () => {
    expect(statusValidoParaTipo("descartado", true)).toBe(true);
    expect(statusValidoParaTipo("descartado", false)).toBe(true);
  });
});

describe("C2 — status inicial (RN05)", () => {
  it("sem custo -> a_fazer; com custo -> a_decidir", () => {
    expect(statusInicial(false)).toBe("a_fazer");
    expect(statusInicial(true)).toBe("a_decidir");
  });
});

describe("C2 — resolvido (RN08)", () => {
  it("resolvido = feito (sem custo) ou pago (com custo)", () => {
    expect(isResolvido("feito", false)).toBe(true);
    expect(isResolvido("pago", true)).toBe(true);
  });
  it("descartado e pendentes não são resolvidos", () => {
    expect(isResolvido("descartado", true)).toBe(false);
    expect(isResolvido("a_fazer", false)).toBe(false);
    expect(isResolvido("contratado", true)).toBe(false);
  });
});

describe("C2 — validarTransicao (RN05/06/07)", () => {
  it("contratado/pago exigem custo real > 0 (RN06)", () => {
    expect(exigeCustoReal("pago")).toBe(true);
    const semValor = validarTransicao({ temCusto: true, novoStatus: "pago", custoRealCentavos: 0 });
    expect(semValor.ok).toBe(false);
    const comValor = validarTransicao({ temCusto: true, novoStatus: "pago", custoRealCentavos: 15000 });
    expect(comValor.ok).toBe(true);
  });

  it("status inválido pro tipo é rejeitado (RN05)", () => {
    const r = validarTransicao({ temCusto: false, novoStatus: "pago", custoRealCentavos: 100 });
    expect(r.ok).toBe(false);
  });

  it("ordem é livre: pode ir direto pra decidido (RN07)", () => {
    const r = validarTransicao({ temCusto: true, novoStatus: "decidido", custoRealCentavos: 0 });
    expect(r.ok).toBe(true);
  });
});

describe("C2 — conversão ao trocar tem_custo", () => {
  it("com custo pago -> sem custo vira feito", () => {
    expect(converterAoTrocarTemCusto("pago", false)).toBe("feito");
    expect(converterAoTrocarTemCusto("contratado", false)).toBe("feito");
  });
  it("com custo a_decidir -> sem custo vira a_fazer", () => {
    expect(converterAoTrocarTemCusto("a_decidir", false)).toBe("a_fazer");
  });
  it("qualquer -> com custo vira a_decidir", () => {
    expect(converterAoTrocarTemCusto("feito", true)).toBe("a_decidir");
  });
  it("descartado permanece descartado", () => {
    expect(converterAoTrocarTemCusto("descartado", true)).toBe("descartado");
  });
});
