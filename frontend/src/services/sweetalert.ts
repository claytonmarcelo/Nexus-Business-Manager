import Swal from 'sweetalert2'

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer
    toast.onmouseleave = Swal.resumeTimer
  },
})

export const exibirToast = {
  sucesso: (msg: string) =>
    toast.fire({ icon: 'success', title: msg }),
  erro: (msg: string) =>
    toast.fire({ icon: 'error', title: msg }),
  info: (msg: string) =>
    toast.fire({ icon: 'info', title: msg }),
  warning: (msg: string) =>
    toast.fire({ icon: 'warning', title: msg }),
}

export const confirmarAcao = async (
  titulo: string,
  texto: string,
  confirmarTexto = 'Sim',
  cancelarTexto = 'Cancelar'
): Promise<boolean> => {
  const result = await Swal.fire({
    title: titulo,
    text: texto,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: 'var(--nexus-rose)',
    cancelButtonColor: 'var(--nexus-muted)',
    confirmButtonText: confirmarTexto,
    cancelButtonText: cancelarTexto,
    reverseButtons: true,
    background: 'var(--nexus-card)',
    color: 'var(--nexus-text)',
  })
  return result.isConfirmed
}

export const alertaInfo = (titulo: string, texto: string) =>
  Swal.fire({
    title: titulo,
    text: texto,
    icon: 'info',
    confirmButtonColor: 'var(--nexus-gold)',
    background: 'var(--nexus-card)',
    color: 'var(--nexus-text)',
  })

export const alertaErro = (titulo: string, texto: string) =>
  Swal.fire({
    title: titulo,
    text: texto,
    icon: 'error',
    confirmButtonColor: 'var(--nexus-rose)',
    background: 'var(--nexus-card)',
    color: 'var(--nexus-text)',
  })
