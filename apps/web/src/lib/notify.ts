import toastr from "toastr";

// Toastr global centralizado (seção 28). Configuração única, coerente com o tema.
toastr.options = {
  positionClass: "toast-top-right",
  timeOut: 3800,
  extendedTimeOut: 1200,
  showDuration: 200,
  hideDuration: 200,
  closeButton: true,
  progressBar: true,
  newestOnTop: true,
  preventDuplicates: true,
};

export const notify = {
  success: (msg: string, title = "Sucesso") => toastr.success(msg, title),
  error: (msg: string, title = "Erro") => toastr.error(msg, title),
  info: (msg: string, title = "Informação") => toastr.info(msg, title),
  warning: (msg: string, title = "Atenção") => toastr.warning(msg, title),
};
