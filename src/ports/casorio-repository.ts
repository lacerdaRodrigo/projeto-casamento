// Porta de persistência (contrato). Adapters (Supabase) implementam.
// O núcleo/aplicação NÃO conhece Supabase — só esta interface. (PRD §4.4)
import type { Centavos } from "@/domain/money";
import type { StatusItem } from "@/domain/status";
import type { Casorio, Item, Subtema, Tema, TemaComFilhos } from "@/domain/entities";
import type { TemaTemplate } from "@/domain/template-casorio";

export interface NovoCasorio {
  nome: string;
  dataCasamento: string | null;
  orcamentoTotal: Centavos;
}

export interface NovoTema {
  casorioId: string;
  nome: string;
  ordem?: number;
}

export interface NovoSubtema {
  temaId: string;
  casorioId: string;
  nome: string;
  ordem?: number;
}

export interface NovoItem {
  subtemaId: string;
  casorioId: string;
  titulo: string;
  temCusto: boolean;
  custoEstimado?: Centavos;
  dataAlvo?: string | null;
  essencial?: boolean;
}

/** Campos editáveis de um item (RF06). O status vem calculado pelo caso de uso. */
export interface DadosItem {
  titulo: string;
  temCusto: boolean;
  status: StatusItem;
  custoEstimado: Centavos;
  custoReal: Centavos;
  dataAlvo: string | null;
  essencial: boolean;
  observacao: string | null;
  fornecedorNome: string | null;
  fornecedorContato: string | null;
  fornecedorLink: string | null;
}

export interface CasorioRepository {
  /** Cria o casório; o backend torna o criador Dono (trigger). */
  criarCasorio(input: NovoCasorio): Promise<Casorio>;
  /** Primeiro casório do usuário logado (V1 = um só), ou null. */
  meuCasorio(): Promise<Casorio | null>;
  /** Árvore completa Tema→Subtema→Item de um casório. */
  getArvore(casorioId: string): Promise<TemaComFilhos[]>;
  /**
   * Árvore do casório do usuário logado, SEM precisar do id antes (o RLS já
   * escopa às linhas do casal — V1 = um casório só). Permite carregar casório e
   * árvore em paralelo, cortando um round-trip por navegação.
   */
  getMinhaArvore(): Promise<TemaComFilhos[]>;
  criarTema(input: NovoTema): Promise<Tema>;
  criarSubtema(input: NovoSubtema): Promise<Subtema>;
  criarItem(input: NovoItem): Promise<Item>;
  /** Muda o status do item (custo real em centavos quando exigido). */
  mudarStatusItem(itemId: string, status: StatusItem, custoReal: Centavos): Promise<Item>;

  /** Grava uma árvore inteira de uma vez (modelo inicial — RF12/D09). */
  semearArvore(casorioId: string, temas: readonly TemaTemplate[]): Promise<void>;

  /** Edições (RF04/RF05/RF06/RF09). */
  atualizarCasorio(id: string, dados: NovoCasorio): Promise<Casorio>;
  renomearTema(id: string, nome: string): Promise<void>;
  renomearSubtema(id: string, nome: string): Promise<void>;
  atualizarItem(id: string, dados: DadosItem): Promise<Item>;

  /** Exclusões. Levam os filhos junto — cascata garantida no banco (RN03). */
  excluirTema(id: string): Promise<void>;
  excluirSubtema(id: string): Promise<void>;
  excluirItem(id: string): Promise<void>;
}
