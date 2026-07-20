import { describe, it, expect } from "vitest";
import {
  contarItens,
  filtrarArvore,
  filtroAtivo,
  FILTROS_VAZIOS,
  type Filtros,
} from "./filtros";
import type { Item, TemaComFilhos } from "./entities";
import type { StatusItem } from "./status";

const HOJE = "2026-07-19";

let seq = 0;
function item(p: {
  status: StatusItem;
  temCusto?: boolean;
  essencial?: boolean;
  titulo?: string;
  dataAlvo?: string | null;
}): Item {
  seq++;
  return {
    id: `item-${seq}`,
    subtemaId: "sub",
    casorioId: "cas",
    titulo: p.titulo ?? `item ${seq}`,
    temCusto: p.temCusto ?? false,
    status: p.status,
    custoEstimado: 0,
    custoReal: 0,
    dataAlvo: p.dataAlvo ?? null,
    observacao: null,
    essencial: p.essencial ?? false,
    fornecedorNome: null,
    fornecedorContato: null,
    fornecedorLink: null,
    ordem: 0,
  };
}

/** Árvore de teste: 2 temas, com mistura de resolvidos/pendentes/essenciais. */
function arvore(): TemaComFilhos[] {
  return [
    {
      id: "tema-A",
      casorioId: "cas",
      nome: "Local",
      ordem: 0,
      subtemas: [
        {
          id: "sub-A1",
          temaId: "tema-A",
          casorioId: "cas",
          nome: "Espaços",
          ordem: 0,
          itens: [
            item({ status: "pago", temCusto: true, essencial: true, titulo: "Salão" }),
            item({ status: "a_decidir", temCusto: true, essencial: true, titulo: "Igreja" }),
            item({ status: "a_fazer", titulo: "Visitar opções" }),
          ],
        },
      ],
    },
    {
      id: "tema-B",
      casorioId: "cas",
      nome: "Bebidas",
      ordem: 1,
      subtemas: [
        {
          id: "sub-B1",
          temaId: "tema-B",
          casorioId: "cas",
          nome: "Não alcoólicas",
          ordem: 0,
          itens: [item({ status: "feito", titulo: "Água" })],
        },
        {
          id: "sub-B2",
          temaId: "tema-B",
          casorioId: "cas",
          nome: "Alcoólicas",
          ordem: 1,
          itens: [item({ status: "a_decidir", temCusto: true, titulo: "Cerveja" })],
        },
      ],
    },
  ];
}

const f = (p: Partial<Filtros> = {}): Filtros => ({ ...FILTROS_VAZIOS, ...p });
const titulos = (a: TemaComFilhos[]) =>
  a.flatMap((t) => t.subtemas.flatMap((s) => s.itens.map((i) => i.titulo)));

describe("contarItens / filtroAtivo", () => {
  it("conta todos os itens da árvore", () => {
    expect(contarItens(arvore())).toBe(5);
    expect(contarItens([])).toBe(0);
  });

  it("filtro vazio não é ativo", () => {
    expect(filtroAtivo(FILTROS_VAZIOS)).toBe(false);
  });

  it("qualquer filtro ligado é ativo", () => {
    expect(filtroAtivo(f({ situacao: "pendentes" }))).toBe(true);
    expect(filtroAtivo(f({ somenteEssenciais: true }))).toBe(true);
    expect(filtroAtivo(f({ temaId: "tema-A" }))).toBe(true);
    expect(filtroAtivo(f({ prazo: "atrasados" }))).toBe(true);
  });
});

describe("filtrarArvore — prazo (RN16/RN17)", () => {
  /** Árvore com datas: 1 atrasado, 1 a vencer, 1 longe, 1 vencido mas resolvido. */
  function arvoreComPrazos(): TemaComFilhos[] {
    return [
      {
        id: "tema-P",
        casorioId: "cas",
        nome: "Prazos",
        ordem: 0,
        subtemas: [
          {
            id: "sub-P1",
            temaId: "tema-P",
            casorioId: "cas",
            nome: "Tudo",
            ordem: 0,
            itens: [
              item({ status: "a_fazer", titulo: "Venceu ontem", dataAlvo: "2026-07-18" }),
              item({ status: "a_fazer", titulo: "Vence amanhã", dataAlvo: "2026-07-20" }),
              item({ status: "a_fazer", titulo: "Vence em 30 dias", dataAlvo: "2026-08-18" }),
              item({ status: "feito", titulo: "Vencido mas feito", dataAlvo: "2026-01-01" }),
              item({ status: "a_fazer", titulo: "Sem data" }),
              item({ status: "descartado", titulo: "Descartado vencido", dataAlvo: "2026-01-01" }),
            ],
          },
        ],
      },
    ];
  }

  it("'atrasados' pega só quem passou da data e não resolveu", () => {
    const r = filtrarArvore(arvoreComPrazos(), f({ prazo: "atrasados" }), HOJE);
    expect(titulos(r)).toEqual(["Venceu ontem"]);
  });

  it("'a vencer' pega só a janela de 7 dias", () => {
    const r = filtrarArvore(arvoreComPrazos(), f({ prazo: "a_vencer" }), HOJE);
    expect(titulos(r)).toEqual(["Vence amanhã"]);
  });

  it("resolvido e descartado nunca entram, mesmo vencidos", () => {
    const atrasados = titulos(filtrarArvore(arvoreComPrazos(), f({ prazo: "atrasados" }), HOJE));
    expect(atrasados).not.toContain("Vencido mas feito");
    expect(atrasados).not.toContain("Descartado vencido");
  });

  it("prazo combina com os outros filtros", () => {
    const r = filtrarArvore(
      arvoreComPrazos(),
      f({ prazo: "atrasados", situacao: "resolvidos" }),
      HOJE,
    );
    expect(r).toEqual([]); // atrasado por definição não é resolvido
  });

  it("o 'hoje' é injetado: outra data muda o resultado", () => {
    const daquiUmMes = filtrarArvore(arvoreComPrazos(), f({ prazo: "atrasados" }), "2026-08-19");
    expect(titulos(daquiUmMes).sort()).toEqual([
      "Vence amanhã",
      "Vence em 30 dias",
      "Venceu ontem",
    ]);
  });
});

describe("filtrarArvore — situação", () => {
  it("'todos' devolve tudo", () => {
    expect(contarItens(filtrarArvore(arvore(), f(), HOJE))).toBe(5);
  });

  it("'pendentes' deixa só o que falta (nos dois fluxos)", () => {
    const r = filtrarArvore(arvore(), f({ situacao: "pendentes" }), HOJE);
    expect(titulos(r).sort()).toEqual(["Cerveja", "Igreja", "Visitar opções"]);
  });

  it("'resolvidos' deixa só pago (com custo) e feito (sem custo)", () => {
    const r = filtrarArvore(arvore(), f({ situacao: "resolvidos" }), HOJE);
    expect(titulos(r).sort()).toEqual(["Salão", "Água"]);
  });
});

describe("filtrarArvore — essenciais e tema", () => {
  it("'só essenciais' filtra pela marca", () => {
    const r = filtrarArvore(arvore(), f({ somenteEssenciais: true }), HOJE);
    expect(titulos(r).sort()).toEqual(["Igreja", "Salão"]);
  });

  it("por tema devolve só aquele tema", () => {
    const r = filtrarArvore(arvore(), f({ temaId: "tema-B" }), HOJE);
    expect(r).toHaveLength(1);
    expect(r[0].nome).toBe("Bebidas");
    expect(titulos(r).sort()).toEqual(["Cerveja", "Água"]);
  });

  it("tema inexistente devolve vazio", () => {
    expect(filtrarArvore(arvore(), f({ temaId: "nao-existe" }), HOJE)).toEqual([]);
  });
});

describe("filtrarArvore — combinações", () => {
  it("pendentes + essenciais", () => {
    const r = filtrarArvore(arvore(), f({ situacao: "pendentes", somenteEssenciais: true }), HOJE);
    expect(titulos(r)).toEqual(["Igreja"]);
  });

  it("pendentes + essenciais + tema certo", () => {
    const r = filtrarArvore(arvore(), f({ situacao: "pendentes", somenteEssenciais: true, temaId: "tema-A" }), HOJE);
    expect(titulos(r)).toEqual(["Igreja"]);
  });

  it("combinação sem resultado devolve árvore vazia", () => {
    const r = filtrarArvore(arvore(), f({ situacao: "resolvidos", somenteEssenciais: true, temaId: "tema-B" }), HOJE);
    expect(r).toEqual([]);
  });
});

describe("filtrarArvore — limpeza e pureza", () => {
  it("subtema que fica sem item é descartado", () => {
    // só 'Água' é resolvido no tema B -> subtema 'Alcoólicas' some
    const r = filtrarArvore(arvore(), f({ situacao: "resolvidos", temaId: "tema-B" }), HOJE);
    expect(r[0].subtemas).toHaveLength(1);
    expect(r[0].subtemas[0].nome).toBe("Não alcoólicas");
  });

  it("tema que fica sem subtema é descartado", () => {
    const r = filtrarArvore(arvore(), f({ situacao: "resolvidos", somenteEssenciais: true }), HOJE);
    expect(r.map((t) => t.nome)).toEqual(["Local"]); // só o Salão sobrevive
  });

  it("NÃO altera a árvore original (função pura)", () => {
    const original = arvore();
    const copia = JSON.parse(JSON.stringify(original));
    filtrarArvore(original, f({ situacao: "pendentes", somenteEssenciais: true }), HOJE);
    expect(original).toEqual(copia);
  });

  it("árvore vazia continua vazia", () => {
    expect(filtrarArvore([], f({ situacao: "pendentes" }), HOJE)).toEqual([]);
  });
});
