"use client";
// Botão de submit que mostra "Salvando…" enquanto a server action roda, sem
// trocar de tela. Ao CONCLUIR com sucesso, dispara o toast verde.
//
// Como distingue sucesso de erro sem valor de retorno: no sucesso a action NÃO
// navega (fica na tela), então o botão continua montado e o toast agendado
// dispara. No erro a action faz redirect -> a página navega, este componente
// desmonta e o cleanup CANCELA o toast (aí quem mostra o aviso é o ?erro= da
// URL, em vermelho).
import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { dispararToast } from "./toaster-client";

export function SubmitButton({
  children,
  pendente = "Salvando…",
  className,
  mensagemSucesso = "Salvo ✅",
  onConcluir,
}: {
  children: React.ReactNode;
  pendente?: string;
  className?: string;
  /** Texto do toast verde no sucesso. null = não mostrar toast. */
  mensagemSucesso?: string | null;
  onConcluir?: () => void;
}) {
  const { pending } = useFormStatus();
  const antes = useRef(false);

  useEffect(() => {
    const concluiu = antes.current && !pending;
    antes.current = pending;
    if (!concluiu) return;

    onConcluir?.();
    if (mensagemSucesso == null) return;
    // agenda o toast; se a página navegar por erro, o cleanup cancela antes
    const t = window.setTimeout(() => dispararToast(mensagemSucesso, "ok"), 0);
    return () => window.clearTimeout(t);
  }, [pending, mensagemSucesso, onConcluir]);

  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? pendente : children}
    </button>
  );
}
