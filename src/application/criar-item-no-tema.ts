// Caso de uso: adicionar um item com preço DIRETO no tema (sem subtema visível).
// O item cai no subtema "solto" oculto do tema (criado sob demanda). A UI mostra
// esses itens no corpo do tema, sem cabeçalho de subtema.
import type { CasorioRepository } from "@/ports/casorio-repository";
import type { Centavos } from "@/domain/money";

export interface EntradaItemNoTema {
  temaId: string;
  casorioId: string;
  titulo: string;
  temCusto: boolean;
  custoEstimado: Centavos;
  dataAlvo?: string | null;
  essencial: boolean;
}

export async function criarItemNoTema(
  repo: CasorioRepository,
  entrada: EntradaItemNoTema,
): Promise<void> {
  const soltos = await repo.garantirSubtemaPadrao(entrada.temaId, entrada.casorioId);
  await repo.criarItem({
    subtemaId: soltos.id,
    casorioId: entrada.casorioId,
    titulo: entrada.titulo,
    temCusto: entrada.temCusto,
    custoEstimado: entrada.custoEstimado,
    dataAlvo: entrada.dataAlvo ?? null,
    essencial: entrada.essencial,
  });
}
