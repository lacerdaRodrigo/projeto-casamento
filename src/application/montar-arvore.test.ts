import { describe, it, expect, beforeEach } from "vitest";
import { CasorioRepositoryMemoria } from "@/adapters/memoria/casorio-repository-memoria";
import {
  criarTemaCompleto,
  criarSubtemaCompleto,
  SUBTEMA_PADRAO,
} from "./montar-arvore";

describe("montar-arvore", () => {
  let repo: CasorioRepositoryMemoria;
  const casorioId = "c1";

  beforeEach(() => {
    repo = new CasorioRepositoryMemoria();
  });

  describe("criarTemaCompleto", () => {
    it("tema sem custo/essencial nasce vazio (só a categoria)", async () => {
      await criarTemaCompleto(repo, {
        casorioId,
        nome: "Comida",
        temCusto: false,
        custoEstimado: 0,
        essencial: false,
      });
      expect(repo.temas).toHaveLength(1);
      expect(repo.temas[0].nome).toBe("Comida");
      expect(repo.subtemas).toHaveLength(0);
      expect(repo.itens).toHaveLength(0);
    });

    it("tema com custo semeia subtema 'Geral' + item de mesmo nome", async () => {
      await criarTemaCompleto(repo, {
        casorioId,
        nome: "Carro dos noivos",
        temCusto: true,
        custoEstimado: 50000,
        essencial: false,
      });
      expect(repo.subtemas).toHaveLength(1);
      expect(repo.subtemas[0].nome).toBe(SUBTEMA_PADRAO);
      expect(repo.itens).toHaveLength(1);
      const item = repo.itens[0];
      expect(item.titulo).toBe("Carro dos noivos");
      expect(item.temCusto).toBe(true);
      expect(item.custoEstimado).toBe(50000);
      expect(item.subtemaId).toBe(repo.subtemas[0].id);
    });

    it("tema só essencial também semeia o item (sem custo)", async () => {
      await criarTemaCompleto(repo, {
        casorioId,
        nome: "Alianças",
        temCusto: false,
        custoEstimado: 0,
        essencial: true,
      });
      expect(repo.itens).toHaveLength(1);
      expect(repo.itens[0].essencial).toBe(true);
      expect(repo.itens[0].temCusto).toBe(false);
    });
  });

  describe("criarSubtemaCompleto", () => {
    it("subtema sem custo/essencial nasce vazio", async () => {
      const tema = await repo.criarTema({ casorioId, nome: "Comida" });
      await criarSubtemaCompleto(repo, {
        temaId: tema.id,
        casorioId,
        nome: "Bebidas",
        temCusto: false,
        custoEstimado: 0,
        essencial: false,
      });
      expect(repo.subtemas).toHaveLength(1);
      expect(repo.itens).toHaveLength(0);
    });

    it("subtema com custo semeia 1 item de mesmo nome no subtema", async () => {
      const tema = await repo.criarTema({ casorioId, nome: "Comida" });
      await criarSubtemaCompleto(repo, {
        temaId: tema.id,
        casorioId,
        nome: "Bolo",
        temCusto: true,
        custoEstimado: 30000,
        essencial: true,
      });
      expect(repo.itens).toHaveLength(1);
      const item = repo.itens[0];
      expect(item.titulo).toBe("Bolo");
      expect(item.custoEstimado).toBe(30000);
      expect(item.essencial).toBe(true);
      expect(item.subtemaId).toBe(repo.subtemas[0].id);
    });
  });
});
