import {
  abrirAviso,
  abrirConfirmacao,
  abrirConfirmacaoComMotivo,
  type ConfirmActionOptions,
  type ConfirmMotivoOptions,
} from "../components/ConfirmationModal";

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

export type { ConfirmActionOptions, ConfirmMotivoOptions };

export async function confirmAction(opts: ConfirmActionOptions): Promise<boolean> {
  return abrirConfirmacao(opts);
}

/**
 * Confirmação com motivo escrito (P11 / N36, decisão D4).
 *
 * Superfície NOVA, ao lado da antiga: `confirmAction` não mudou de contrato e
 * continua sendo o diálogo sim/não de sempre. Aqui o "sim" só existe depois de
 * uma frase. Uso:
 *
 *   await confirmActionComMotivo({
 *     title: "Cancelar ordem de serviço",
 *     text: "Deseja realmente cancelar a ordem de serviço {nome}?",
 *     nome: "#1042 Troca de correia",
 *     detalhe: "Nada é baixado do estoque, e a ordem deixa de contar no em aberto.",
 *     confirmLabel: "Cancelar ordem",
 *     danger: true,
 *     rotuloMotivo: "Motivo do cancelamento",
 *     ajudaMotivo: "O motivo entra no histórico da ordem.",
 *     maxLength: 500,
 *     action: (motivo) => api.post("/service-orders/" + id + "/status", { status: "CANCELLED", note: motivo }),
 *   });
 *
 * Sem motivo a rota não é chamada nenhuma vez, e o aviso aparece dentro do
 * próprio diálogo.
 */
export async function confirmActionComMotivo(opts: ConfirmMotivoOptions): Promise<boolean> {
  return abrirConfirmacaoComMotivo(opts);
}

/** Aviso informativo de um botão, no mesmo visual (substitui o alert nativo). */
export function alertInfo(title: string, text: string): void {
  void abrirAviso(title, text);
}
