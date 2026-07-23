import { describe, it, expect } from "vitest";
import {
  parseCasorio,
  parseTema,
  parseSubtema,
  parseItem,
  parseMudarStatus,
  parseUsarModelo,
  parseId,
  parseRenomear,
  parseEditarItem,
  mensagemDeErro,
} from "./form-schemas";
import { SUBTEMA_SOLTOS } from "@/domain/subtema-soltos";

const UUID = "11111111-1111-4111-8111-111111111111";
const UUID2 = "22222222-2222-4222-8222-222222222222";

function fd(campos: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.append(k, v);
  return f;
}

describe("parseCasorio", () => {
  it("lê nome, data e orçamento em centavos", () => {
    const r = parseCasorio(
      fd({ nome: "Rodrigo & Jennifer", dataCasamento: "2027-05-15", orcamentoCentavos: "3000000" }),
    );
    expect(r).toEqual({
      nome: "Rodrigo & Jennifer",
      dataCasamento: "2027-05-15",
      orcamentoTotal: 3000000, // R$ 30.000,00
    });
  });

  it("orçamento ausente vira 0 (não quebra)", () => {
    expect(parseCasorio(fd({ nome: "X" })).orcamentoTotal).toBe(0);
  });

  it("nome vazio é rejeitado com mensagem legível", () => {
    expect(() => parseCasorio(fd({ nome: "   " }))).toThrow();
    try {
      parseCasorio(fd({ nome: "   " }));
    } catch (e) {
      expect(mensagemDeErro(e)).toBe("Nome do casório é obrigatório");
    }
  });

  it("campo de texto AUSENTE também dá mensagem em PT-BR", () => {
    try {
      parseCasorio(fd({}));
      throw new Error("deveria ter falhado");
    } catch (e) {
      expect(mensagemDeErro(e)).toBe("Nome do casório é obrigatório");
    }
  });
});

describe("parseTema / parseSubtema", () => {
  it("lê tema", () => {
    expect(parseTema(fd({ casorioId: UUID, nome: "Comida" }))).toEqual({
      casorioId: UUID,
      nome: "Comida",
    });
  });

  it("lê subtema", () => {
    expect(parseSubtema(fd({ temaId: UUID, casorioId: UUID2, nome: "Bebidas" }))).toEqual({
      temaId: UUID,
      casorioId: UUID2,
      nome: "Bebidas",
    });
  });

  it("id inválido é rejeitado", () => {
    expect(() => parseTema(fd({ casorioId: "nao-e-uuid", nome: "X" }))).toThrow();
  });

  it("rejeita o nome reservado do subtema oculto (SUBTEMA_SOLTOS)", () => {
    expect(() =>
      parseSubtema(fd({ temaId: UUID, casorioId: UUID2, nome: SUBTEMA_SOLTOS })),
    ).toThrow();
    expect(() => parseRenomear(fd({ subtemaId: UUID, nome: SUBTEMA_SOLTOS }), "subtemaId")).toThrow();
  });
});

describe("parseItem", () => {
  it("checkbox desmarcado (campo ausente) = false", () => {
    const r = parseItem(fd({ subtemaId: UUID, casorioId: UUID2, titulo: "Refrigerante" }));
    expect(r.temCusto).toBe(false);
    expect(r.essencial).toBe(false);
    expect(r.custoEstimado).toBe(0);
    expect(r.dataAlvo).toBeNull();
  });

  it("checkbox marcado ('on') = true, custo em centavos", () => {
    const r = parseItem(
      fd({
        subtemaId: UUID,
        casorioId: UUID2,
        titulo: "Bolo",
        temCusto: "on",
        essencial: "on",
        custoEstimadoCentavos: "150000",
        dataAlvo: "2027-01-10",
      }),
    );
    expect(r.temCusto).toBe(true);
    expect(r.essencial).toBe(true);
    expect(r.custoEstimado).toBe(150000); // R$ 1.500,00
    expect(r.dataAlvo).toBe("2027-01-10");
  });

  it("título vazio é rejeitado", () => {
    try {
      parseItem(fd({ subtemaId: UUID, casorioId: UUID2, titulo: "" }));
      throw new Error("deveria ter falhado");
    } catch (e) {
      expect(mensagemDeErro(e)).toBe("Título do item é obrigatório");
    }
  });
});

describe("parseMudarStatus — o caminho que quebrou em produção", () => {
  it("lê o custo real do campo custoRealCentavos", () => {
    const r = parseMudarStatus(
      fd({ itemId: UUID, temCusto: "true", novoStatus: "pago", custoRealCentavos: "28500" }),
    );
    expect(r).toEqual({ itemId: UUID, temCusto: true, novoStatus: "pago", custoReal: 28500 });
  });

  it("campo de custo ausente vira 0 (item sem custo não renderiza o campo)", () => {
    const r = parseMudarStatus(fd({ itemId: UUID, temCusto: "false", novoStatus: "feito" }));
    expect(r.custoReal).toBe(0);
    expect(r.temCusto).toBe(false);
  });

  it("status fora do enum é rejeitado com mensagem em PT-BR (nada de texto cru do zod)", () => {
    try {
      parseMudarStatus(fd({ itemId: UUID, temCusto: "true", novoStatus: "inventado" }));
      throw new Error("deveria ter falhado");
    } catch (e) {
      expect(mensagemDeErro(e)).toBe("Status inválido");
    }
  });

  it("status ausente também vira mensagem legível", () => {
    try {
      parseMudarStatus(fd({ itemId: UUID, temCusto: "true" }));
      throw new Error("deveria ter falhado");
    } catch (e) {
      expect(mensagemDeErro(e)).toBe("Status inválido");
    }
  });

  it("centavos negativo é rejeitado", () => {
    expect(() =>
      parseMudarStatus(
        fd({ itemId: UUID, temCusto: "true", novoStatus: "pago", custoRealCentavos: "-1" }),
      ),
    ).toThrow();
  });
});

describe("parseUsarModelo — checkbox do modelo pronto", () => {
  it("marcado ('on') = true", () => {
    expect(parseUsarModelo(fd({ nome: "X", usarModelo: "on" }))).toBe(true);
  });
  it("ausente (desmarcado) = false", () => {
    expect(parseUsarModelo(fd({ nome: "X" }))).toBe(false);
  });
  it("aceita 'true' explícito", () => {
    expect(parseUsarModelo(fd({ usarModelo: "true" }))).toBe(true);
  });
});

describe("parseId — usado pelas exclusões", () => {
  it("lê um uuid válido do campo pedido", () => {
    expect(parseId(fd({ temaId: UUID }), "temaId")).toBe(UUID);
  });
  it("rejeita valor que não é uuid", () => {
    expect(() => parseId(fd({ temaId: "123" }), "temaId")).toThrow();
    try {
      parseId(fd({ temaId: "123" }), "temaId");
    } catch (e) {
      expect(mensagemDeErro(e)).toBe("Identificador inválido");
    }
  });
  it("campo ausente vira mensagem legível (não texto cru do zod)", () => {
    try {
      parseId(fd({}), "temaId");
      throw new Error("deveria ter falhado");
    } catch (e) {
      expect(mensagemDeErro(e)).toBe("Identificador ausente");
    }
  });
  it("não confunde campos diferentes", () => {
    const form = fd({ temaId: UUID, subtemaId: UUID2 });
    expect(parseId(form, "temaId")).toBe(UUID);
    expect(parseId(form, "subtemaId")).toBe(UUID2);
  });
});

describe("parseRenomear (RF04/RF05)", () => {
  it("lê id e nome novo do campo certo", () => {
    expect(parseRenomear(fd({ temaId: UUID, nome: "Comida e bebida" }), "temaId")).toEqual({
      id: UUID,
      nome: "Comida e bebida",
    });
  });
  it("funciona pro subtema também", () => {
    expect(parseRenomear(fd({ subtemaId: UUID2, nome: "Doces" }), "subtemaId").id).toBe(UUID2);
  });
  it("recusa nome em branco", () => {
    try {
      parseRenomear(fd({ temaId: UUID, nome: "   " }), "temaId");
      throw new Error("deveria ter falhado");
    } catch (e) {
      expect(mensagemDeErro(e)).toBe("Nome é obrigatório");
    }
  });
});

describe("parseEditarItem (RF06) — o formulário completo", () => {
  const base = { itemId: UUID, statusAtual: "a_fazer", temCustoAtual: "false", titulo: "X" };

  it("formulário mínimo: campos vazios viram null/0/false", () => {
    const r = parseEditarItem(fd(base));
    expect(r).toEqual({
      itemId: UUID,
      statusAtual: "a_fazer",
      temCustoAtual: false,
      titulo: "X",
      temCusto: false,
      custoEstimado: 0,
      custoReal: 0,
      dataAlvo: null,
      essencial: false,
      observacao: null,
      fornecedorNome: null,
      fornecedorContato: null,
      fornecedorLink: null,
    });
  });

  it("formulário completo é lido inteiro, dinheiro em centavos", () => {
    const r = parseEditarItem(
      fd({
        ...base,
        statusAtual: "a_decidir",
        temCustoAtual: "true",
        titulo: "Buffet",
        temCusto: "on",
        custoEstimadoCentavos: "800000",
        custoRealCentavos: "750000",
        dataAlvo: "2027-03-20",
        essencial: "on",
        observacao: "degustação marcada",
        fornecedorNome: "Buffet Silva",
        fornecedorContato: "(11) 99999-0000",
        fornecedorLink: "https://buffetsilva.com.br",
      }),
    );
    expect(r.temCusto).toBe(true);
    expect(r.temCustoAtual).toBe(true);
    expect(r.custoEstimado).toBe(800000);
    expect(r.custoReal).toBe(750000);
    expect(r.dataAlvo).toBe("2027-03-20");
    expect(r.essencial).toBe(true);
    expect(r.observacao).toBe("degustação marcada");
    expect(r.fornecedorNome).toBe("Buffet Silva");
  });

  it("texto só com espaço vira null (não suja o banco)", () => {
    const r = parseEditarItem(fd({ ...base, observacao: "   ", fornecedorNome: "  " }));
    expect(r.observacao).toBeNull();
    expect(r.fornecedorNome).toBeNull();
  });

  it("título vazio é recusado com mensagem legível", () => {
    try {
      parseEditarItem(fd({ ...base, titulo: "  " }));
      throw new Error("deveria ter falhado");
    } catch (e) {
      expect(mensagemDeErro(e)).toBe("Título do item é obrigatório");
    }
  });

  it("data em formato errado é recusada", () => {
    expect(() => parseEditarItem(fd({ ...base, dataAlvo: "20/03/2027" }))).toThrow();
  });
});

describe("mensagemDeErro", () => {
  it("usa a mensagem do Error", () => {
    expect(mensagemDeErro(new Error("boom"))).toBe("boom");
  });
  it("cai num texto genérico pra coisa desconhecida", () => {
    expect(mensagemDeErro("qualquer coisa")).toBe("Erro inesperado");
  });
});
