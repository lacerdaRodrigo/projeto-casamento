// Valor do item com COMPARAÇÃO estimado × real. Quando o real difere do
// estimado, mostra os dois rotulados (estimado = o que planejou; real = o que
// fechou) + a diferença (mais caro ▲ ou economia ▼). Componente puro.
import { formatarBRL } from "@/domain/money";

export function ValorItem({
  temCusto,
  custoEstimado,
  custoReal,
}: {
  temCusto: boolean;
  custoEstimado: number;
  custoReal: number;
}) {
  if (!temCusto) return null;

  const temComparacao = custoReal > 0 && custoEstimado > 0 && custoReal !== custoEstimado;

  if (temComparacao) {
    const diff = custoReal - custoEstimado; // negativo = economizou
    const economizou = diff < 0;
    return (
      <span className="valor-item comparacao">
        <span className="valor-cel">
          <span className="valor-rotulo">estimado</span>
          <span className="valor-estimado">{formatarBRL(custoEstimado)}</span>
        </span>
        <span className="valor-cel">
          <span className="valor-rotulo">real</span>
          <span className="valor-real">{formatarBRL(custoReal)}</span>
        </span>
        <span className="valor-cel">
          <span className="valor-rotulo">{economizou ? "economia" : "mais caro"}</span>
          <span className={`valor-delta ${economizou ? "economia" : "excedeu"}`}>
            {economizou ? "▼" : "▲"} {formatarBRL(Math.abs(diff))}
          </span>
        </span>
      </span>
    );
  }

  // sem comparação: mostra o efetivo (real quando houver, senão o estimado)
  const efetivo = custoReal > 0 ? custoReal : custoEstimado;
  return <span className="valor-item">{formatarBRL(efetivo)}</span>;
}
