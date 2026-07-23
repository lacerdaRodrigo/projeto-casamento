// Adapter Supabase da porta CasorioRepository. Fala com o Postgres usando o
// client (token do usuário) — o RLS garante o acesso. Aqui só mapeia linhas.
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CasorioRepository,
  DadosItem,
  NovoCasorio,
  NovoItem,
  NovoSubtema,
  NovoTema,
} from "@/ports/casorio-repository";
import type {
  Casorio,
  Item,
  Subtema,
  SubtemaComItens,
  Tema,
  TemaComFilhos,
} from "@/domain/entities";
import type { StatusItem } from "@/domain/status";
import { statusInicial } from "@/domain/status";
import type { Centavos } from "@/domain/money";
import type { TemaTemplate } from "@/domain/template-casorio";

type Row = Record<string, unknown>;

function mapCasorio(r: Row): Casorio {
  return {
    id: r.id as string,
    nome: r.nome as string,
    dataCasamento: (r.data_casamento as string | null) ?? null,
    orcamentoTotal: (r.orcamento_total as number) ?? 0,
  };
}
function mapTema(r: Row): Tema {
  return {
    id: r.id as string,
    casorioId: r.casorio_id as string,
    nome: r.nome as string,
    ordem: (r.ordem as number) ?? 0,
  };
}
function mapSubtema(r: Row): Subtema {
  return {
    id: r.id as string,
    temaId: r.tema_id as string,
    casorioId: r.casorio_id as string,
    nome: r.nome as string,
    ordem: (r.ordem as number) ?? 0,
  };
}
function mapItem(r: Row): Item {
  return {
    id: r.id as string,
    subtemaId: r.subtema_id as string,
    casorioId: r.casorio_id as string,
    titulo: r.titulo as string,
    temCusto: Boolean(r.tem_custo),
    status: r.status as StatusItem,
    custoEstimado: (r.custo_estimado as number) ?? 0,
    custoReal: (r.custo_real as number) ?? 0,
    dataAlvo: (r.data_alvo as string | null) ?? null,
    observacao: (r.observacao as string | null) ?? null,
    essencial: Boolean(r.essencial),
    fornecedorNome: (r.fornecedor_nome as string | null) ?? null,
    fornecedorContato: (r.fornecedor_contato as string | null) ?? null,
    fornecedorLink: (r.fornecedor_link as string | null) ?? null,
    ordem: (r.ordem as number) ?? 0,
  };
}

const byOrdem = (a: { ordem: number }, b: { ordem: number }) => a.ordem - b.ordem;

export class SupabaseCasorioRepository implements CasorioRepository {
  constructor(private readonly sb: SupabaseClient) {}

  async criarCasorio(input: NovoCasorio): Promise<Casorio> {
    // Atenção: NÃO usar .select() no insert. `INSERT ... RETURNING` exige que a
    // linha passe também na policy de SELECT (is_member), mas a associação Dono
    // é criada por trigger AFTER INSERT — que ainda não rodou nesse instante.
    // Por isso geramos o id aqui, inserimos sem retorno e lemos depois.
    const id = crypto.randomUUID();
    const { error } = await this.sb.from("casorio").insert({
      id,
      nome: input.nome,
      data_casamento: input.dataCasamento,
      orcamento_total: input.orcamentoTotal,
    });
    if (error) throw new Error(`criarCasorio: ${error.message}`);

    const { data, error: erroLeitura } = await this.sb
      .from("casorio")
      .select()
      .eq("id", id)
      .single();
    if (erroLeitura) throw new Error(`criarCasorio (leitura): ${erroLeitura.message}`);
    return mapCasorio(data);
  }

  async meuCasorio(): Promise<Casorio | null> {
    const { data, error } = await this.sb
      .from("casorio")
      .select()
      .order("created_at", { ascending: true })
      .limit(1);
    if (error) throw new Error(`meuCasorio: ${error.message}`);
    return data && data.length > 0 ? mapCasorio(data[0]) : null;
  }

  private montarArvore(data: Row[] | null): TemaComFilhos[] {
    const temas = (data ?? []).map((t: Row): TemaComFilhos => {
      const subtemas = (((t.subtema as Row[]) ?? []).map((s): SubtemaComItens => {
        const itens = (((s.item as Row[]) ?? []).map(mapItem)).sort(byOrdem);
        return { ...mapSubtema(s), itens };
      })).sort(byOrdem);
      return { ...mapTema(t), subtemas };
    });
    return temas.sort(byOrdem);
  }

  async getArvore(casorioId: string): Promise<TemaComFilhos[]> {
    const { data, error } = await this.sb
      .from("tema")
      .select("*, subtema(*, item(*))")
      .eq("casorio_id", casorioId);
    if (error) throw new Error(`getArvore: ${error.message}`);
    return this.montarArvore(data);
  }

  async getMinhaArvore(): Promise<TemaComFilhos[]> {
    // Sem filtro por casorio_id: o RLS já limita às linhas do casal (V1 = um
    // casório). Assim roda em paralelo com meuCasorio().
    const { data, error } = await this.sb.from("tema").select("*, subtema(*, item(*))");
    if (error) throw new Error(`getMinhaArvore: ${error.message}`);
    return this.montarArvore(data);
  }

  async meuCasorioComArvore(): Promise<{ casorio: Casorio; arvore: TemaComFilhos[] } | null> {
    // Casório + árvore inteira num embed aninhado só (1 round-trip). RLS escopa.
    const { data, error } = await this.sb
      .from("casorio")
      .select("*, tema(*, subtema(*, item(*)))")
      .order("created_at", { ascending: true })
      .limit(1);
    if (error) throw new Error(`meuCasorioComArvore: ${error.message}`);
    if (!data || data.length === 0) return null;

    const row = data[0];
    return {
      casorio: mapCasorio(row),
      arvore: this.montarArvore((row.tema as Row[]) ?? null),
    };
  }

  async criarTema(input: NovoTema): Promise<Tema> {
    const { data, error } = await this.sb
      .from("tema")
      .insert({ casorio_id: input.casorioId, nome: input.nome, ordem: input.ordem ?? 0 })
      .select()
      .single();
    if (error) throw new Error(`criarTema: ${error.message}`);
    return mapTema(data);
  }

  async criarSubtema(input: NovoSubtema): Promise<Subtema> {
    const { data, error } = await this.sb
      .from("subtema")
      .insert({
        tema_id: input.temaId,
        casorio_id: input.casorioId,
        nome: input.nome,
        ordem: input.ordem ?? 0,
      })
      .select()
      .single();
    if (error) throw new Error(`criarSubtema: ${error.message}`);
    return mapSubtema(data);
  }

  async criarItem(input: NovoItem): Promise<Item> {
    const { data, error } = await this.sb
      .from("item")
      .insert({
        subtema_id: input.subtemaId,
        casorio_id: input.casorioId,
        titulo: input.titulo,
        tem_custo: input.temCusto,
        status: statusInicial(input.temCusto), // domínio decide o inicial (RN05)
        custo_estimado: input.custoEstimado ?? 0,
        data_alvo: input.dataAlvo ?? null,
        essencial: input.essencial ?? false,
      })
      .select()
      .single();
    if (error) throw new Error(`criarItem: ${error.message}`);
    return mapItem(data);
  }

  async mudarStatusItem(
    itemId: string,
    status: StatusItem,
    custoReal: Centavos,
  ): Promise<Item> {
    const { data, error } = await this.sb
      .from("item")
      .update({ status, custo_real: custoReal })
      .eq("id", itemId)
      .select()
      .single();
    if (error) throw new Error(`mudarStatusItem: ${error.message}`);
    return mapItem(data);
  }

  async semearArvore(casorioId: string, temas: readonly TemaTemplate[]): Promise<void> {
    // 3 inserts em lote. Os ids são gerados aqui pra ligar pai↔filho sem precisar
    // de `RETURNING` (que esbarraria na policy de SELECT, como em criarCasorio).
    const linhasTema: Row[] = [];
    const linhasSubtema: Row[] = [];
    const linhasItem: Row[] = [];

    temas.forEach((tema, iTema) => {
      const temaId = crypto.randomUUID();
      linhasTema.push({ id: temaId, casorio_id: casorioId, nome: tema.nome, ordem: iTema });

      tema.subtemas.forEach((subtema, iSub) => {
        const subtemaId = crypto.randomUUID();
        linhasSubtema.push({
          id: subtemaId,
          tema_id: temaId,
          casorio_id: casorioId,
          nome: subtema.nome,
          ordem: iSub,
        });

        subtema.itens.forEach((item, iItem) => {
          linhasItem.push({
            id: crypto.randomUUID(),
            subtema_id: subtemaId,
            casorio_id: casorioId,
            titulo: item.titulo,
            tem_custo: item.temCusto,
            status: statusInicial(item.temCusto), // domínio decide (RN05)
            essencial: item.essencial ?? false,
            ordem: iItem,
          });
        });
      });
    });

    // Ordem importa: filho só entra depois do pai (FK).
    const etapas: [string, Row[]][] = [
      ["tema", linhasTema],
      ["subtema", linhasSubtema],
      ["item", linhasItem],
    ];
    for (const [tabela, linhas] of etapas) {
      if (linhas.length === 0) continue;
      const { error } = await this.sb.from(tabela).insert(linhas);
      if (error) throw new Error(`semearArvore (${tabela}): ${error.message}`);
    }
  }

  async atualizarCasorio(id: string, dados: NovoCasorio): Promise<Casorio> {
    const { data, error } = await this.sb
      .from("casorio")
      .update({
        nome: dados.nome,
        data_casamento: dados.dataCasamento,
        orcamento_total: dados.orcamentoTotal,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(`atualizarCasorio: ${error.message}`);
    return mapCasorio(data);
  }

  async renomearTema(id: string, nome: string): Promise<void> {
    const { error } = await this.sb.from("tema").update({ nome }).eq("id", id);
    if (error) throw new Error(`renomearTema: ${error.message}`);
  }

  async renomearSubtema(id: string, nome: string): Promise<void> {
    const { error } = await this.sb.from("subtema").update({ nome }).eq("id", id);
    if (error) throw new Error(`renomearSubtema: ${error.message}`);
  }

  async atualizarItem(id: string, dados: DadosItem): Promise<Item> {
    const { data, error } = await this.sb
      .from("item")
      .update({
        titulo: dados.titulo,
        tem_custo: dados.temCusto,
        status: dados.status,
        custo_estimado: dados.custoEstimado,
        custo_real: dados.custoReal,
        data_alvo: dados.dataAlvo,
        essencial: dados.essencial,
        observacao: dados.observacao,
        fornecedor_nome: dados.fornecedorNome,
        fornecedor_contato: dados.fornecedorContato,
        fornecedor_link: dados.fornecedorLink,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(`atualizarItem: ${error.message}`);
    return mapItem(data);
  }

  async excluirTema(id: string): Promise<void> {
    const { error } = await this.sb.from("tema").delete().eq("id", id);
    if (error) throw new Error(`excluirTema: ${error.message}`);
  }

  async excluirSubtema(id: string): Promise<void> {
    const { error } = await this.sb.from("subtema").delete().eq("id", id);
    if (error) throw new Error(`excluirSubtema: ${error.message}`);
  }

  async excluirItem(id: string): Promise<void> {
    const { error } = await this.sb.from("item").delete().eq("id", id);
    if (error) throw new Error(`excluirItem: ${error.message}`);
  }
}
