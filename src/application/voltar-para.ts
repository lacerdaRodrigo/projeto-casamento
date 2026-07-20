// Monta o destino do redirect depois de uma ação, preservando os filtros da URL
// e anexando a mensagem (sucesso ou erro). Puro e testável.

/**
 * Só aceita caminho interno começando com uma única "/" — bloqueia redirect
 * pra fora do site ("//evil.com" ou "https://evil.com"). Todo dado externo é
 * hostil, inclusive um campo escondido de formulário (§9).
 */
export function destinoSeguro(voltarPara: unknown): string {
  if (typeof voltarPara !== "string") return "/";
  if (!voltarPara.startsWith("/") || voltarPara.startsWith("//")) return "/";
  return voltarPara;
}

/**
 * Devolve a URL de volta com `ok=` ou `erro=`, mantendo os filtros que já
 * estavam na query. Mensagens antigas são descartadas.
 */
export function urlComMensagem(
  voltarPara: unknown,
  chave: "ok" | "erro",
  mensagem: string,
): string {
  const destino = destinoSeguro(voltarPara);
  // a âncora (#item-xxx) leva de volta ao ponto da página onde você estava
  const [semHash, hash = ""] = destino.split("#");
  const [caminho, query = ""] = semHash.split("?");
  const params = new URLSearchParams(query);
  params.delete("ok");
  params.delete("erro");
  params.set(chave, mensagem);
  return `${caminho}?${params.toString()}${hash ? `#${hash}` : ""}`;
}
