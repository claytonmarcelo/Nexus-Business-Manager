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
export function currentYear(): number {
  return new Date().getFullYear();
}
