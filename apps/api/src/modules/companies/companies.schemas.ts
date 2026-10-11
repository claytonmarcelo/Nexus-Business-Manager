import { z } from "zod";
import {
  cepValido, cnpjValido, emailValido, fusoValido, idiomaValido,
  moedaValida, telefoneValido, ufValida, urlValida,
} from "../../lib/brFields";

export const createCompanySchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug deve conter apenas letras minúsculas, números e hífens"),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

// ===== Configurações da empresa ativa (seção 37) =====
// Toda escrita é parcial: cada bloco da tela manda só o que mudou. Presença e
// ausência significam coisas diferentes aqui — a chave ausente não toca no
// campo, e a chave vazia ("" ou null) limpa o que estava guardado. O schema é
// .strict() de propósito: um campo escrito errado devolve 400 em vez de ser
// ignorado em silêncio, e a pessoa descobre na hora que o botão não fez nada.

// Texto de cadastro: opcional, aparado, com teto de tamanho do schema do banco.
// Campo com máscara passa do jeito que foi digitado — a guarda dos algarismos
// acontece no service, para a regra valer também para quem chama a API direto.
const textoOpcional = (max: number) =>
  z.string().trim().max(max, "Texto longo demais").nullable().optional();

// Vazio é "sem valor", não "valor inválido": só o que foi digitado é checado.
const vazioOu = (valida: (valor: string) => boolean) => (valor: unknown) =>
  typeof valor !== "string" || valor.trim().length === 0 || valida(valor);

export const updateCompanySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "O nome da empresa precisa de pelo menos 2 caracteres")
      .max(120)
      .optional(),
    legalName: textoOpcional(160),
    tradeName: textoOpcional(160),
    cnpj: textoOpcional(18).refine(
      vazioOu(cnpjValido),
      "CNPJ inválido — confira os 14 dígitos e o dígito verificador",
    ),
    phone: textoOpcional(32).refine(
      vazioOu(telefoneValido),
      "Telefone inválido — informe DDD e número, com 10 ou 11 dígitos",
    ),
    email: textoOpcional(160).refine(
      vazioOu(emailValido),
      "Informe um e-mail completo (ex.: contato@empresa.com)",
    ),
    zipCode: textoOpcional(16).refine(vazioOu(cepValido), "CEP inválido — são 8 dígitos"),
    street: textoOpcional(160),
    number: textoOpcional(32),
    district: textoOpcional(80),
    city: textoOpcional(80),
    stateUf: textoOpcional(2).refine(
      vazioOu(ufValida),
      "Informe a sigla do estado (UF), ex.: SP",
    ),
    logoUrl: textoOpcional(255).refine(
      vazioOu(urlValida),
      "Logo: informe um endereço http(s) completo — o upload de arquivo ainda não existe",
    ),
    // Moeda, fuso e idioma afetam o formato de todos os números e datas do painel.
    // São opcionais para a gravação parcial funcionar bloco a bloco, mas quem manda
    // o campo tem que mandar um valor da lista: vazio aqui não tem significado.
    currency: z
      .string()
      .trim()
      .max(8)
      .refine(moedaValida, "Moeda: escolha uma das cadastradas na lista")
      .optional(),
    timezone: z
      .string()
      .trim()
      .max(64)
      .refine(fusoValido, "Fuso horário: escolha um fuso válido (ex.: America/Sao_Paulo)")
      .optional(),
    language: z
      .string()
      .trim()
      .max(8)
      .refine(idiomaValido, "Idioma: escolha um dos cadastrados na lista")
      .optional(),
    // Decimal(14,2) no banco: nada acima de 9.999.999.999,99 tem onde morar.
    revenueTarget: z
      .number()
      .min(0, "A meta de receita não pode ser negativa")
      .max(9_999_999_999.99, "Meta de receita longa demais")
      .nullable()
      .optional(),
    // Fase 3b: política de estoque da empresa. Booleano de verdade — nem "0"/"1",
    // nem string — porque a tela manda o estado do switch e o .strict() não
    // perdoa tipo inventado.
    allowNegativeStock: z.boolean().optional(),
  })
  .strict()
  .refine((valor) => Object.keys(valor).length > 0, "Envie ao menos um campo para gravar");

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

