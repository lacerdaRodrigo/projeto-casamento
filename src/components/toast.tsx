import Link from "next/link";

/**
 * Confirmação do que acabou de acontecer. Vem da URL (`?ok=` ou `?erro=`), some
 * sozinho por animação de CSS e pode ser fechado no ×.
 *
 * `voltarPara` é a URL sem a mensagem — é pra lá que o × leva.
 */
export function Toast({
  mensagem,
  tipo,
  voltarPara,
}: {
  mensagem: string;
  tipo: "ok" | "erro";
  voltarPara: string;
}) {
  return (
    <div className={`toast toast-${tipo}`} role="status" aria-live="polite">
      <span>
        {tipo === "ok" ? "✅" : "⚠️"} {mensagem}
      </span>
      <Link href={voltarPara} className="toast-fechar" aria-label="Fechar aviso">
        ×
      </Link>
    </div>
  );
}
