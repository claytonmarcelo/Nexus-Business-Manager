import { z } from "zod";
import { paginationSchema } from "../../lib/pagination";
import { moeda } from "../../lib/money";

const emptyToUndef = (v: string | undefined) =>
  v === undefined || v.trim() === "" ? undefined : v.trim();

export const listSalesQuery = paginationSchema.extend({
  search: z.string().trim().max(120).optional(),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).optional(),
});

export const saleItemSchema = z.object({
  productId: z.string().trim().min(1, "Produto obrigatório"),
  quantity: z.coerce.number().positive("Quantidade deve ser maior que zero").max(999999),
  // Fase 3d: preço entra como dinheiro (texto de duas casas), quantidade entra como
  // medida — o produto dos dois é o que a lib/money.ts arredonda uma única vez.
  unitPrice: moeda({ mensagem: "Preço unitário inválido — zero ou maior, até 99.999.999,99" }),
});

export const createSaleSchema = z.object({
  clientId: z.string().trim().max(36).optional().transform(emptyToUndef),
  notes: z.string().trim().max(500).optional().transform(emptyToUndef),
  confirm: z.boolean().default(false),
  // Fase 3e: em quantas parcelas mensais o total se divide. 1 (o padrão) é à
  // vista — exatamente o que o financeiro mostrava quando o lançamento era feito
  // à mão. O teto de 120 é o de um carnê mensal de dez anos: sem ele, um número
  // digitado à mão geraria dezenas de milhares de linhas no caixa com um clique.
  // Ausente é à vista: quem não fala de parcelas — a tela antes desta fase, um
  // integrador, os testes de isolamento — não pode ser barrado na porta.
  installments: z.coerce
    .number()
    .int("Número de parcelas deve ser inteiro")
    .min(1, "A venda tem pelo menos uma parcela")
    .max(120, "O parcelamento vai no máximo até 120 vezes")
    .default(1),
  items: z.array(saleItemSchema).min(1, "Inclua ao menos um item na venda"),
});

export const updateSaleStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "CANCELLED"]),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
