"use client";
// Campo de dinheiro em pt-BR. Mostra "30.000,00", envia CENTAVOS (inteiro) no
// hidden — o servidor/domínio nunca vê float nem texto formatado. (D08)
import { useState } from "react";
import { formatarNumeroBR, parseReaisBR } from "@/domain/money";

export function CampoDinheiro({
  name,
  placeholder = "0,00",
  defaultCentavos = 0,
  "aria-label": ariaLabel,
}: {
  name: string;
  placeholder?: string;
  defaultCentavos?: number;
  "aria-label"?: string;
}) {
  const [texto, setTexto] = useState(
    defaultCentavos > 0 ? formatarNumeroBR(defaultCentavos) : "",
  );
  const centavos = parseReaisBR(texto);

  return (
    <>
      <input
        type="text"
        inputMode="decimal"
        value={texto}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => setTexto(centavos > 0 ? formatarNumeroBR(centavos) : "")}
      />
      <input type="hidden" name={name} value={centavos} />
    </>
  );
}
