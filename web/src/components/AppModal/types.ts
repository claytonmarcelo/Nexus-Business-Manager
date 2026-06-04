export type ModalType = "success" | "error" | "warning" | "info";

export type AppModalProps = {
  visible: boolean;
  type: ModalType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
};

export const defaultMessages: Record<ModalType, { title: string; message: string }> = {
  success: {
    title: "Sucesso",
    message: "Operação realizada com sucesso.",
  },
  error: {
    title: "Erro",
    message: "Não foi possível concluir a operação. Tente novamente.",
  },
  warning: {
    title: "Atenção",
    message: "Verifique as informações antes de continuar.",
  },
  info: {
    title: "Informação",
    message: "Esta ação está em processamento.",
  },
};
