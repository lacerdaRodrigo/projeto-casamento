import { describe, it, expect } from "vitest";
import { TEMPLATE_CASORIO, contarTemplate } from "./template-casorio";

const contagem = contarTemplate();

describe("template do casório — integridade da estrutura", () => {
  it("tem um tamanho razoável (nem vazio, nem assustador)", () => {
    expect(contagem.temas).toBeGreaterThanOrEqual(12);
    expect(contagem.subtemas).toBeGreaterThanOrEqual(30);
    expect(contagem.itens).toBeGreaterThanOrEqual(90);
    expect(contagem.itens).toBeLessThanOrEqual(200);
  });

  it("nenhum nome vazio ou só espaço (RN02)", () => {
    for (const tema of TEMPLATE_CASORIO) {
      expect(tema.nome.trim().length).toBeGreaterThan(0);
      for (const sub of tema.subtemas) {
        expect(sub.nome.trim().length).toBeGreaterThan(0);
        for (const item of sub.itens) {
          expect(item.titulo.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("todo tema tem ao menos um subtema, e todo subtema ao menos um item", () => {
    for (const tema of TEMPLATE_CASORIO) {
      expect(tema.subtemas.length, `tema "${tema.nome}" sem subtema`).toBeGreaterThan(0);
      for (const sub of tema.subtemas) {
        expect(sub.itens.length, `subtema "${sub.nome}" sem item`).toBeGreaterThan(0);
      }
    }
  });

  it("não repete nome de tema", () => {
    const nomes = TEMPLATE_CASORIO.map((t) => t.nome);
    expect(new Set(nomes).size).toBe(nomes.length);
  });

  it("não repete nome de subtema dentro do mesmo tema", () => {
    for (const tema of TEMPLATE_CASORIO) {
      const nomes = tema.subtemas.map((s) => s.nome);
      expect(new Set(nomes).size, `subtemas repetidos em "${tema.nome}"`).toBe(nomes.length);
    }
  });

  it("não repete título de item dentro do mesmo subtema", () => {
    for (const tema of TEMPLATE_CASORIO) {
      for (const sub of tema.subtemas) {
        const titulos = sub.itens.map((i) => i.titulo);
        expect(new Set(titulos).size, `itens repetidos em "${tema.nome} > ${sub.nome}"`).toBe(
          titulos.length,
        );
      }
    }
  });
});

describe("template do casório — conteúdo", () => {
  const todosItens = TEMPLATE_CASORIO.flatMap((t) => t.subtemas.flatMap((s) => s.itens));

  it("tem itens com custo e itens sem custo (os dois fluxos)", () => {
    expect(todosItens.some((i) => i.temCusto)).toBe(true);
    expect(todosItens.some((i) => !i.temCusto)).toBe(true);
  });

  it("marca essenciais, mas com parcimônia (é filtro de pânico, não regra)", () => {
    const essenciais = todosItens.filter((i) => i.essencial);
    expect(essenciais.length).toBeGreaterThanOrEqual(8);
    expect(essenciais.length).toBeLessThan(todosItens.length / 3);
  });

  it("os pilares do casamento estão marcados como essenciais", () => {
    const essenciais = todosItens.filter((i) => i.essencial).map((i) => i.titulo.toLowerCase());
    for (const pilar of ["local da cerimônia", "celebrante", "alianças", "vestido de noiva", "buffet"]) {
      expect(
        essenciais.some((t) => t.includes(pilar)),
        `faltou marcar essencial algo com "${pilar}"`,
      ).toBe(true);
    }
  });

  it("cobre as áreas que o casal espera encontrar", () => {
    const temas = TEMPLATE_CASORIO.map((t) => t.nome.toLowerCase());
    for (const esperado of ["local", "cerimônia", "comida", "bebidas", "noiva", "noivo", "lua de mel"]) {
      expect(temas.some((t) => t.includes(esperado)), `faltou tema "${esperado}"`).toBe(true);
    }
  });

  it("Bebidas traz o básico (água, refrigerante, suco)", () => {
    const bebidas = TEMPLATE_CASORIO.find((t) => t.nome === "Bebidas");
    const titulos = bebidas!.subtemas.flatMap((s) => s.itens.map((i) => i.titulo.toLowerCase()));
    expect(titulos).toContain("água");
    expect(titulos).toContain("refrigerante");
    expect(titulos).toContain("suco");
  });
});

describe("contarTemplate", () => {
  it("conta certo numa árvore pequena", () => {
    const mini = [
      { nome: "A", subtemas: [{ nome: "A1", itens: [{ titulo: "x", temCusto: false }] }] },
      {
        nome: "B",
        subtemas: [
          { nome: "B1", itens: [{ titulo: "y", temCusto: true }] },
          { nome: "B2", itens: [{ titulo: "z", temCusto: true }, { titulo: "w", temCusto: false }] },
        ],
      },
    ];
    expect(contarTemplate(mini)).toEqual({ temas: 2, subtemas: 3, itens: 4 });
  });
});
