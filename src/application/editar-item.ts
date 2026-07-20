// Caso de uso: editar item (UC05 / RF06).
//
// A parte que mais erra: trocar o "tem custo" muda o FLUXO do item, então o
// status precisa ser convertido (C2), senão o item fica num estado impossível
// (ex.: "pago" num item sem custo). O banco também barra via CHECK — aqui a
// gente converte antes pra não estourar erro na cara do usuário.
import type { CasorioRepository, DadosItem } from "@/ports/casorio-repository";
import type { Item } from "@/domain/entities";
import type { Centavos } from "@/domain/money";
import { converterAoTrocarTemCusto, validarTransicao, type StatusItem } from "@/domain/status";

export interface EdicaoItem {
  titulo: string;
  temCusto: boolean;
  custoEstimado: Centavos;
  custoReal: Centavos;
  dataAlvo: string | null;
  essencial: boolean;
  observacao: string | null;
  fornecedorNome: string | null;
  fornecedorContato: string | null;
  fornecedorLink: string | null;
}

export async function editarItem(
  repo: CasorioRepository,
  params: {
    itemId: string;
    /** Como o item está hoje — necessário pra saber se o fluxo mudou. */
    statusAtual: StatusItem;
    temCustoAtual: boolean;
    dados: EdicaoItem;
  },
): Promise<Item> {
  const { itemId, statusAtual, temCustoAtual, dados } = params;

  // Mudou de fluxo? Converte o status (C2). Senão, mantém.
  const status: StatusItem =
    dados.temCusto === temCustoAtual
      ? statusAtual
      : converterAoTrocarTemCusto(statusAtual, dados.temCusto);

  // Continua coerente? (RN05/RN06) — ex.: editar um item "pago" e zerar o real.
  const check = validarTransicao({
    temCusto: dados.temCusto,
    novoStatus: status,
    custoRealCentavos: dados.custoReal,
  });
  if (!check.ok) throw new Error(check.erro);

  const paraGravar: DadosItem = { ...dados, status };
  return repo.atualizarItem(itemId, paraGravar);
}
