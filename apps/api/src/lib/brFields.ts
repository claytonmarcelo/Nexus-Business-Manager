// ===== Regras brasileiras de campo que o servidor precisa conhecer =====
// As telas espelham estas regras em apps/web/src/lib/validators.ts para avisar
// antes de bater na porta, mas quem decide é daqui: nenhum cliente está
// autorizado a dizer que um CNPJ existe. Nada neste arquivo pede biblioteca
// nova — dígito verificador, CEP, UF e fuso horário são checáveis com o que o
// próprio runtime já traz.

const DIGITOS = /\D/g;

/** Só os algarismos, descartando máscara ("12.345.678/0001-99" → "12345678000199"). */
export function somenteDigitos(valor: string): string {
  return valor.replace(DIGITOS, "");
}

// 27 unidades da federação. A lista existe porque "XX" tem dois dígitos e é
// texto: sem ela, qualquer sigla passaria.
export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export function ufValida(valor: string): boolean {
  return (UFS as readonly string[]).includes(valor.toUpperCase());
}

// CNPJ: 14 dígitos e os dois dígitos verificadores batendo. Sequência repetida
// (11111111111111) passa na conta e não existe, por isso sai antes.
export function cnpjValido(valor: string): boolean {
  const d = somenteDigitos(valor);
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;
  return digitoVerificador(d, PESOS_PRIMEIRO) === Number(d[12]) &&
    digitoVerificador(d, PESOS_SEGUNDO) === Number(d[13]);
}

const PESOS_PRIMEIRO = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_SEGUNDO = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function digitoVerificador(digits: string, pesos: number[]): number {
  let soma = 0;
  for (let i = 0; i < pesos.length; i += 1) {
    const peso = pesos[i];
    const algarismo = digits[i];
    if (peso === undefined || algarismo === undefined) continue;
    soma += peso * Number(algarismo);
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

// CPF: 11 dígitos e os dois verificadores batendo, pela mesma conta do CNPJ.
// Sequência repetida (11111111111) passa na conta e não existe, por isso sai
// antes. A chave PIX de pessoa física é o caso de uso que mais pede esta função:
// dígito trocado manda o recebimento para o CPF de outra pessoa.
export function cpfValido(valor: string): boolean {
  const d = somenteDigitos(valor);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;
  if (digitoVerificador(d, PESOS_CPF_PRIMEIRO) !== Number(d[9])) return false;
  return digitoVerificador(d, PESOS_CPF_SEGUNDO) === Number(d[10]);
}

const PESOS_CPF_PRIMEIRO = [10, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_CPF_SEGUNDO = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];

// CEP: oito dígitos e não "00000000". A faixa completa dos Correios exigiria
// tabela de bairro — o que pega cadastro errado aqui é o formato.
export function cepValido(valor: string): boolean {
  const d = somenteDigitos(valor);
  return /^\d{8}$/.test(d) && !/^0{8}$/.test(d);
}

// Telefone no padrão do Brasil: DDD (11 a 99, nunca começando em 0) seguido de
// 8 ou 9 algarismos — 10 no total para fixo, 11 para celular. O primeiro dígito
// do número não é 0 porque nenhuma operação brasileira começa com zero depois
// do DDD.
export function telefoneValido(valor: string): boolean {
  const d = somenteDigitos(valor);
  return /^[1-9]\d[1-9]\d{7,8}$/.test(d);
}

// Mesma regra da tela (apps/web/src/lib/validators.ts): "a@b" não é endereço.
export function emailValido(valor: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor.trim());
}

// Endereço da logo: http(s) completo. Upload de arquivo ainda não existe no
// produto, então o que se cadastra aqui é a URL de onde a imagem mora.
export function urlValida(valor: string): boolean {
  try {
    const url = new URL(valor);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Moedas aceitas. Toda linha daqui é ISO 4217 e tem suporte real no
// Intl.DateTimeFormat do navegador e do Node, então o valor cadastrado muda o
// formato na tela e não só o texto do cadastro.
export const MOEDAS = [
  { codigo: "BRL", rotulo: "Real brasileiro" },
  { codigo: "USD", rotulo: "Dólar americano" },
  { codigo: "CAD", rotulo: "Dólar canadense" },
  { codigo: "AUD", rotulo: "Dólar australiano" },
  { codigo: "EUR", rotulo: "Euro" },
  { codigo: "GBP", rotulo: "Libra esterlina" },
  { codigo: "CHF", rotulo: "Franco suíço" },
  { codigo: "JPY", rotulo: "Iene japonês" },
  { codigo: "CNY", rotulo: "Yuan chinês" },
  { codigo: "ARS", rotulo: "Peso argentino" },
  { codigo: "UYU", rotulo: "Peso uruguaio" },
  { codigo: "MXN", rotulo: "Peso mexicano" },
] as const;

// Idiomas aceitos. O efeito é o formato de números e datas (o texto da
// interface do painel é só em português, e a tela diz isso).
export const IDIOMAS = [
  { codigo: "pt-BR", rotulo: "Português (Brasil)" },
  { codigo: "en-US", rotulo: "Inglês (Estados Unidos)" },
  { codigo: "es-ES", rotulo: "Espanhol (Espanha)" },
] as const;

export function moedaValida(valor: string): boolean {
  return (MOEDAS as readonly { codigo: string }[]).some((m) => m.codigo === valor.toUpperCase());
}

export function idiomaValido(valor: string): boolean {
  return (IDIOMAS as readonly { codigo: string }[]).some((i) => i.codigo === valor);
}

// Fusos sugeridos na tela, na ordem do mapa: começando pelo horário de Brasília
// e descendo pelos outros fusos do país, com o UTC à disposição de quem opera
// fora do Brasil.
export const FUSOS_BRASIL = [
  "America/Sao_Paulo",
  "America/Belem",
  "America/Manaus",
  "America/Boa_Vista",
  "America/Rio_Branco",
  "America/Porto_Velho",
  "America/Cuiaba",
  "America/Campo_Grande",
  "America/Fortaleza",
  "America/Recife",
  "America/Maceio",
  "America/Natal",
  "America/Araguana",
  "America/Santarem",
  "America/Guayana",
  "America/Noronha",
  "UTC",
] as const;

const IntlComTabela = Intl as typeof Intl & {
  supportedValuesOf?: (chave: "timeZone") => string[];
};

// Fuso é nome IANA ("America/Sao_Paulo") ou o "UTC" avulso. A tabela do runtime é
// a referência, mas ela não traz o "UTC" — mesmo sendo um fuso que o Intl formata
// — então o construtor fecha o resto. O formato é checado antes porque o
// construtor também aceita "+03:00" e "utc", que não são o que a tela oferece.
export function fusoValido(valor: string): boolean {
  const nome = valor.trim();
  const formatoOk = nome === "UTC" || /^[A-Z][A-Za-z_]*(?:\/[A-Za-z0-9_+-]+)+$/.test(nome);
  if (!formatoOk) return false;
  const lista = IntlComTabela.supportedValuesOf?.("timeZone");
  if (lista && lista.length > 0 && lista.includes(nome)) return true;
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: nome });
    return true;
  } catch {
    return false;
  }
}
