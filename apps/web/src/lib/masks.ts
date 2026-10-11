// ===== Máscaras de digitação =====
// Máscara não é validação: ela só organiza os algarismos que a pessoa já
// digitou. Quem decide se um CNPJ existe é a API (apps/api/src/lib/brFields.ts)
// — o dígito verificador não se confere aqui de propósito, para a tela não
// guardar uma segunda cópia da regra que pode divergir da primeira. O que o
// campo mostra como erro é o texto que o servidor devolveu naquele caminho.

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** 12.345.678/0001-90, progressiva: funciona com 3 algarismos digitados. */
export function mascaraCnpj(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return d.slice(0, 2) + "." + d.slice(2);
  if (d.length <= 8) return d.slice(0, 2) + "." + d.slice(2, 5) + "." + d.slice(5);
  if (d.length <= 12) return d.slice(0, 2) + "." + d.slice(2, 5) + "." + d.slice(5, 8) + "/" + d.slice(8);
  return d.slice(0, 2) + "." + d.slice(2, 5) + "." + d.slice(5, 8) + "/" + d.slice(8, 12) + "-" + d.slice(12);
}

/** (11) 98888-7777 no celular, (11) 3333-4444 no fixo — o corte é de 5 ou 4. */
export function mascaraTelefone(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return "(" + d;
  const tamanhoLocal = d.length > 10 ? 5 : 4;
  const corpo = d.slice(2, 2 + tamanhoLocal);
  const resto = d.slice(2 + tamanhoLocal);
  return "(" + d.slice(0, 2) + ") " + corpo + (resto ? "-" + resto : "");
}

/** 01310-100 */
export function mascaraCep(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 8);
  return d.length <= 5 ? d : d.slice(0, 5) + "-" + d.slice(5);
}

export type TipoMascara = "cnpj" | "telefone" | "cep";

const MASCARAS: Record<TipoMascara, (valor: string) => string> = {
  cnpj: mascaraCnpj,
  telefone: mascaraTelefone,
  cep: mascaraCep,
};

/** Aplica a máscara do tipo, ou devolve o texto como veio quando não tem tipo. */
export function mascarar(tipo: TipoMascara | undefined, valor: string): string {
  return tipo ? MASCARAS[tipo](valor) : valor;
}
