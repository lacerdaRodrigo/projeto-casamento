// Dinheiro em CENTAVOS (inteiro) — nunca float. (D08 / PRD §6 C1)
// Todo o núcleo trabalha com Centavos; conversão pra Real só nas bordas (UI/input).

export type Centavos = number; // inteiro >= 0 no domínio do casório

/** Real (ex.: 12.50) -> centavos (1250). Arredonda p/ evitar lixo de float. */
export function reaisParaCentavos(reais: number): Centavos {
  return Math.round(reais * 100);
}

/** Centavos (1250) -> Real (12.5). Uso só na borda de leitura. */
export function centavosParaReais(centavos: Centavos): number {
  return centavos / 100;
}

/** Formata centavos como moeda BR: 1250 -> "R$ 12,50". */
export function formatarBRL(centavos: Centavos): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(centavosParaReais(centavos));
}

/** Formata centavos como número BR sem símbolo: 3000050 -> "30.000,50". */
export function formatarNumeroBR(centavos: Centavos): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centavosParaReais(centavos));
}

/**
 * Lê texto digitado em pt-BR e devolve CENTAVOS.
 * "30000" -> 3000000 · "30.000,50" -> 3000050 · "1.234" -> 123400 · "" -> 0
 * Ponto é separador de milhar; vírgula é decimal.
 */
export function parseReaisBR(texto: string): Centavos {
  const limpo = texto.trim().replace(/[^\d.,]/g, "");
  if (!limpo) return 0;
  const normalizado = limpo.replace(/\./g, "").replace(",", ".");
  const valor = Number.parseFloat(normalizado);
  return Number.isFinite(valor) ? Math.round(valor * 100) : 0;
}
