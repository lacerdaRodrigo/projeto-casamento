// Caso de uso da tela "Montar a árvore": criar tema/subtema por um formulário
// SEMPRE completo (nome + tem custo/valor + essencial), sem passos escondidos.
//
// Regra do redesign: ao criar um tema/subtema já marcando "tem custo" ou
// "essencial", nasce junto um primeiro item de mesmo nome carregando esses
// atributos — assim o dado (custo/essencial só existe em ITEM no domínio) tem
// onde morar. Tema sem custo/essencial nasce vazio (só a categoria).
import type { CasorioRepository } from "@/ports/casorio-repository";
import type { Centavos } from "@/domain/money";

/** Nome do subtema criado automaticamente pra abrigar o item de um tema novo. */
export const SUBTEMA_PADRAO = "Geral";

export interface EntradaTemaCompleto {
  casorioId: string;
  nome: string;
  temCusto: boolean;
  custoEstimado: Centavos;
  essencial: boolean;
}

export interface EntradaSubtemaCompleto {
  temaId: string;
  casorioId: string;
  nome: string;
  temCusto: boolean;
  custoEstimado: Centavos;
  essencial: boolean;
}

/** Cria um tema; se vier com custo/essencial, semeia subtema "Geral" + 1 item. */
export async function criarTemaCompleto(
  repo: CasorioRepository,
  entrada: EntradaTemaCompleto,
): Promise<void> {
  const tema = await repo.criarTema({ casorioId: entrada.casorioId, nome: entrada.nome });
  if (!entrada.temCusto && !entrada.essencial) return;

  const subtema = await repo.criarSubtema({
    temaId: tema.id,
    casorioId: entrada.casorioId,
    nome: SUBTEMA_PADRAO,
  });
  await repo.criarItem({
    subtemaId: subtema.id,
    casorioId: entrada.casorioId,
    titulo: entrada.nome,
    temCusto: entrada.temCusto,
    custoEstimado: entrada.custoEstimado,
    essencial: entrada.essencial,
  });
}

/** Cria um subtema; se vier com custo/essencial, semeia 1 item de mesmo nome. */
export async function criarSubtemaCompleto(
  repo: CasorioRepository,
  entrada: EntradaSubtemaCompleto,
): Promise<void> {
  const subtema = await repo.criarSubtema({
    temaId: entrada.temaId,
    casorioId: entrada.casorioId,
    nome: entrada.nome,
  });
  if (!entrada.temCusto && !entrada.essencial) return;

  await repo.criarItem({
    subtemaId: subtema.id,
    casorioId: entrada.casorioId,
    titulo: entrada.nome,
    temCusto: entrada.temCusto,
    custoEstimado: entrada.custoEstimado,
    essencial: entrada.essencial,
  });
}
