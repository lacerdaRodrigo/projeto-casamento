import { describe, it, expect, beforeEach } from "vitest";
import { CasorioRepositoryMemoria } from "@/adapters/memoria/casorio-repository-memoria";
import { semearTemplate, TAMANHO_TEMPLATE } from "./semear-template";
import { TEMPLATE_CASORIO } from "@/domain/template-casorio";

const CASORIO = "55555555-5555-4555-8555-555555555555";
let repo: CasorioRepositoryMemoria;

beforeEach(() => {
  repo = new CasorioRepositoryMemoria();
});

describe("semearTemplate (RF12/D09)", () => {
  it("grava a árvore inteira com as contagens do modelo", async () => {
    await semearTemplate(repo, CASORIO);
    expect(repo.temas.length).toBe(TAMANHO_TEMPLATE.temas);
    expect(repo.subtemas.length).toBe(TAMANHO_TEMPLATE.subtemas);
    expect(repo.itens.length).toBe(TAMANHO_TEMPLATE.itens);
  });

  it("tudo nasce ligado ao casório certo", async () => {
    await semearTemplate(repo, CASORIO);
    expect(repo.temas.every((t) => t.casorioId === CASORIO)).toBe(true);
    expect(repo.subtemas.every((s) => s.casorioId === CASORIO)).toBe(true);
    expect(repo.itens.every((i) => i.casorioId === CASORIO)).toBe(true);
  });

  it("status inicial respeita tem_custo (RN05)", async () => {
    await semearTemplate(repo, CASORIO);
    for (const item of repo.itens) {
      expect(item.status).toBe(item.temCusto ? "a_decidir" : "a_fazer");
    }
  });

  it("preserva a ordem dos temas do modelo", async () => {
    await semearTemplate(repo, CASORIO);
    const arvore = await repo.getArvore(CASORIO);
    expect(arvore.map((t) => t.nome)).toEqual(TEMPLATE_CASORIO.map((t) => t.nome));
  });

  it("a árvore lida de volta bate com o modelo (estrutura fim-a-fim)", async () => {
    await semearTemplate(repo, CASORIO);
    const arvore = await repo.getArvore(CASORIO);

    const primeiro = TEMPLATE_CASORIO[0];
    expect(arvore[0].subtemas.map((s) => s.nome)).toEqual(primeiro.subtemas.map((s) => s.nome));
    expect(arvore[0].subtemas[0].itens.map((i) => i.titulo)).toEqual(
      primeiro.subtemas[0].itens.map((i) => i.titulo),
    );
  });

  it("preserva a marca de essencial (RN24)", async () => {
    await semearTemplate(repo, CASORIO);
    const essenciaisModelo = TEMPLATE_CASORIO.flatMap((t) =>
      t.subtemas.flatMap((s) => s.itens.filter((i) => i.essencial).map((i) => i.titulo)),
    );
    const essenciaisGravados = repo.itens.filter((i) => i.essencial).map((i) => i.titulo);
    expect(essenciaisGravados.sort()).toEqual(essenciaisModelo.sort());
  });
});

describe("exclusão em cascata (RN03) — repo fake espelha o banco", () => {
  beforeEach(async () => {
    await semearTemplate(repo, CASORIO);
  });

  it("excluir item tira só ele", async () => {
    const antes = repo.itens.length;
    await repo.excluirItem(repo.itens[0].id);
    expect(repo.itens.length).toBe(antes - 1);
    expect(repo.subtemas.length).toBe(TAMANHO_TEMPLATE.subtemas);
  });

  it("excluir subtema leva os itens dele junto", async () => {
    const sub = repo.subtemas[0];
    const itensDoSub = repo.itens.filter((i) => i.subtemaId === sub.id).length;
    expect(itensDoSub).toBeGreaterThan(0);

    await repo.excluirSubtema(sub.id);

    expect(repo.subtemas.find((s) => s.id === sub.id)).toBeUndefined();
    expect(repo.itens.filter((i) => i.subtemaId === sub.id)).toHaveLength(0);
    expect(repo.itens.length).toBe(TAMANHO_TEMPLATE.itens - itensDoSub);
  });

  it("excluir tema leva subtemas e itens junto", async () => {
    const tema = repo.temas[0];
    const subsDoTema = repo.subtemas.filter((s) => s.temaId === tema.id).map((s) => s.id);
    const itensDoTema = repo.itens.filter((i) => subsDoTema.includes(i.subtemaId)).length;
    expect(subsDoTema.length).toBeGreaterThan(0);
    expect(itensDoTema).toBeGreaterThan(0);

    await repo.excluirTema(tema.id);

    expect(repo.temas.find((t) => t.id === tema.id)).toBeUndefined();
    expect(repo.subtemas.filter((s) => s.temaId === tema.id)).toHaveLength(0);
    expect(repo.itens.filter((i) => subsDoTema.includes(i.subtemaId))).toHaveLength(0);
    expect(repo.itens.length).toBe(TAMANHO_TEMPLATE.itens - itensDoTema);
  });

  it("apagar todos os temas esvazia a árvore", async () => {
    for (const tema of [...repo.temas]) await repo.excluirTema(tema.id);
    expect(await repo.getArvore(CASORIO)).toHaveLength(0);
    expect(repo.subtemas).toHaveLength(0);
    expect(repo.itens).toHaveLength(0);
  });
});
