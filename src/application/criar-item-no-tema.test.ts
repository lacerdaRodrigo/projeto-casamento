import { describe, it, expect, beforeEach } from "vitest";
import { CasorioRepositoryMemoria } from "@/adapters/memoria/casorio-repository-memoria";
import { criarItemNoTema } from "./criar-item-no-tema";
import { SUBTEMA_SOLTOS } from "@/domain/subtema-soltos";

describe("criarItemNoTema", () => {
  let repo: CasorioRepositoryMemoria;
  const casorioId = "c1";
  let temaId: string;

  beforeEach(async () => {
    repo = new CasorioRepositoryMemoria();
    const tema = await repo.criarTema({ casorioId, nome: "Coxinhas de frango" });
    temaId = tema.id;
  });

  it("cria o subtema solto na primeira vez e põe o item nele", async () => {
    await criarItemNoTema(repo, {
      temaId,
      casorioId,
      titulo: "Com catupiry",
      temCusto: true,
      custoEstimado: 500,
      essencial: false,
    });

    expect(repo.subtemas).toHaveLength(1);
    expect(repo.subtemas[0].nome).toBe(SUBTEMA_SOLTOS);
    expect(repo.itens).toHaveLength(1);
    expect(repo.itens[0].titulo).toBe("Com catupiry");
    expect(repo.itens[0].custoEstimado).toBe(500);
    expect(repo.itens[0].subtemaId).toBe(repo.subtemas[0].id);
  });

  it("REUSA o mesmo subtema solto no segundo item (não cria outro)", async () => {
    await criarItemNoTema(repo, {
      temaId,
      casorioId,
      titulo: "Com catupiry",
      temCusto: true,
      custoEstimado: 500,
      essencial: false,
    });
    await criarItemNoTema(repo, {
      temaId,
      casorioId,
      titulo: "Com carne seca",
      temCusto: true,
      custoEstimado: 600,
      essencial: false,
    });

    expect(repo.subtemas).toHaveLength(1); // um só subtema solto
    expect(repo.itens).toHaveLength(2);
    expect(repo.itens.every((i) => i.subtemaId === repo.subtemas[0].id)).toBe(true);
  });

  it("item sem custo também funciona", async () => {
    await criarItemNoTema(repo, {
      temaId,
      casorioId,
      titulo: "Provar receita",
      temCusto: false,
      custoEstimado: 0,
      essencial: false,
    });
    expect(repo.itens).toHaveLength(1);
    expect(repo.itens[0].temCusto).toBe(false);
  });
});
