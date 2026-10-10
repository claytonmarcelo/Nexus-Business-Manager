import Swal from "sweetalert2";

// Estratégia centralizada de confirmação (seção 29). Nunca usar alert/confirm/prompt nativos.
export async function confirmAction(opts: {
  title: string;
  text: string;
  confirmLabel?: string;
  danger?: boolean;
}): Promise<boolean> {
  const result = await Swal.fire({
    title: opts.title,
    text: opts.text,
    icon: opts.danger ? "warning" : "question",
    showCancelButton: true,
    confirmButtonText: opts.confirmLabel ?? "Confirmar",
    cancelButtonText: "Cancelar",
    reverseButtons: true,
    focusCancel: opts.danger,
  });
  return result.isConfirmed;
}

export function alertInfo(title: string, text: string): void {
  void Swal.fire({ title, text, icon: "info", confirmButtonText: "Entendi" });
}
