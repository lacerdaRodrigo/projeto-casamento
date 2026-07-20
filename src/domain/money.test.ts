import { describe, it, expect } from "vitest";
import {
  reaisParaCentavos,
  centavosParaReais,
  formatarBRL,
  formatarNumeroBR,
  parseReaisBR,
} from "./money";

describe("dinheiro em centavos (D08)", () => {
  it("converte reais <-> centavos sem erro de float", () => {
    expect(reaisParaCentavos(12.5)).toBe(1250);
    expect(reaisParaCentavos(0.1 + 0.2)).toBe(30); // clássico do float
    expect(centavosParaReais(1250)).toBe(12.5);
  });

  it("formata como moeda BR", () => {
    expect(formatarBRL(3000000).replace(/ /g, " ")).toBe("R$ 30.000,00");
    expect(formatarBRL(0).replace(/ /g, " ")).toBe("R$ 0,00");
  });

  it("formata número BR sem símbolo", () => {
    expect(formatarNumeroBR(3000000)).toBe("30.000,00");
    expect(formatarNumeroBR(3000050)).toBe("30.000,50");
    expect(formatarNumeroBR(0)).toBe("0,00");
  });
});

describe("parseReaisBR — o que o usuário digita", () => {
  it("número inteiro vira reais (30000 = R$ 30.000,00)", () => {
    expect(parseReaisBR("30000")).toBe(3000000);
  });

  it("aceita separador de milhar e decimal BR", () => {
    expect(parseReaisBR("30.000,50")).toBe(3000050);
    expect(parseReaisBR("1.234")).toBe(123400);
    expect(parseReaisBR("12,5")).toBe(1250);
  });

  it("ignora símbolos e espaços", () => {
    expect(parseReaisBR("R$ 1.500,00")).toBe(150000);
    expect(parseReaisBR("  250  ")).toBe(25000);
  });

  it("vazio ou lixo vira 0", () => {
    expect(parseReaisBR("")).toBe(0);
    expect(parseReaisBR("abc")).toBe(0);
  });

  it("ida e volta bate (round-trip)", () => {
    const centavos = 3000050;
    expect(parseReaisBR(formatarNumeroBR(centavos))).toBe(centavos);
  });
});
