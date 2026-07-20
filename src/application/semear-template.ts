// Caso de uso: semear o modelo inicial no casório (RF12 / D09).
// Existe pra a UI não importar o template direto e pra ser testável com repo fake.
import type { CasorioRepository } from "@/ports/casorio-repository";
import { TEMPLATE_CASORIO, contarTemplate } from "@/domain/template-casorio";

export async function semearTemplate(
  repo: CasorioRepository,
  casorioId: string,
): Promise<void> {
  await repo.semearArvore(casorioId, TEMPLATE_CASORIO);
}

/** Contagem do modelo — a UI usa pra avisar o tamanho antes de semear. */
export const TAMANHO_TEMPLATE = contarTemplate();
