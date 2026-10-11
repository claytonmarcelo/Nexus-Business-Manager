// As telas formatam dinheiro, data e hora a partir daqui. A empresa escolhe moeda, fuso
// e idioma nas Configurações, e o AuthProvider avisa este módulo quando a sessão muda.
// Enquanto ninguém avisa — vitrine pública, testes, provas de navegador — vale o padrão
// brasileiro, que é exatamente o resultado de sempre.
export interface PreferenciaFormato {
  moeda: string;
  fuso: string;
  idioma: string;
}

const PADRAO: PreferenciaFormato = { moeda: "BRL", fuso: "America/Sao_Paulo", idioma: "pt-BR" };

function montarFormatos(preferencia: PreferenciaFormato) {
  return {
    moeda: new Intl.NumberFormat(preferencia.idioma, { style: "currency", currency: preferencia.moeda }),
    dataHora: new Intl.DateTimeFormat(preferencia.idioma, {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: preferencia.fuso,
    }),
    data: new Intl.DateTimeFormat(preferencia.idioma, { dateStyle: "short", timeZone: preferencia.fuso }),
  };
}

let ativo = PADRAO;
let formatos = montarFormatos(ativo);

// O idioma escolhido pela empresa muda a escrita de números e datas; o texto da
// interface continua em português, que é o idioma do produto.
// Null (ou ausência) volta ao padrão: é o que acontece ao encerrar a sessão.
export function configurarFormatos(novo: Partial<PreferenciaFormato> | null): void {
  const candidato: PreferenciaFormato =
    novo === null
      ? PADRAO
      : {
          moeda: novo.moeda ?? ativo.moeda,
          fuso: novo.fuso ?? ativo.fuso,
          idioma: novo.idioma ?? ativo.idioma,
        };
  if (candidato.moeda === ativo.moeda && candidato.fuso === ativo.fuso && candidato.idioma === ativo.idioma) return;
  try {
    formatos = montarFormatos(candidato);
  } catch {
    // Um valor impossível não pode derrubar todas as telas: fica o formato anterior.
    return;
  }
  ativo = candidato;
}

export function formatCurrency(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  return formatos.moeda.format(Number.isFinite(n) ? n : 0);
}
export function formatDateTime(value: string | Date): string {
  return formatos.dataHora.format(new Date(value));
}
export function formatDate(value: string | Date): string {
  return formatos.data.format(new Date(value));
}
// Tempo relativo para a lista de avisos: "há 12 min" diz mais que um horário
// exato quando se está varrendo o que a equipe fez hoje. O instante completo
// continua no title da linha.
export function tempoRelativo(valor: string | Date, agora: Date = new Date()): string {
  const alvo = new Date(valor).getTime();
  if (!Number.isFinite(alvo)) return "";
  const segundos = Math.round((agora.getTime() - alvo) / 1000);
  if (segundos < 45) return "agora mesmo";
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return "há " + minutos + " " + (minutos === 1 ? "minuto" : "minutos");
  const horas = Math.round(minutos / 60);
  if (horas < 24) return "há " + horas + " " + (horas === 1 ? "hora" : "horas");
  const dias = Math.round(horas / 24);
  if (dias === 1) return "ontem";
  if (dias < 31) return "há " + dias + " dias";
  return formatos.data.format(new Date(valor));
}

export function currentYear(): number {
  return new Date().getFullYear();
}
