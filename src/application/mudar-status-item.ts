// Caso de uso: mudar status do item (UC06). Valida no domínio (C2/RN05-06)
// ANTES de persistir. Testável com repo fake (sem banco).
import type { CasorioRepository } from "@/ports/casorio-repository";
import type { Item } from "@/domain/entities";
import type { Centavos } from "@/domain/money";
import { validarTransicao, type StatusItem } from "@/domain/status";

export async function mudarStatusItem(
  repo: CasorioRepository,
  params: { itemId: string; temCusto: boolean; novoStatus: StatusItem; custoReal: Centavos },
): Promise<Item> {
  const check = validarTransicao({
    temCusto: params.temCusto,
    novoStatus: params.novoStatus,
    custoRealCentavos: params.custoReal,
  });
  if (!check.ok) throw new Error(check.erro);
  return repo.mudarStatusItem(params.itemId, params.novoStatus, params.custoReal);
}
