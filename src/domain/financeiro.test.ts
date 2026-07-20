import { describe, it, expect } from "vitest";
import {
  calcularPainelFinanceiro,
  contaNoDinheiro,
  custoEfetivo,
  semPreco,
  type ItemFinanceiro,
} from "./financeiro";
import type { StatusItem } from "./status";

/** Fábrica curta pra montar itens de teste. Valores em CENTAVOS. */
function item(p: Partial<ItemFinanceiro> = {}): ItemFinanceiro {
  return {
    titulo: "item",
    temCusto: true,
    status: "a_decidir",
    custoEstimado: 0,
    custoReal: 0,
    ...p,
  };
}
const comCusto = (status: StatusItem, estimado: number, real = 0) =>
  item({ temCusto: true, status, custoEstimado: estimado, custoReal: real });

describe("custoEfetivo (RN11)", () => {
  it("usa o real quando existe", () => {
    expect(custoEfetivo(comCusto("pago", 10000, 8500))).toBe(8500);
  });
  it("cai no estimado quando não há real", () => {
    expect(custoEfetivo(comCusto("a_decidir", 10000))).toBe(10000);
  });
  it("real menor que o estimado ainda ganha (o real é a verdade)", () => {
    expect(custoEfetivo(comCusto("contratado", 50000, 100))).toBe(100);
  });
});

describe("contaNoDinheiro (RN12/RN23)", () => {
  it("item sem custo não entra nas contas", () => {
    expect(contaNoDinheiro(item({ temCusto: false, status: "feito" }))).toBe(false);
  });
  it("item descartado não entra, mesmo com custo", () => {
    expect(contaNoDinheiro(comCusto("descartado", 90000))).toBe(false);
  });
  it("item com custo e ativo entra", () => {
    expect(contaNoDinheiro(comCusto("a_decidir", 100))).toBe(true);
  });
});

describe("semPreco — não somar 0 em silêncio", () => {
  it("item com custo, ativo e sem valor é sinalizado", () => {
    expect(semPreco(comCusto("a_decidir", 0))).toBe(true);
  });
  it("item com estimado não é 'sem preço'", () => {
    expect(semPreco(comCusto("a_decidir", 5000))).toBe(false);
  });
  it("item sem custo nunca é 'sem preço' (não é problema de dinheiro)", () => {
    expect(semPreco(item({ temCusto: false, status: "a_fazer" }))).toBe(false);
  });
  it("descartado sem preço não incomoda ninguém", () => {
    expect(semPreco(comCusto("descartado", 0))).toBe(false);
  });
});

describe("calcularPainelFinanceiro — casos base", () => {
  it("lista vazia devolve tudo zerado e saldo = orçamento", () => {
    const p = calcularPainelFinanceiro([], 3000000);
    expect(p).toEqual({
      orcamento: 3000000,
      orcamentoDefinido: true,
      estimadoTotal: 0,
      comprometido: 0,
      pago: 0,
      saldo: 3000000,
      estourou: false,
      semPreco: 0,
    });
  });

  it("soma o cenário completo corretamente (RN12/13/14/15)", () => {
    const itens = [
      comCusto("a_decidir", 100000), //            estimado 1.000,00
      comCusto("decidido", 200000), //             estimado 2.000,00
      comCusto("contratado", 300000, 280000), //   real     2.800,00
      comCusto("pago", 500000, 450000), //         real     4.500,00
      item({ temCusto: false, status: "feito" }), // fora do dinheiro
      comCusto("descartado", 900000), //           fora de tudo (RN23)
    ];
    const p = calcularPainelFinanceiro(itens, 1000000);

    expect(p.estimadoTotal).toBe(100000 + 200000 + 280000 + 450000); // 10.300,00
    expect(p.comprometido).toBe(280000 + 450000); //                     7.300,00
    expect(p.pago).toBe(450000); //                                      4.500,00
    expect(p.saldo).toBe(1000000 - 1030000); //                          −300,00
    expect(p.estourou).toBe(true);
  });
});

describe("calcularPainelFinanceiro — Pago (RN13)", () => {
  it("conta só o custo REAL dos itens pagos", () => {
    const p = calcularPainelFinanceiro([comCusto("pago", 999999, 30000)], 0);
    expect(p.pago).toBe(30000);
  });
  it("contratado não conta como pago", () => {
    expect(calcularPainelFinanceiro([comCusto("contratado", 0, 50000)], 0).pago).toBe(0);
  });
  it("item pago descartado depois sai do pago", () => {
    expect(calcularPainelFinanceiro([comCusto("descartado", 0, 50000)], 0).pago).toBe(0);
  });
});

describe("calcularPainelFinanceiro — Comprometido (RN14)", () => {
  it("soma contratado e pago, e só eles", () => {
    const itens = [
      comCusto("a_decidir", 10000),
      comCusto("decidido", 20000),
      comCusto("contratado", 0, 30000),
      comCusto("pago", 0, 40000),
    ];
    expect(calcularPainelFinanceiro(itens, 0).comprometido).toBe(70000);
  });
});

describe("calcularPainelFinanceiro — Saldo e estouro (RN15/D05)", () => {
  it("saldo positivo quando o plano cabe no orçamento", () => {
    const p = calcularPainelFinanceiro([comCusto("a_decidir", 400000)], 1000000);
    expect(p.saldo).toBe(600000);
    expect(p.estourou).toBe(false);
  });

  it("estoura pelo ESTIMADO TOTAL, não pelo comprometido (avisa cedo — D05)", () => {
    // nada contratado ainda, mas o plano já passa do orçamento
    const p = calcularPainelFinanceiro([comCusto("a_decidir", 1500000)], 1000000);
    expect(p.comprometido).toBe(0);
    expect(p.estourou).toBe(true);
    expect(p.saldo).toBe(-500000);
  });

  it("gastar exatamente o orçamento NÃO é estouro (borda)", () => {
    const p = calcularPainelFinanceiro([comCusto("a_decidir", 1000000)], 1000000);
    expect(p.saldo).toBe(0);
    expect(p.estourou).toBe(false);
  });

  it("um centavo acima já é estouro (borda)", () => {
    expect(calcularPainelFinanceiro([comCusto("a_decidir", 1000001)], 1000000).estourou).toBe(true);
  });
});

describe("orçamento ainda não definido (0) — não é estouro, é falta de dado", () => {
  it("orçamento 0 marca orcamentoDefinido = false", () => {
    expect(calcularPainelFinanceiro([], 0).orcamentoDefinido).toBe(false);
    expect(calcularPainelFinanceiro([], 1).orcamentoDefinido).toBe(true);
  });

  it("NÃO acusa estouro quando o casal só não preencheu o orçamento", () => {
    // era o bug: R$ 0 de teto com R$ 31.500 planejados disparava o alarme sempre
    const p = calcularPainelFinanceiro([comCusto("a_decidir", 3150000)], 0);
    expect(p.estourou).toBe(false);
    expect(p.orcamentoDefinido).toBe(false);
  });

  it("mas ainda calcula o resto normalmente (o saldo fica negativo mesmo)", () => {
    const p = calcularPainelFinanceiro([comCusto("a_decidir", 3150000)], 0);
    expect(p.estimadoTotal).toBe(3150000);
    expect(p.saldo).toBe(-3150000);
  });

  it("assim que o orçamento é definido, o alerta volta a valer", () => {
    const itens = [comCusto("a_decidir", 3150000)];
    expect(calcularPainelFinanceiro(itens, 3000000).estourou).toBe(true);
    expect(calcularPainelFinanceiro(itens, 4000000).estourou).toBe(false);
  });
});

describe("invariantes do motor (viram teste — PRD §6 C1)", () => {
  const cenarios: ItemFinanceiro[][] = [
    [],
    [comCusto("a_decidir", 12345)],
    [comCusto("pago", 500000, 480000), comCusto("contratado", 300000, 250000)],
    [
      comCusto("a_decidir", 1),
      comCusto("decidido", 99999),
      comCusto("contratado", 5000, 4999),
      comCusto("pago", 100, 1),
      comCusto("descartado", 100000),
      item({ temCusto: false, status: "a_fazer" }),
    ],
    [comCusto("pago", 0, 1), comCusto("pago", 0, 2), comCusto("pago", 0, 3)],
  ];

  it.each(cenarios.map((c, i) => [i, c]))("cenário %i: pago ≤ comprometido ≤ estimadoTotal", (_, itens) => {
    const p = calcularPainelFinanceiro(itens as ItemFinanceiro[], 1000000);
    expect(p.pago).toBeLessThanOrEqual(p.comprometido);
    expect(p.comprometido).toBeLessThanOrEqual(p.estimadoTotal);
  });

  it.each(cenarios.map((c, i) => [i, c]))("cenário %i: saldo = orçamento − estimadoTotal", (_, itens) => {
    const p = calcularPainelFinanceiro(itens as ItemFinanceiro[], 777777);
    expect(p.saldo).toBe(777777 - p.estimadoTotal);
  });

  it("todos os valores continuam inteiros (centavos, sem float)", () => {
    const p = calcularPainelFinanceiro(
      [comCusto("pago", 333, 333), comCusto("contratado", 667, 667)],
      1000,
    );
    for (const v of [p.estimadoTotal, p.comprometido, p.pago, p.saldo]) {
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});

describe("contagem de itens sem preço", () => {
  it("conta só os com custo, ativos e zerados", () => {
    const p = calcularPainelFinanceiro(
      [
        comCusto("a_decidir", 0), // conta
        comCusto("decidido", 0), // conta
        comCusto("a_decidir", 100), // tem preço
        comCusto("descartado", 0), // descartado
        item({ temCusto: false, status: "a_fazer" }), // sem custo
      ],
      0,
    );
    expect(p.semPreco).toBe(2);
  });
});
