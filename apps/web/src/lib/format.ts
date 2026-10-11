const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const dateOnly = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

export function formatCurrency(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  return brl.format(Number.isFinite(n) ? n : 0);
}
export function formatDateTime(value: string | Date): string {
  return dateTime.format(new Date(value));
}
export function formatDate(value: string | Date): string {
  return dateOnly.format(new Date(value));
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
  return dateOnly.format(new Date(valor));
}

export function currentYear(): number {
  return new Date().getFullYear();
}
