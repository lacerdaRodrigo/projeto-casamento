// Repo FAKE em memória (PRD §8.3). Permite testar casos de uso sem banco.
import type {
  CasorioRepository,
  DadosItem,
  NovoCasorio,
  NovoItem,
  NovoSubtema,
  NovoTema,
} from "@/ports/casorio-repository";
import type { Casorio, Item, Subtema, Tema, TemaComFilhos } from "@/domain/entities";
import type { Centavos } from "@/domain/money";
import { statusInicial, type StatusItem } from "@/domain/status";
import { SUBTEMA_SOLTOS } from "@/domain/subtema-soltos";
import type { TemaTemplate } from "@/domain/template-casorio";

export class CasorioRepositoryMemoria implements CasorioRepository {
  casorios: Casorio[] = [];
  temas: Tema[] = [];
  subtemas: Subtema[] = [];
  itens: Item[] = [];

  async criarCasorio(input: NovoCasorio): Promise<Casorio> {
    const casorio: Casorio = {
      id: crypto.randomUUID(),
      nome: input.nome,
      dataCasamento: input.dataCasamento,
      orcamentoTotal: input.orcamentoTotal,
    };
    this.casorios.push(casorio);
    return casorio;
  }

  async meuCasorio(): Promise<Casorio | null> {
    return this.casorios[0] ?? null;
  }

  async getArvore(casorioId: string): Promise<TemaComFilhos[]> {
    return this.temas
      .filter((t) => t.casorioId === casorioId)
      .map((t) => ({
        ...t,
        subtemas: this.subtemas
          .filter((s) => s.temaId === t.id)
          .map((s) => ({ ...s, itens: this.itens.filter((i) => i.subtemaId === s.id) })),
      }));
  }

  async meuCasorioComArvore(): Promise<{ casorio: Casorio; arvore: TemaComFilhos[] } | null> {
    const casorio = this.casorios[0];
    if (!casorio) return null;
    return { casorio, arvore: await this.getArvore(casorio.id) };
  }

  async criarTema(input: NovoTema): Promise<Tema> {
    const tema: Tema = {
      id: crypto.randomUUID(),
      casorioId: input.casorioId,
      nome: input.nome,
      ordem: input.ordem ?? 0,
    };
    this.temas.push(tema);
    return tema;
  }

  async criarSubtema(input: NovoSubtema): Promise<Subtema> {
    const subtema: Subtema = {
      id: crypto.randomUUID(),
      temaId: input.temaId,
      casorioId: input.casorioId,
      nome: input.nome,
      ordem: input.ordem ?? 0,
    };
    this.subtemas.push(subtema);
    return subtema;
  }

  async garantirSubtemaPadrao(temaId: string, casorioId: string): Promise<Subtema> {
    const existente = this.subtemas.find(
      (s) => s.temaId === temaId && s.nome === SUBTEMA_SOLTOS,
    );
    if (existente) return existente;
    return this.criarSubtema({ temaId, casorioId, nome: SUBTEMA_SOLTOS, ordem: -1 });
  }

  async criarItem(input: NovoItem): Promise<Item> {
    const item: Item = {
      id: crypto.randomUUID(),
      subtemaId: input.subtemaId,
      casorioId: input.casorioId,
      titulo: input.titulo,
      temCusto: input.temCusto,
      status: statusInicial(input.temCusto),
      custoEstimado: input.custoEstimado ?? 0,
      custoReal: 0,
      dataAlvo: input.dataAlvo ?? null,
      observacao: null,
      essencial: input.essencial ?? false,
      fornecedorNome: null,
      fornecedorContato: null,
      fornecedorLink: null,
      ordem: 0,
    };
    this.itens.push(item);
    return item;
  }

  async mudarStatusItem(itemId: string, status: StatusItem, custoReal: Centavos): Promise<Item> {
    const item = this.itens.find((i) => i.id === itemId);
    if (!item) throw new Error(`Item ${itemId} não encontrado`);
    item.status = status;
    item.custoReal = custoReal;
    return item;
  }

  async semearArvore(casorioId: string, temas: readonly TemaTemplate[]): Promise<void> {
    for (const [iTema, tema] of temas.entries()) {
      const temaCriado = await this.criarTema({ casorioId, nome: tema.nome, ordem: iTema });
      for (const [iSub, subtema] of tema.subtemas.entries()) {
        const subCriado = await this.criarSubtema({
          temaId: temaCriado.id,
          casorioId,
          nome: subtema.nome,
          ordem: iSub,
        });
        for (const item of subtema.itens) {
          await this.criarItem({
            subtemaId: subCriado.id,
            casorioId,
            titulo: item.titulo,
            temCusto: item.temCusto,
            essencial: item.essencial ?? false,
          });
        }
      }
    }
  }

  async atualizarCasorio(id: string, dados: NovoCasorio): Promise<Casorio> {
    const casorio = this.casorios.find((c) => c.id === id);
    if (!casorio) throw new Error(`Casório ${id} não encontrado`);
    casorio.nome = dados.nome;
    casorio.dataCasamento = dados.dataCasamento;
    casorio.orcamentoTotal = dados.orcamentoTotal;
    return casorio;
  }

  async renomearTema(id: string, nome: string): Promise<void> {
    const tema = this.temas.find((t) => t.id === id);
    if (!tema) throw new Error(`Tema ${id} não encontrado`);
    tema.nome = nome;
  }

  async renomearSubtema(id: string, nome: string): Promise<void> {
    const subtema = this.subtemas.find((s) => s.id === id);
    if (!subtema) throw new Error(`Subtema ${id} não encontrado`);
    subtema.nome = nome;
  }

  async atualizarItem(id: string, dados: DadosItem): Promise<Item> {
    const item = this.itens.find((i) => i.id === id);
    if (!item) throw new Error(`Item ${id} não encontrado`);
    Object.assign(item, dados);
    return item;
  }

  // Cascata em memória — espelha o ON DELETE CASCADE do banco (RN03).
  async excluirTema(id: string): Promise<void> {
    const subtemasDoTema = this.subtemas.filter((s) => s.temaId === id).map((s) => s.id);
    this.itens = this.itens.filter((i) => !subtemasDoTema.includes(i.subtemaId));
    this.subtemas = this.subtemas.filter((s) => s.temaId !== id);
    this.temas = this.temas.filter((t) => t.id !== id);
  }

  async excluirSubtema(id: string): Promise<void> {
    this.itens = this.itens.filter((i) => i.subtemaId !== id);
    this.subtemas = this.subtemas.filter((s) => s.id !== id);
  }

  async excluirItem(id: string): Promise<void> {
    this.itens = this.itens.filter((i) => i.id !== id);
  }
}
