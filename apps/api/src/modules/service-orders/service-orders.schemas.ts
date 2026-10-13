import { z } from "zod";
import { paginationSchema } from "../../lib/pagination";
import { moeda } from "../../lib/money";

// F3.2 Parte 1 — a porta de entrada das Ordens de Serviço.
//
// Aqui só se julga o que dá para julgar sem olhar o banco: forma, tamanho e as
// três regras que um item tem de cumprir sozinho (peça vem do cadastro, serviço
// tem o que foi feito e quanto custa). Cliente, produto e responsável precisam
// pertencer à empresa, e isso o schema não pode dizer — é a camada de serviço
// que pergunta com o `companyId` do token na mão.
//
// `unitPrice` é opcional de propósito e do lado certo: a peça pode sair pelo
// preço de tabela (o produto manda) ou pelo preço que a empresa decidiu cobrar
// daquela OS. Um serviço avulso não tem tabela nenhuma — sem descrição e sem
// preço ele não é uma linha de conta, é um espaço em branco no carnê, e por
// isso o `superRefine` abaixo o barra na porta.

const emptyToUndef = (v: string | undefined) =>
  v === undefined || v.trim() === "" ? undefined : v.trim();

/** Os cinco estados, na ordem em que a OS acontece no balcão. */
export const STATUS_OS = ["OPEN", "IN_PROGRESS", "WAITING", "COMPLETED", "CANCELLED"] as const;
export const PRIORIDADES_OS = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

/**
 * Campo que aceita um id e também aceita ser limpo (`null`) na edição. Sem o
 * `null`, "tirar o responsável" seria impossível: a ausência da chave significa
 * "não mexer", e a tela precisava de uma forma de dizer "limpar".
 */
const idOuNulo = z.union([z.string().trim().min(1).max(36), z.null()]).optional();

const dataHora = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.union([z.null(), z.coerce.date().refine((d) => !Number.isNaN(d.getTime()), "Data de agendamento inválida")]).optional(),
);

export const listServiceOrdersQuery = paginationSchema.extend({
  search: z.string().trim().max(120).optional().transform(emptyToUndef),
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING", "COMPLETED", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  assignedUserId: z.string().trim().max(36).optional().transform(emptyToUndef),
  // Janela por CALENDÁRIO da empresa (AAAA-MM-DD), nunca por instante solto: a
  // borda é a meia-noite local dela, calculada na camada de serviço com o fuso
  // lido do cadastro (lib/time.ts).
  from: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a data no formato AAAA-MM-DD").optional().transform(emptyToUndef),
  to: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a data no formato AAAA-MM-DD").optional().transform(emptyToUndef),
  sort: z.enum(["number", "createdAt", "priority", "total"]).optional(),
});

export const serviceOrderItemSchema = z
  .object({
    kind: z.enum(["SERVICE", "PART"]),
    productId: z.string().trim().max(36).optional().transform(emptyToUndef),
    description: z.string().trim().max(200).optional().transform(emptyToUndef),
    // Medida, não dinheiro: a coluna é DECIMAL(12,3) e aceita fração de unidade
    // (0,333 m de cabo é uma linha real de ordem).
    quantity: z.coerce.number().positive("Quantidade deve ser maior que zero").max(999999),
    unitPrice: moeda({ mensagem: "Preço unitário inválido — zero ou maior, até 99.999.999,99" }).optional(),
  })
  .superRefine((item, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    if (item.kind === "PART" && !item.productId) issue("productId", "A peça precisa de um produto do cadastro");
    if (item.kind === "SERVICE" && !item.description) issue("description", "O serviço precisa de uma descrição do que foi feito");
    if (item.kind === "SERVICE" && item.unitPrice === undefined) issue("unitPrice", "O serviço precisa de preço unitário");
  });

export const createServiceOrderSchema = z.object({
  clientId: z.string().trim().min(1, "Cliente obrigatório").max(36),
  title: z.string().trim().min(1, "Título obrigatório").max(160),
  description: z.string().trim().max(2000).optional().transform(emptyToUndef),
  diagnosis: z.string().trim().max(2000).optional().transform(emptyToUndef),
  notes: z.string().trim().max(500).optional().transform(emptyToUndef),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  assignedUserId: idOuNulo,
  scheduledAt: dataHora,
  discount: moeda({ mensagem: "Desconto inválido — zero ou maior, até 99.999.999,99" }).default("0.00"),
  items: z.array(serviceOrderItemSchema).min(1, "Inclua ao menos um item na ordem"),
});

export const updateServiceOrderSchema = z
  .object({
    clientId: idOuNulo,
    title: z.string().trim().min(1, "Título obrigatório").max(160).optional(),
    description: z.string().trim().max(2000).optional().transform(emptyToUndef),
    diagnosis: z.string().trim().max(2000).optional().transform(emptyToUndef),
    notes: z.string().trim().max(500).optional().transform(emptyToUndef),
    priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
    assignedUserId: idOuNulo,
    scheduledAt: dataHora,
    discount: moeda({ mensagem: "Desconto inválido — zero ou maior, até 99.999.999,99" }).optional(),
    // Ausente = deixa as linhas como estão. Presente = troca a lista inteira:
    // é o que a tela faz quando o operador reorganiza os itens, e é o que o
    // serviço confere contra o estoque antes de aceitar.
    items: z.array(serviceOrderItemSchema).min(1, "Inclua ao menos um item na ordem").optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: "Nada para atualizar" });

export const updateServiceOrderStatusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING", "COMPLETED", "CANCELLED"]),
  note: z.string().trim().max(500).optional().transform(emptyToUndef),
});

export type CreateServiceOrderInput = z.infer<typeof createServiceOrderSchema>;
export type UpdateServiceOrderInput = z.infer<typeof updateServiceOrderSchema>;
export type ListServiceOrdersQuery = z.infer<typeof listServiceOrdersQuery>;
