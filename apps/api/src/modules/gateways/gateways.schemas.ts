import { z } from "zod";
import { TIPOS_CHAVE_PIX } from "../../lib/pix";

// F3.2 Parte 2 — o formulário do gateway MANUAL.
//
// Uma decisão de produto mora neste arquivo, e ela é a razão do `.strict()`:
// configurar como a empresa recebe dinheiro NÃO é cadastrar credencial de
// terceiro. O MANUAL guarda a chave PIX, o nome de quem recebe, as instruções ao
// cliente e o vencimento padrão. Chave pública, token, secret, webhook signing
// secret — nada disso tem campo aqui, e se chegar no corpo da requisição a resposta
// é 400 com o motivo, e não "gravado e ignorado". Uma porta que aceita um campo
// que não usa é uma porta que alguém vai preencher achando que funciona.
//
// O `environment` continua sendo o que a coluna pede (SANDBOX ou PRODUCTION), mas
// para o MANUAL ele só serve de etiqueta: um balcão não tem ambiente de teste, e a
// tela mostra o que está valendo sem fingir que há dois.

const emptyToUndef = (v: string | undefined) =>
  v === undefined || v.trim() === "" ? undefined : v.trim();

export const AMBIENTES_GATEWAY = ["SANDBOX", "PRODUCTION"] as const;

export const configGatewayManualSchema = z
  .object({
    environment: z.enum(AMBIENTES_GATEWAY).default("PRODUCTION"),
    displayName: z.string().trim().max(120).optional().transform(emptyToUndef),
    pixKeyType: z.enum(TIPOS_CHAVE_PIX).optional(),
    pixKey: z.string().trim().max(255).optional().transform(emptyToUndef),
    beneficiaryName: z.string().trim().max(120).optional().transform(emptyToUndef),
    instructions: z.string().trim().max(500).optional().transform(emptyToUndef),
    // Dias entre criar a cobrança e ela vencer. Zero é "vence hoje" e é uma
    // escolha legítima de balcão; negativo não existe no calendário de ninguém.
    defaultDueDays: z.coerce.number().int().min(0).max(365).optional(),
    active: z.boolean().optional(),
  })
  .strict();

export type ConfigGatewayManualInput = z.infer<typeof configGatewayManualSchema>;
