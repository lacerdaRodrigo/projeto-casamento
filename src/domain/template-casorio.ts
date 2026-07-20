// Modelo inicial de casamento (RF12 / D09). Dado PURO — sem infra, sem I/O.
// Serve de ponto de partida: o casal apaga o que não serve e acrescenta o resto.
//
// Convenções:
//  - `temCusto: true` só onde sai dinheiro. Tarefa pura fica false (vira "a fazer → feito").
//  - `essencial: true` no que inviabiliza o casamento se faltar (RN24).

export interface ItemTemplate {
  titulo: string;
  temCusto: boolean;
  essencial?: boolean;
}

export interface SubtemaTemplate {
  nome: string;
  itens: ItemTemplate[];
}

export interface TemaTemplate {
  nome: string;
  subtemas: SubtemaTemplate[];
}

/** Atalhos pra manter a lista legível. */
const tarefa = (titulo: string, essencial = false): ItemTemplate => ({
  titulo,
  temCusto: false,
  essencial,
});
const gasto = (titulo: string, essencial = false): ItemTemplate => ({
  titulo,
  temCusto: true,
  essencial,
});

export const TEMPLATE_CASORIO: readonly TemaTemplate[] = [
  {
    nome: "Planejamento",
    subtemas: [
      {
        nome: "Definições iniciais",
        itens: [
          tarefa("Definir a data do casamento", true),
          tarefa("Definir o orçamento total", true),
          tarefa("Definir o estilo (clássico, rústico, praia…)"),
          tarefa("Estimar número de convidados", true),
        ],
      },
      {
        nome: "Assessoria",
        itens: [
          gasto("Contratar cerimonialista / assessoria"),
          tarefa("Montar o cronograma do dia"),
          tarefa("Definir quem cuida de quê no dia"),
        ],
      },
    ],
  },
  {
    nome: "Local",
    subtemas: [
      {
        nome: "Espaços",
        itens: [
          gasto("Reservar o local da cerimônia", true),
          gasto("Reservar o local da recepção", true),
          tarefa("Visitar as opções finalistas"),
        ],
      },
      {
        nome: "Estrutura do espaço",
        itens: [
          gasto("Climatização"),
          gasto("Gerador de energia"),
          gasto("Manobrista / estacionamento"),
          gasto("Segurança"),
          tarefa("Conferir acessibilidade"),
          tarefa("Definir layout das mesas"),
        ],
      },
    ],
  },
  {
    nome: "Cerimônia",
    subtemas: [
      {
        nome: "Celebração",
        itens: [
          gasto("Contratar celebrante / padre / pastor", true),
          tarefa("Definir o tipo de cerimônia (religiosa, civil, simbólica)", true),
          tarefa("Escrever os votos"),
          tarefa("Definir leituras e participações"),
        ],
      },
      {
        nome: "Documentação civil",
        itens: [
          tarefa("Levantar os documentos exigidos pelo cartório", true),
          gasto("Dar entrada no processo do civil", true),
          tarefa("Agendar a data no cartório", true),
        ],
      },
      {
        nome: "Música da cerimônia",
        itens: [
          gasto("Contratar músicos / cantora da cerimônia"),
          tarefa("Escolher a música da entrada da noiva"),
          tarefa("Escolher músicas dos votos e da saída"),
        ],
      },
    ],
  },
  {
    nome: "Comida",
    subtemas: [
      {
        nome: "Buffet",
        itens: [
          gasto("Contratar o buffet", true),
          tarefa("Agendar degustação"),
          tarefa("Fechar o cardápio"),
          tarefa("Confirmar número final de pratos"),
        ],
      },
      {
        nome: "Salgados e entradas",
        itens: [gasto("Couvert / entradas"), gasto("Salgadinhos do coquetel")],
      },
      {
        nome: "Bolo e doces",
        itens: [
          gasto("Bolo de casamento"),
          gasto("Mesa de doces"),
          gasto("Bem-casados"),
        ],
      },
      {
        nome: "Estações extras",
        itens: [
          gasto("Estação de crepe / massa"),
          gasto("Carrinho de doces ou café"),
          gasto("Food truck da madrugada"),
        ],
      },
    ],
  },
  {
    nome: "Bebidas",
    subtemas: [
      {
        nome: "Não alcoólicas",
        itens: [gasto("Água"), gasto("Refrigerante"), gasto("Suco")],
      },
      {
        nome: "Alcoólicas",
        itens: [
          gasto("Cerveja"),
          gasto("Vinho"),
          gasto("Destilados / caipirinha"),
          gasto("Espumante do brinde"),
        ],
      },
      {
        nome: "Serviço de bar",
        itens: [gasto("Barman / equipe de bar"), gasto("Bar de drinks autorais"), gasto("Gelo e copos")],
      },
    ],
  },
  {
    nome: "Noiva",
    subtemas: [
      {
        nome: "Vestido",
        itens: [
          gasto("Vestido de noiva", true),
          tarefa("Provas do vestido"),
          gasto("Véu e acessórios"),
          gasto("Sapato"),
          gasto("Lingerie e meia"),
        ],
      },
      {
        nome: "Beleza",
        itens: [
          gasto("Cabelo e maquiagem do dia"),
          tarefa("Teste de cabelo e maquiagem"),
          gasto("Manicure e pedicure"),
          tarefa("Cronograma de cuidados com a pele"),
        ],
      },
      {
        nome: "Buquê",
        itens: [gasto("Buquê da noiva"), gasto("Buquê de jogar")],
      },
    ],
  },
  {
    nome: "Noivo",
    subtemas: [
      {
        nome: "Traje",
        itens: [
          gasto("Terno / traje do noivo", true),
          tarefa("Provas do traje"),
          gasto("Sapato"),
          gasto("Gravata, lapela e abotoaduras"),
        ],
      },
      {
        nome: "Beleza",
        itens: [gasto("Barbearia / corte de cabelo"), tarefa("Agendar o corte pra véspera")],
      },
    ],
  },
  {
    nome: "Alianças",
    subtemas: [
      {
        nome: "Alianças",
        itens: [
          gasto("Comprar as alianças", true),
          tarefa("Definir a gravação interna"),
          tarefa("Definir quem leva as alianças"),
        ],
      },
    ],
  },
  {
    nome: "Fotos e vídeo",
    subtemas: [
      {
        nome: "Contratação",
        itens: [gasto("Contratar fotógrafo", true), gasto("Contratar videomaker")],
      },
      {
        nome: "Ensaios e cobertura",
        itens: [
          gasto("Ensaio pré-wedding"),
          tarefa("Agendar o making of"),
          tarefa("Montar a lista de fotos obrigatórias"),
        ],
      },
      {
        nome: "Extras",
        itens: [gasto("Cabine de fotos / totem"), gasto("Drone"), gasto("Álbum impresso")],
      },
    ],
  },
  {
    nome: "Música e festa",
    subtemas: [
      {
        nome: "Atração",
        itens: [gasto("Contratar DJ ou banda", true), gasto("Atração surpresa da pista")],
      },
      {
        nome: "Estrutura",
        itens: [gasto("Som e iluminação"), gasto("Pista de dança"), gasto("Efeitos (gelo seco, sparkles)")],
      },
      {
        nome: "Repertório",
        itens: [
          tarefa("Montar o repertório"),
          tarefa("Escolher a música da primeira dança"),
          tarefa("Lista de músicas proibidas"),
        ],
      },
    ],
  },
  {
    nome: "Decoração e flores",
    subtemas: [
      {
        nome: "Projeto",
        itens: [
          gasto("Contratar decorador"),
          tarefa("Definir a paleta de cores"),
          tarefa("Aprovar o projeto de decoração"),
        ],
      },
      {
        nome: "Cerimônia",
        itens: [gasto("Altar e arranjos da cerimônia"), gasto("Tapete e caminho")],
      },
      {
        nome: "Recepção",
        itens: [
          gasto("Arranjos das mesas"),
          gasto("Iluminação decorativa"),
          gasto("Mobiliário e lounge"),
          gasto("Toalhas e enxoval de mesa"),
        ],
      },
    ],
  },
  {
    nome: "Convites e papelaria",
    subtemas: [
      {
        nome: "Convites",
        itens: [
          gasto("Save the date"),
          gasto("Convites impressos"),
          tarefa("Revisar textos e nomes"),
          tarefa("Entregar / enviar os convites"),
        ],
      },
      {
        nome: "Papelaria do dia",
        itens: [gasto("Menus e tags"), gasto("Placas de sinalização"), gasto("Mapa de mesas")],
      },
    ],
  },
  {
    nome: "Padrinhos e comitiva",
    subtemas: [
      {
        nome: "Convite",
        itens: [
          tarefa("Definir padrinhos e madrinhas"),
          gasto("Caixas-convite"),
          tarefa("Definir damas e pajens"),
        ],
      },
      {
        nome: "Trajes e alinhamento",
        itens: [
          tarefa("Alinhar traje dos padrinhos"),
          gasto("Traje das damas e pajens"),
          tarefa("Repassar o cronograma com a comitiva"),
        ],
      },
    ],
  },
  {
    nome: "Lembranças e presentes",
    subtemas: [
      {
        nome: "Convidados",
        itens: [gasto("Lembrancinhas"), gasto("Kit banheiro"), gasto("Kit ressaca / madrugada")],
      },
      {
        nome: "Presentes",
        itens: [
          gasto("Presente pros padrinhos e madrinhas"),
          gasto("Presente pros pais"),
          tarefa("Organizar a lista de presentes"),
        ],
      },
    ],
  },
  {
    nome: "Transporte e hospedagem",
    subtemas: [
      {
        nome: "Transporte",
        itens: [
          gasto("Carro dos noivos"),
          gasto("Transporte dos convidados"),
          tarefa("Definir rota e horários"),
        ],
      },
      {
        nome: "Hospedagem",
        itens: [
          gasto("Hotel da noite de núpcias"),
          gasto("Bloqueio de quartos pros convidados de fora"),
        ],
      },
    ],
  },
  {
    nome: "Eventos pré-casamento",
    subtemas: [
      {
        nome: "Chás",
        itens: [gasto("Chá de panela"), gasto("Chá bar / chá de lingerie")],
      },
      {
        nome: "Despedidas",
        itens: [gasto("Despedida de solteiro"), gasto("Despedida de solteira")],
      },
      {
        nome: "Ensaio geral",
        itens: [tarefa("Ensaio da cerimônia"), tarefa("Jantar de ensaio")],
      },
    ],
  },
  {
    nome: "Lua de mel",
    subtemas: [
      {
        nome: "Destino",
        itens: [tarefa("Escolher o destino"), tarefa("Definir as datas")],
      },
      {
        nome: "Reservas",
        itens: [gasto("Passagens"), gasto("Hospedagem"), gasto("Passeios e experiências")],
      },
      {
        nome: "Documentos",
        itens: [
          tarefa("Conferir validade do passaporte"),
          tarefa("Verificar necessidade de visto"),
          gasto("Seguro viagem"),
          gasto("Câmbio / moeda"),
        ],
      },
    ],
  },
  {
    nome: "Pós-casamento",
    subtemas: [
      {
        nome: "Fechamento",
        itens: [
          tarefa("Quitar pagamentos finais"),
          tarefa("Devolver itens alugados"),
          tarefa("Conferir pendências com fornecedores"),
        ],
      },
      {
        nome: "Depois da festa",
        itens: [
          tarefa("Escolher as fotos do álbum"),
          tarefa("Agradecer os convidados"),
          tarefa("Avaliar os fornecedores"),
          tarefa("Trocar documentos (mudança de nome)"),
        ],
      },
    ],
  },
] as const;

/** Contagens do modelo — útil pra UI ("~120 itens") e pros testes. */
export function contarTemplate(temas: readonly TemaTemplate[] = TEMPLATE_CASORIO) {
  const subtemas = temas.reduce((n, t) => n + t.subtemas.length, 0);
  const itens = temas.reduce(
    (n, t) => n + t.subtemas.reduce((m, s) => m + s.itens.length, 0),
    0,
  );
  return { temas: temas.length, subtemas, itens };
}
