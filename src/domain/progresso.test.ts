import { describe, it, expect } from "vitest";
import { progressoDe, type ItemProgresso } from "./progresso";
import type { StatusItem } from "./status";

const it_ = (status: StatusItem, temCusto = false, essencial = false): ItemProgresso => ({
  status,
  temCusto,
  essencial,
});

describe("progressoDe", () => {
  it("sem itens: 0 de 0, 0% (nada de divisão por zero)", () => {
    expect(progressoDe([])).toEqual({
      total: 0,
      resolvidos: 0,
      percentual: 0,
      essenciaisPendentes: 0,
    });
  });

  it("tudo resolvido = 100%", () => {
    const p = progressoDe([it_("feito"), it_("pago", true), it_("feito")]);
    expect(p.total).toBe(3);
    expect(p.resolvidos).toBe(3);
    expect(p.percentual).toBe(100);
  });

  it("nada resolvido = 0%", () => {
    const p = progressoDe([it_("a_fazer"), it_("a_decidir", true), it_("contratado", true)]);
    expect(p.resolvidos).toBe(0);
    expect(p.percentual).toBe(0);
  });

  it("conta resolvido pelos dois fluxos (RN08)", () => {
    const p = progressoDe([
      it_("feito"), //          sem custo, resolvido
      it_("pago", true), //     com custo, resolvido
      it_("a_fazer"), //        pendente
      it_("contratado", true), // pendente (ainda não pagou)
    ]);
    expect(p.resolvidos).toBe(2);
    expect(p.percentual).toBe(50);
  });

  it("descartado sai da conta inteira (RN23)", () => {
    const p = progressoDe([it_("feito"), it_("descartado"), it_("descartado", true)]);
    expect(p.total).toBe(1);
    expect(p.resolvidos).toBe(1);
    expect(p.percentual).toBe(100);
  });

  it("arredonda o percentual", () => {
    // 1 de 3 = 33,33% -> 33
    expect(progressoDe([it_("feito"), it_("a_fazer"), it_("a_fazer")]).percentual).toBe(33);
    // 2 de 3 = 66,67% -> 67
    expect(progressoDe([it_("feito"), it_("feito"), it_("a_fazer")]).percentual).toBe(67);
  });
});

describe("essenciais pendentes (RN24 — a métrica que importa)", () => {
  it("conta só os essenciais ainda não resolvidos", () => {
    const p = progressoDe([
      it_("a_fazer", false, true), //      essencial pendente
      it_("a_decidir", true, true), //     essencial pendente
      it_("feito", false, true), //        essencial resolvido
      it_("a_fazer", false, false), //     pendente, não essencial
    ]);
    expect(p.essenciaisPendentes).toBe(2);
  });

  it("essencial descartado não conta como pendente", () => {
    const p = progressoDe([it_("descartado", true, true), it_("a_fazer", false, true)]);
    expect(p.essenciaisPendentes).toBe(1);
  });

  it("zero quando todos os essenciais estão resolvidos", () => {
    const p = progressoDe([it_("feito", false, true), it_("pago", true, true), it_("a_fazer")]);
    expect(p.essenciaisPendentes).toBe(0);
  });
});
