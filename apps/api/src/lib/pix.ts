// ===== Chave PIX: a régua por tipo, do cadastro do gateway à cobrança avulsa =====
import { cnpjValido, cpfValido, emailValido, somenteDigitos, telefoneValido } from "./brFields";

// A chave PIX é o endereço do dinheiro: quem erra uma tecla aqui manda o
// pagamento do cliente para a conta de outra pessoa, e dinheiro enviado por chave
// errada não volta com um clique. Por isso a régua é por TIPO, a mesma do Bacen,
// e ela vale para o cadastro do gateway e para a cobrança avulsa — uma só casa.
//
// Nada neste arquivo inventa validação: CPF e CNPJ reusam o dígito verificador de
// lib/brFields.ts, e telefone/e-mail reusam as mesmas funções que já julgam o
// cadastro de clientes e fornecedores. O que é próprio do PIX é o formato da
// chave: o telefone pode vir com o "55" do país à frente, e a aleatória aceita
// letra, número e hífen até 125 caracteres.

export const TIPOS_CHAVE_PIX = ["CPF", "CNPJ", "EMAIL", "TELEFONE", "ALEATORIA"] as const;

export type TipoChavePix = (typeof TIPOS_CHAVE_PIX)[number];

export function ehTipoChavePix(valor: string): valor is TipoChavePix {
  return (TIPOS_CHAVE_PIX as readonly string[]).includes(valor);
}

export function chavePixValida(tipo: TipoChavePix, valor: string): boolean {
  const bruto = (valor ?? "").trim();
  if (bruto === "") return false;
  switch (tipo) {
    case "CPF":
      return cpfValido(bruto);
    case "CNPJ":
      return cnpjValido(bruto);
    case "EMAIL":
      // 125 caracteres é o teto da chave no array do Bacen; o formato é o mesmo
      // que a ficha cadastral já exige.
      return bruto.length <= 125 && emailValido(bruto);
    case "TELEFONE": {
      const digitos = somenteDigitos(bruto);
      if (digitos.length > 13) return false;
      // "+55 11 98765-4321" e "11987654321" são a mesma chave. O 55 só é retirado
      // quando sobram os 10/11 dígitos do disco nacional — um número de 13 dígitos
      // que não começa com 55 continua sendo um número de 13 dígitos, e é inválido.
      const semPais = digitos.length > 11 && digitos.startsWith("55") ? digitos.slice(2) : digitos;
      return telefoneValido(semPais);
    }
    case "ALEATORIA":
      return bruto.length <= 125;
  }
}

/**
 * A forma que vai para o banco. O documento mantém a máscara que a pessoa
 * escreveu (é assim que ela o reconhece no papel), e o e-mail desce para
 * minúscula porque é o único dos cinco tipos em que a igualdade depende de caixa.
 */
export function normalizarChavePix(tipo: TipoChavePix, valor: string): string {
  const bruto = valor.trim();
  return tipo === "EMAIL" ? bruto.toLowerCase() : bruto;
}

/** O motivo dito em bom português — a régua muda por tipo, e a mensagem também. */
export function mensagemChaveInvalida(tipo: TipoChavePix): string {
  switch (tipo) {
    case "CPF":
      return "A chave PIX de CPF precisa ter 11 dígitos com os verificadores corretos";
    case "CNPJ":
      return "A chave PIX de CNPJ precisa ter 14 dígitos com os verificadores corretos";
    case "EMAIL":
      return "A chave PIX de e-mail precisa ser um endereço completo (nome@dominio.com.br)";
    case "TELEFONE":
      return "A chave PIX de telefone precisa ter DDD e número, com ou sem o 55 do país";
    case "ALEATORIA":
      return "A chave PIX aleatória precisa ter entre 1 e 125 caracteres";
  }
}
