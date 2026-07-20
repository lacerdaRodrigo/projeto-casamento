// Entidades do núcleo (puras). Espelham o schema (§5) mas em camelCase e sem infra.
import type { Centavos } from "./money";
import type { StatusItem } from "./status";

export type Papel = "dono" | "editor" | "leitor";

export interface Casorio {
  id: string;
  nome: string;
  dataCasamento: string | null; // ISO date (yyyy-mm-dd)
  orcamentoTotal: Centavos;
}

export interface Membro {
  id: string;
  casorioId: string;
  userId: string;
  papel: Papel;
}

export interface Tema {
  id: string;
  casorioId: string;
  nome: string;
  ordem: number;
}

export interface Subtema {
  id: string;
  temaId: string;
  casorioId: string;
  nome: string;
  ordem: number;
}

export interface Item {
  id: string;
  subtemaId: string;
  casorioId: string;
  titulo: string;
  temCusto: boolean;
  status: StatusItem;
  custoEstimado: Centavos;
  custoReal: Centavos;
  dataAlvo: string | null; // ISO date
  observacao: string | null;
  essencial: boolean;
  fornecedorNome: string | null;
  fornecedorContato: string | null;
  fornecedorLink: string | null;
  ordem: number;
}

// Árvore montada p/ a UI (Tema → Subtema → Item)
export interface SubtemaComItens extends Subtema {
  itens: Item[];
}
export interface TemaComFilhos extends Tema {
  subtemas: SubtemaComItens[];
}
