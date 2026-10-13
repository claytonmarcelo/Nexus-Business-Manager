import { z } from "zod";
import { paginationSchema } from "../../lib/pagination";
import { moeda } from "../../lib/money";
import { TIPOS_CHAVE_PIX } from "../../lib/pix";

// F3.2 Parte 2 — a porta de entrada das cobranças.
//
// Aqui se julga a FORMA; a camada de serviço julga a PERTENÇA. Um `clientId` com
// uuid válido, uma `saleId` de outra empresa e uma chave PIX no formato de um
// e-mail passam todos por este arquivo sem reclamar — e nenhum dos três pode
// virar cobrança. O que o schema consegue dizer sozinho ele diz, com mensagem em
// português; o resto é pergunta para o banco com o `companyId` do token na mão.
//
// O vencimento é um campo de calendário (AAAA-MM-DD), e não um instante. Uma
// cobrança vence "no dia 20", não "às 20h de um fuso que a empresa pode nem ser
// o do servidor": quem converte o dia em borda de instante é o serviço, com o
// fuso cadastrado (lib/time.ts). Receber `z.coerce.date()` aqui reabriria a
// janela que a Fase 3c fechou.

const emptyToUndef = (v: string | undefined) =>
  v === undefined || v.trim() === "" ? undefined : v.trim();

const idOpcional = z.string().trim().max(36).optional().transform(emptyToUndef);

/** Os seis modos de receber que uma empresa brasileira usa no balcão hoje. */
export const METODOS_COBRANCA = ["PIX", "BOLETO", "TRANSFERENCIA", "DINHEIRO", "CARTAO", "OUTRO"] as const;
export const STATUS_COBRANCA = ["PENDING", "PAID", "CANCELLED"] as const;

export const listChargesQuery = paginationSchema.extend({
  search: z.string().trim().max(120).optional().transform(emptyToUndef),
  status: z.enum(STATUS_COBRANCA).optional(),
  method: z.enum(METODOS_COBRANCA).optional(),
  clientId: idOpcional,
  saleId: idOpcional,
  serviceOrderId: idOpcional,
  // "vencida" não é coluna: é PENDING com o dia da empresa já passado. A tela
  // filtra por ela, e quem calcula a borda é o serviço — no fuso cadastrado.
  overdue: z.enum(["true", "false"]).optional(),
  sort: z.enum(["number", "dueDate", "createdAt", "amount"]).optional(),
});

export const createChargeSchema = z
  .object({
    // Os três vínculos são opcionais individualmente e obrigatórios em conjunto:
    // o `superRefine` abaixo exige pelo menos um. Cobrança sem destinatário não é
    // cobrança — é um desejo escrito no carnê.
    clientId: idOpcional,
    saleId: idOpcional,
    serviceOrderId: idOpcional,
    title: z.string().trim().min(1, "Título obrigatório").max(160),
    amount: moeda({
      minimo: 0.01,
      mensagem: "O valor da cobrança deve ser maior que zero e no máximo 99.999.999,99",
    }),
    dueDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a data no formato AAAA-MM-DD"),
    method: z.enum(METODOS_COBRANCA),
    pixKeyType: z.enum(TIPOS_CHAVE_PIX).optional(),
    pixKey: z.string().trim().max(255).optional().transform(emptyToUndef),
    instructions: z.string().trim().max(500).optional().transform(emptyToUndef),
    notes: z.string().trim().max(500).optional().transform(emptyToUndef),
  })
  .superRefine((cobranca, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

    if (!cobranca.clientId && !cobranca.saleId && !cobranca.serviceOrderId) {
      issue("clientId", "A cobrança precisa de um cliente, de uma venda ou de uma ordem de serviço");
    }
    // PIX é o único modo em que a chave é a conta: sem ela o cliente não tem para
    // onde pagar, e uma cobrança "PIX" sem chave é um boleto em branco.
    if (cobranca.method === "PIX") {
      if (!cobranca.pixKeyType) issue("pixKeyType", "Escolha o tipo da chave PIX: CPF, CNPJ, e-mail, telefone ou aleatória");
      if (!cobranca.pixKey) issue("pixKey", "A cobrança pelo PIX precisa da chave");
    } else if (cobranca.pixKeyType || cobranca.pixKey) {
      // Silenciar a chave aqui seria gravar algo que a tela mostrou e o banco
      // escondeu. O corte é dito, não feito por baixo.
      issue("pixKey", "A chave PIX só existe numa cobrança pelo PIX");
    }
  });

/**
 * Registrar um recebimento é ato de pessoa, e a régua dele é curta: quando o
 * dinheiro entrou, ele é do caixa. `paidMethod` ausente significa "entrou pelo
 * método da própria cobrança" — o balcão que cobra em PIX e recebe em dinheiro
 * informa, e quem anota o óbvio não precisa repetir.
 */
export const payChargeSchema = z.object({
  paidMethod: z.enum(METODOS_COBRANCA).optional(),
  paymentNote: z.string().trim().max(500).optional().transform(emptyToUndef),
});

/**
 * Cancelar é escrever o motivo. Sem motivo, o cancelamento vira apagar: seis
 * meses depois ninguém sabe por que a dívida sumiu do carnê, e a auditoria fica
 * com uma linha muda. O texto é curto de propósito — cabe numa linha de recibo.
 */
export const cancelChargeSchema = z.object({
  reason: z.string().trim().min(1, "Diga o motivo do cancelamento").max(500),
});

export type CreateChargeInput = z.infer<typeof createChargeSchema>;
export type PayChargeInput = z.infer<typeof payChargeSchema>;
export type ListChargesQuery = z.infer<typeof listChargesQuery>;
