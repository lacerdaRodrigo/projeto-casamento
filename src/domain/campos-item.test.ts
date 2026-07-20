import { describe, it, expect } from "vitest";
import {
  camposDoItem,
  camposDoItemNaArvore,
  paresCurados,
  perfilDoSubtema,
  PERFIL_PADRAO,
} from "./campos-item";
import { TEMPLATE_CASORIO } from "./template-casorio";

describe("cobertura da curadoria — o modelo inteiro precisa estar curado", () => {
  it("todos os subtemas do modelo têm perfil curado (nenhum caiu no padrão)", () => {
    const curados = new Set(paresCurados());
    const faltando: string[] = [];

    for (const tema of TEMPLATE_CASORIO) {
      for (const sub of tema.subtemas) {
        if (!curados.has(`${tema.nome} › ${sub.nome}`)) {
          faltando.push(`${tema.nome} › ${sub.nome}`);
        }
      }
    }

    expect(faltando, `subtemas sem perfil curado:\n${faltando.join("\n")}`).toEqual([]);
  });

  it("a curadoria não tem entrada sobrando (par que não existe no modelo)", () => {
    const doModelo = new Set(
      TEMPLATE_CASORIO.flatMap((t) => t.subtemas.map((s) => `${t.nome} › ${s.nome}`)),
    );
    const sobrando = paresCurados().filter((p) => !doModelo.has(p));
    expect(sobrando, `curadoria com par inexistente:\n${sobrando.join("\n")}`).toEqual([]);
  });
});

describe("perfilDoSubtema", () => {
  it("distingue subtemas de mesmo nome em temas diferentes", () => {
    // "Cerimônia" é tema E subtema de Decoração — não podem se confundir
    expect(perfilDoSubtema("Decoração e flores", "Cerimônia")).toBe("contratacao");
    expect(perfilDoSubtema("Cerimônia", "Documentação civil")).toBe("documento");
  });

  it("'Beleza' existe em Noiva e em Noivo, ambos contratação", () => {
    expect(perfilDoSubtema("Noiva", "Beleza")).toBe("contratacao");
    expect(perfilDoSubtema("Noivo", "Beleza")).toBe("contratacao");
  });

  it("subtema desconhecido cai no padrão (erra pro lado limpo)", () => {
    expect(perfilDoSubtema("Tema Inventado", "Sub Inventado")).toBe(PERFIL_PADRAO);
    expect(perfilDoSubtema("Local", "Renomeei Isso Aqui")).toBe(PERFIL_PADRAO);
    expect(PERFIL_PADRAO).toBe("compra"); // mostra dinheiro, esconde fornecedor
  });

  it("os julgamentos principais estão como esperado", () => {
    expect(perfilDoSubtema("Planejamento", "Definições iniciais")).toBe("tarefa");
    expect(perfilDoSubtema("Local", "Espaços")).toBe("contratacao");
    expect(perfilDoSubtema("Bebidas", "Não alcoólicas")).toBe("compra");
    expect(perfilDoSubtema("Música e festa", "Repertório")).toBe("tarefa");
    expect(perfilDoSubtema("Lua de mel", "Documentos")).toBe("documento");
    expect(perfilDoSubtema("Pós-casamento", "Fechamento")).toBe("tarefa");
  });
});

describe("camposDoItem — o dinheiro segue o 'tem custo', não o perfil", () => {
  it("item SEM custo nunca mostra dinheiro nem fornecedor", () => {
    for (const perfil of ["tarefa", "compra", "contratacao", "documento"] as const) {
      expect(camposDoItem(perfil, false)).toEqual({ dinheiro: false, fornecedor: false });
    }
  });

  it("contratação COM custo mostra dinheiro e fornecedor", () => {
    expect(camposDoItem("contratacao", true)).toEqual({ dinheiro: true, fornecedor: true });
  });

  it("compra e documento mostram dinheiro, mas NÃO fornecedor", () => {
    expect(camposDoItem("compra", true)).toEqual({ dinheiro: true, fornecedor: false });
    expect(camposDoItem("documento", true)).toEqual({ dinheiro: true, fornecedor: false });
  });

  it("tarefa com custo mostra dinheiro, mas segue sem fornecedor", () => {
    expect(camposDoItem("tarefa", true)).toEqual({ dinheiro: true, fornecedor: false });
  });
});

describe("casos concretos que motivaram a curadoria", () => {
  const campos = (temaNome: string, subtemaNome: string, temCusto: boolean) =>
    camposDoItemNaArvore({ temaNome, subtemaNome, temCusto });

  it("'Definir a data do casamento' não mostra valor nem fornecedor", () => {
    expect(campos("Planejamento", "Definições iniciais", false)).toEqual({
      dinheiro: false,
      fornecedor: false,
    });
  });

  it("'Definir o orçamento total' idem", () => {
    expect(campos("Planejamento", "Definições iniciais", false).fornecedor).toBe(false);
  });

  it("'Reservar o local da cerimônia' mostra valor E fornecedor", () => {
    expect(campos("Local", "Espaços", true)).toEqual({ dinheiro: true, fornecedor: true });
  });

  it("'Refrigerante' mostra valor, mas não pede fornecedor", () => {
    expect(campos("Bebidas", "Não alcoólicas", true)).toEqual({
      dinheiro: true,
      fornecedor: false,
    });
  });

  it("'Visitar as opções finalistas' (sem custo, em subtema de contratação) fica limpo", () => {
    expect(campos("Local", "Espaços", false)).toEqual({ dinheiro: false, fornecedor: false });
  });

  it("'Papelada do civil' tem taxa, mas não fornecedor comercial", () => {
    expect(campos("Cerimônia", "Documentação civil", true)).toEqual({
      dinheiro: true,
      fornecedor: false,
    });
  });
});

describe("proporção da curadoria (sanidade do julgamento)", () => {
  it("a maioria dos itens do modelo NÃO precisa de fornecedor", () => {
    let comFornecedor = 0;
    let total = 0;
    for (const tema of TEMPLATE_CASORIO) {
      for (const sub of tema.subtemas) {
        for (const item of sub.itens) {
          total++;
          if (camposDoItemNaArvore({ temaNome: tema.nome, subtemaNome: sub.nome, temCusto: item.temCusto }).fornecedor) {
            comFornecedor++;
          }
        }
      }
    }
    // antes da curadoria, 100% dos itens mostravam fornecedor
    expect(comFornecedor).toBeLessThan(total * 0.6);
    expect(comFornecedor).toBeGreaterThan(0);
  });
});
