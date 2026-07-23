import { describe, it, expect } from "vitest";
import { CasorioRepositoryMemoria } from "./casorio-repository-memoria";

describe("CasorioRepositoryMemoria.meuCasorioComArvore", () => {
  it("null quando não há casório", async () => {
    const repo = new CasorioRepositoryMemoria();
    expect(await repo.meuCasorioComArvore()).toBeNull();
  });

  it("devolve casório + árvore montada (tema→subtema→item)", async () => {
    const repo = new CasorioRepositoryMemoria();
    const casorio = await repo.criarCasorio({
      nome: "R&J",
      dataCasamento: "2026-11-14",
      orcamentoTotal: 9000000,
    });
    const tema = await repo.criarTema({ casorioId: casorio.id, nome: "Comida" });
    const sub = await repo.criarSubtema({ temaId: tema.id, casorioId: casorio.id, nome: "Bebidas" });
    await repo.criarItem({
      subtemaId: sub.id,
      casorioId: casorio.id,
      titulo: "Refrigerante",
      temCusto: true,
      custoEstimado: 48000,
    });

    const dados = await repo.meuCasorioComArvore();
    expect(dados).not.toBeNull();
    expect(dados!.casorio.id).toBe(casorio.id);
    expect(dados!.arvore).toHaveLength(1);
    expect(dados!.arvore[0].nome).toBe("Comida");
    expect(dados!.arvore[0].subtemas[0].nome).toBe("Bebidas");
    expect(dados!.arvore[0].subtemas[0].itens[0].titulo).toBe("Refrigerante");
  });
});
