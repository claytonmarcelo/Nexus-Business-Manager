import { abrirAviso, abrirConfirmacao, type ConfirmActionOptions } from "../components/ConfirmationModal";

// ===== Superfície pública das confirmações (seção 29 do PROMPT MESTRE) =====
// Toda página importa daqui; quem renderiza é o diálogo React do design system
// (components/ConfirmationModal.tsx), montado em Portal no fim do body com o
// mesmo scrim, animação e armadilha de foco do modal do sistema.
//
// Regra da casa: nenhum alert/confirm/prompt nativo e nenhum modal de
// confirmação inventado por página. Se precisa perguntar antes de agir, é:
//
//   await confirmAction({
//     title: "Desativar cliente",
//     text: "Tem certeza de que deseja desativar o cliente {nome}?",
//     nome: row.name,
//     detalhe: "Ele sai das novas vendas; o histórico fica guardado.",
//     confirmLabel: "Desativar",
//     danger: true,
//     action: () => api.delete("/clients/" + row.id),  // spinner + sem duplo clique
//   });

export type { ConfirmActionOptions };

export async function confirmAction(opts: ConfirmActionOptions): Promise<boolean> {
  return abrirConfirmacao(opts);
}

/** Aviso informativo de um botão, no mesmo visual (substitui o alert nativo). */
export function alertInfo(title: string, text: string): void {
  void abrirAviso(title, text);
}
