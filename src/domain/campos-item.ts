// Quais campos fazem sentido pra CADA item — curadoria por tema/subtema.
// Núcleo puro, sem infra. Nasce da ideia de que um formulário genérico é burro:
// "Definir a data do casamento" não tem fornecedor nem telefone; "Reservar o
// local" tem os dois. Quem decide isso é julgamento humano, não regra automática.

export type PerfilItem =
  /** Decisão ou combinado interno. Sem dinheiro, sem fornecedor. */
  | "tarefa"
  /** Produto que se compra, sem contrato pra cobrar depois. */
  | "compra"
  /** Serviço com fornecedor pra cobrar: nome, telefone, link. */
  | "contratacao"
  /** Burocracia com taxa, mas sem fornecedor comercial. */
  | "documento";

export interface CamposRelevantes {
  /** Custo estimado e custo real. */
  dinheiro: boolean;
  /** Nome, telefone e link do fornecedor. */
  fornecedor: boolean;
}

/** Subtema desconhecido (renomeado ou criado pelo casal) erra pro lado limpo. */
export const PERFIL_PADRAO: PerfilItem = "compra";

/**
 * Mapa curado à mão: `tema → subtema → perfil`.
 * A chave é o par tema+subtema porque nomes de subtema se repetem entre temas
 * ("Beleza" em Noiva e Noivo; "Cerimônia" é tema e também subtema de Decoração).
 */
const CURADORIA: Record<string, Record<string, PerfilItem>> = {
  Planejamento: {
    "Definições iniciais": "tarefa", // definir data, orçamento, estilo
    Assessoria: "contratacao", // cerimonialista é fornecedor
  },
  Local: {
    Espaços: "contratacao", // salão, igreja — contrato e contato
    "Estrutura do espaço": "contratacao", // gerador, manobrista, segurança
  },
  Cerimônia: {
    Celebração: "contratacao", // celebrante
    "Documentação civil": "documento", // taxas do cartório, sem fornecedor
    "Música da cerimônia": "contratacao", // músicos, cantora
  },
  Comida: {
    Buffet: "contratacao",
    "Salgados e entradas": "compra", // itens do cardápio, cobrados pelo buffet
    "Bolo e doces": "contratacao", // confeiteira é fornecedor à parte
    "Estações extras": "contratacao", // food truck, crepe
  },
  Bebidas: {
    "Não alcoólicas": "compra", // água, refrigerante, suco
    Alcoólicas: "compra",
    "Serviço de bar": "contratacao", // barman, bar de drinks
  },
  Noiva: {
    Vestido: "contratacao", // ateliê
    Beleza: "contratacao", // cabelo e maquiagem
    Buquê: "contratacao", // florista
  },
  Noivo: {
    Traje: "contratacao", // alfaiataria ou aluguel
    Beleza: "contratacao", // barbearia
  },
  Alianças: {
    Alianças: "contratacao", // joalheria
  },
  "Fotos e vídeo": {
    Contratação: "contratacao",
    "Ensaios e cobertura": "contratacao",
    Extras: "contratacao", // cabine, drone, álbum
  },
  "Música e festa": {
    Atração: "contratacao", // DJ, banda
    Estrutura: "contratacao", // som e iluminação
    Repertório: "tarefa", // escolher músicas é decisão
  },
  "Decoração e flores": {
    Projeto: "contratacao", // decorador
    Cerimônia: "contratacao", // arranjos, florista
    Recepção: "contratacao",
  },
  "Convites e papelaria": {
    Convites: "contratacao", // gráfica ou designer
    "Papelaria do dia": "compra", // menus, tags, placas
  },
  "Padrinhos e comitiva": {
    Convite: "compra", // caixas-convite
    "Trajes e alinhamento": "compra",
  },
  "Lembranças e presentes": {
    Convidados: "compra", // lembrancinhas, kits
    Presentes: "compra",
  },
  "Transporte e hospedagem": {
    Transporte: "contratacao", // locadora, motorista
    Hospedagem: "contratacao", // hotel
  },
  "Eventos pré-casamento": {
    Chás: "compra",
    Despedidas: "compra",
    "Ensaio geral": "tarefa",
  },
  "Lua de mel": {
    Destino: "tarefa", // escolher destino e datas
    Reservas: "contratacao", // passagens, hospedagem, passeios
    Documentos: "documento", // passaporte, visto, seguro, câmbio
  },
  "Pós-casamento": {
    Fechamento: "tarefa",
    "Depois da festa": "tarefa",
  },
};

/** Perfil curado do par tema+subtema, ou o padrão se não estiver no mapa. */
export function perfilDoSubtema(temaNome: string, subtemaNome: string): PerfilItem {
  return CURADORIA[temaNome]?.[subtemaNome] ?? PERFIL_PADRAO;
}

/**
 * Campos que o formulário deve mostrar.
 *
 * `dinheiro` segue o **tem custo**, não o perfil: assim "Visitar as opções
 * finalistas", que mora num subtema de contratação mas não custa nada, não
 * mostra campo de valor.
 */
export function camposDoItem(perfil: PerfilItem, temCusto: boolean): CamposRelevantes {
  return {
    dinheiro: temCusto,
    fornecedor: temCusto && perfil === "contratacao",
  };
}

/** Atalho: resolve o perfil e já devolve os campos. */
export function camposDoItemNaArvore(params: {
  temaNome: string;
  subtemaNome: string;
  temCusto: boolean;
}): CamposRelevantes {
  return camposDoItem(perfilDoSubtema(params.temaNome, params.subtemaNome), params.temCusto);
}

/** Só pra teste/diagnóstico: quais pares tema›subtema estão curados. */
export function paresCurados(): string[] {
  return Object.entries(CURADORIA).flatMap(([tema, subs]) =>
    Object.keys(subs).map((sub) => `${tema} › ${sub}`),
  );
}
