// Contato do fornecedor: como transformar o que a pessoa digitou em algo
// clicável. Núcleo PURO — sem DOM, sem rede.
//
// Onde este componente costuma errar:
//  - aceitar "javascript:..." num href (XSS) — só http/https passam
//  - tentar discar um e-mail (ou mandar e-mail pra um telefone)
//  - mostrar a URL inteira e estourar a linha no celular

export interface LinkContato {
  href: string;
  /** "tel" disca, "mail" abre o e-mail. */
  tipo: "tel" | "mail";
}

/** Mínimo de dígitos pra valer como telefone discável (fixo sem DDD = 8). */
const MIN_DIGITOS_TELEFONE = 8;

/**
 * Telefone ou e-mail digitado -> href clicável. `null` quando não dá pra
 * decidir (texto solto tipo "falar com a Ana") — aí a UI só mostra o texto.
 */
export function linkDoContato(contato: string | null): LinkContato | null {
  const texto = (contato ?? "").trim();
  if (!texto) return null;

  if (texto.includes("@")) {
    // e-mail precisa de algo antes do @ e um domínio com ponto depois
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto)) return null;
    return { href: `mailto:${texto}`, tipo: "mail" };
  }

  const digitos = texto.replace(/\D/g, "");
  if (digitos.length < MIN_DIGITOS_TELEFONE) return null;
  const internacional = texto.trimStart().startsWith("+");
  return { href: `tel:${internacional ? "+" : ""}${digitos}`, tipo: "tel" };
}

/**
 * Link digitado -> URL segura. Completa com https:// quando falta o esquema e
 * recusa qualquer coisa que não seja http/https (javascript:, data: etc).
 */
export function normalizarLink(link: string | null): string | null {
  const texto = (link ?? "").trim();
  if (!texto) return null;

  const comEsquema = /^[a-zA-Z][\w+.-]*:/.test(texto) ? texto : `https://${texto}`;
  let url: URL;
  try {
    url = new URL(comEsquema);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname.includes(".")) return null;
  return url.toString();
}

/** Texto curto pro link: "instagram.com/buffet" em vez da URL inteira. */
export function rotuloDoLink(link: string | null): string | null {
  const url = normalizarLink(link);
  if (!url) return null;
  const { hostname, pathname } = new URL(url);
  const host = hostname.replace(/^www\./, "");
  const caminho = pathname.replace(/\/$/, "");
  return caminho ? `${host}${caminho}` : host;
}
