import { describe, it, expect, beforeEach } from "vitest";
import { CasorioRepositoryMemoria } from "@/adapters/memoria/casorio-repository-memoria";
import { editarItem, type EdicaoItem } from "./editar-item";
import type { Item } from "@/domain/entities";

const CASORIO = "66666666-6666-4666-8666-666666666666";
const SUBTEMA = "77777777-7777-4777-8777-777777777777";

let repo: CasorioRepositoryMemoria;
let semCusto: Item;
let comCusto: Item;

/** Base de edição — os testes sobrescrevem só o que interessa. */
function edicao(p: Partial<EdicaoItem> = {}): EdicaoItem {
  return {
    titulo: "Título",
    temCusto: false,
    custoEstimado: 0,
    custoReal: 0,
    dataAlvo: null,
    essencial: false,
    observacao: null,
    fornecedorNome: null,
    fornecedorContato: null,
    fornecedorLink: null,
    ...p,
  };
}

beforeEach(async () => {
  repo = new CasorioRepositoryMemoria();
  semCusto = await repo.criarItem({
    subtemaId: SUBTEMA,
    casorioId: CASORIO,
    titulo: "Montar o cronograma do dia",
    temCusto: false,
  });
  comCusto = await repo.criarItem({
    subtemaId: SUBTEMA,
    casorioId: CASORIO,
    titulo: "Buffet",
    temCusto: true,
    custoEstimado: 500000,
  });
});

describe("editarItem — campos simples (RF06)", () => {
  it("grava todos os campos novos", async () => {
    const salvo = await editarItem(repo, {
      itemId: semCusto.id,
      statusAtual: "a_fazer",
      temCustoAtual: false,
      dados: edicao({
        titulo: "Cronograma detalhado",
        dataAlvo: "2027-05-01",
        essencial: true,
        observacao: "combinar com a cerimonialista",
      }),
    });
    expect(salvo.titulo).toBe("Cronograma detalhado");
    expect(salvo.dataAlvo).toBe("2027-05-01");
    expect(salvo.essencial).toBe(true);
    expect(salvo.observacao).toBe("combinar com a cerimonialista");
  });

  it("grava os dados do fornecedor", async () => {
    const salvo = await editarItem(repo, {
      itemId: comCusto.id,
      statusAtual: "a_decidir",
      temCustoAtual: true,
      dados: edicao({
        titulo: "Buffet",
        temCusto: true,
        custoEstimado: 800000,
        fornecedorNome: "Buffet Silva",
        fornecedorContato: "(11) 99999-0000",
        fornecedorLink: "https://buffetsilva.com.br",
      }),
    });
    expect(salvo.fornecedorNome).toBe("Buffet Silva");
    expect(salvo.fornecedorContato).toBe("(11) 99999-0000");
    expect(salvo.fornecedorLink).toBe("https://buffetsilva.com.br");
    expect(salvo.custoEstimado).toBe(800000);
  });

  it("mantém o status quando o fluxo não muda", async () => {
    const salvo = await editarItem(repo, {
      itemId: comCusto.id,
      statusAtual: "decidido",
      temCustoAtual: true,
      dados: edicao({ titulo: "Buffet", temCusto: true, custoEstimado: 100 }),
    });
    expect(salvo.status).toBe("decidido");
  });
});

describe("editarItem — conversão ao trocar 'tem custo' (C2)", () => {
  it("SEM custo -> COM custo vira 'a decidir'", async () => {
    const salvo = await editarItem(repo, {
      itemId: semCusto.id,
      statusAtual: "a_fazer",
      temCustoAtual: false,
      dados: edicao({ temCusto: true, custoEstimado: 30000 }),
    });
    expect(salvo.status).toBe("a_decidir");
    expect(salvo.temCusto).toBe(true);
    expect(salvo.custoEstimado).toBe(30000);
  });

  it("item 'feito' que ganha custo também vira 'a decidir'", async () => {
    const salvo = await editarItem(repo, {
      itemId: semCusto.id,
      statusAtual: "feito",
      temCustoAtual: false,
      dados: edicao({ temCusto: true, custoEstimado: 1000 }),
    });
    expect(salvo.status).toBe("a_decidir");
  });

  it("COM custo 'pago' -> SEM custo vira 'feito' (não perde o resolvido)", async () => {
    const salvo = await editarItem(repo, {
      itemId: comCusto.id,
      statusAtual: "pago",
      temCustoAtual: true,
      dados: edicao({ titulo: "Buffet", temCusto: false, custoReal: 480000 }),
    });
    expect(salvo.status).toBe("feito");
    expect(salvo.temCusto).toBe(false);
  });

  it("COM custo 'contratado' -> SEM custo também vira 'feito'", async () => {
    const salvo = await editarItem(repo, {
      itemId: comCusto.id,
      statusAtual: "contratado",
      temCustoAtual: true,
      dados: edicao({ temCusto: false, custoReal: 100 }),
    });
    expect(salvo.status).toBe("feito");
  });

  it("COM custo 'a decidir' -> SEM custo volta pra 'a fazer'", async () => {
    const salvo = await editarItem(repo, {
      itemId: comCusto.id,
      statusAtual: "a_decidir",
      temCustoAtual: true,
      dados: edicao({ temCusto: false }),
    });
    expect(salvo.status).toBe("a_fazer");
  });

  it("descartado continua descartado ao trocar o fluxo", async () => {
    const salvo = await editarItem(repo, {
      itemId: comCusto.id,
      statusAtual: "descartado",
      temCustoAtual: true,
      dados: edicao({ temCusto: false }),
    });
    expect(salvo.status).toBe("descartado");
  });

  it("os custos são preservados ao virar item sem custo (só ficam ocultos)", async () => {
    const salvo = await editarItem(repo, {
      itemId: comCusto.id,
      statusAtual: "pago",
      temCustoAtual: true,
      dados: edicao({ temCusto: false, custoEstimado: 500000, custoReal: 480000 }),
    });
    expect(salvo.custoEstimado).toBe(500000);
    expect(salvo.custoReal).toBe(480000);
  });
});

describe("editarItem — coerência continua garantida (RN06)", () => {
  it("zerar o custo real de um item PAGO é recusado, e nada é gravado", async () => {
    await expect(
      editarItem(repo, {
        itemId: comCusto.id,
        statusAtual: "pago",
        temCustoAtual: true,
        dados: edicao({ titulo: "Buffet", temCusto: true, custoReal: 0 }),
      }),
    ).rejects.toThrow(/RN06/);

    const noRepo = repo.itens.find((i) => i.id === comCusto.id);
    expect(noRepo?.titulo).toBe("Buffet"); // título original preservado
    expect(noRepo?.status).toBe("a_decidir");
  });

  it("item CONTRATADO com custo real também não pode zerar", async () => {
    await expect(
      editarItem(repo, {
        itemId: comCusto.id,
        statusAtual: "contratado",
        temCustoAtual: true,
        dados: edicao({ temCusto: true, custoReal: 0 }),
      }),
    ).rejects.toThrow(/RN06/);
  });

  it("editar item pago mantendo o valor funciona", async () => {
    const salvo = await editarItem(repo, {
      itemId: comCusto.id,
      statusAtual: "pago",
      temCustoAtual: true,
      dados: edicao({ titulo: "Buffet fechado", temCusto: true, custoReal: 470000 }),
    });
    expect(salvo.status).toBe("pago");
    expect(salvo.custoReal).toBe(470000);
    expect(salvo.titulo).toBe("Buffet fechado");
  });
});
