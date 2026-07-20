import { describe, it, expect, beforeEach } from "vitest";
import { CasorioRepositoryMemoria } from "@/adapters/memoria/casorio-repository-memoria";
import { mudarStatusItem } from "./mudar-status-item";
import type { Item } from "@/domain/entities";

let repo: CasorioRepositoryMemoria;
let itemComCusto: Item;
let itemSemCusto: Item;
const CASORIO = "33333333-3333-4333-8333-333333333333";
const SUBTEMA = "44444444-4444-4444-8444-444444444444";

beforeEach(async () => {
  repo = new CasorioRepositoryMemoria();
  itemComCusto = await repo.criarItem({
    subtemaId: SUBTEMA,
    casorioId: CASORIO,
    titulo: "Buffet",
    temCusto: true,
    custoEstimado: 500000,
  });
  itemSemCusto = await repo.criarItem({
    subtemaId: SUBTEMA,
    casorioId: CASORIO,
    titulo: "Escolher música",
    temCusto: false,
  });
});

describe("UC06 mudarStatusItem — RN06 (custo real obrigatório)", () => {
  it("recusa 'pago' sem custo real e NÃO grava", async () => {
    await expect(
      mudarStatusItem(repo, {
        itemId: itemComCusto.id,
        temCusto: true,
        novoStatus: "pago",
        custoReal: 0,
      }),
    ).rejects.toThrow(/RN06/);

    // o estado no repo continua intacto
    expect(repo.itens.find((i) => i.id === itemComCusto.id)?.status).toBe("a_decidir");
  });

  it("recusa 'contratado' sem custo real", async () => {
    await expect(
      mudarStatusItem(repo, {
        itemId: itemComCusto.id,
        temCusto: true,
        novoStatus: "contratado",
        custoReal: 0,
      }),
    ).rejects.toThrow(/RN06/);
  });

  it("aceita 'pago' com custo real e grava em centavos", async () => {
    const salvo = await mudarStatusItem(repo, {
      itemId: itemComCusto.id,
      temCusto: true,
      novoStatus: "pago",
      custoReal: 480000, // R$ 4.800,00
    });
    expect(salvo.status).toBe("pago");
    expect(salvo.custoReal).toBe(480000);
    expect(repo.itens.find((i) => i.id === itemComCusto.id)?.status).toBe("pago");
  });
});

describe("UC06 mudarStatusItem — RN05 (status coerente com tem_custo)", () => {
  it("recusa 'pago' em item SEM custo", async () => {
    await expect(
      mudarStatusItem(repo, {
        itemId: itemSemCusto.id,
        temCusto: false,
        novoStatus: "pago",
        custoReal: 1000,
      }),
    ).rejects.toThrow(/RN05/);
  });

  it("aceita 'feito' em item sem custo", async () => {
    const salvo = await mudarStatusItem(repo, {
      itemId: itemSemCusto.id,
      temCusto: false,
      novoStatus: "feito",
      custoReal: 0,
    });
    expect(salvo.status).toBe("feito");
  });
});

describe("UC06 mudarStatusItem — RN07 e RN23", () => {
  it("ordem livre: vai direto pra 'decidido' sem passar por etapas", async () => {
    const salvo = await mudarStatusItem(repo, {
      itemId: itemComCusto.id,
      temCusto: true,
      novoStatus: "decidido",
      custoReal: 0,
    });
    expect(salvo.status).toBe("decidido");
  });

  it("descartar é permitido de qualquer status, sem custo real", async () => {
    const salvo = await mudarStatusItem(repo, {
      itemId: itemComCusto.id,
      temCusto: true,
      novoStatus: "descartado",
      custoReal: 0,
    });
    expect(salvo.status).toBe("descartado");
  });
});
