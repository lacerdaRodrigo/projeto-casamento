// Subtema "solto": abriga os itens adicionados DIRETO no tema (sem grupo). É
// oculto na UI — os itens dele aparecem no corpo do tema, sem cabeçalho de
// subtema. Identificado por um nome reservado; a validação de criação/rename
// de subtema rejeita esse nome, então o usuário nunca colide com ele.
export const SUBTEMA_SOLTOS = "(itens do tema)";

/** É o subtema oculto de itens soltos? (não renderiza cabeçalho) */
export function ehSoltos(nome: string): boolean {
  return nome === SUBTEMA_SOLTOS;
}
