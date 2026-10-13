import type { FastifyInstance } from "fastify";
import {
  cancelChargeSchema,
  createChargeSchema,
  listChargesQuery,
  payChargeSchema,
} from "./charges.schemas";
import * as service from "./charges.service";
import { resolveCompanyContext } from "../../lib/company-context";
import { assertPermission } from "../../lib/rbac";

// F3.2 Parte 2 — as seis portas das cobranças.
//
// Nenhuma linha aqui decide regra de negócio. A rota autenticada, resolve a
// empresa DO token assinado (o `companyId` que vier no corpo é descartado pelo
// schema, e um `saleId` da empresa vizinha cai na régua do serviço), confere o
// papel na matriz e entrega ao serviço.
//
// Os dois portões são diferentes de propósito, e a diferença é a pergunta que o
// balcão faz:
//
//  - LER cobrança é operação de quem atende: `charge:read` está na matriz para
//    todos os papéis, porque ninguém atende um cliente sem saber se ele deve.
//  - CRIAR, PAGAR e CANCELAR mexem no dinheiro escrito: `charge:write`, que é de
//    OWNER, ADMIN e MANAGER. O atendente registra o que viu, não o que recebeu —
//    e se ele pudesse marcar um pagamento, o caixa da empresa passaria a depender
//    de quem tem a senha mais fraca.
//
// `/charges/summary` vem antes de `/charges/:id` pela mesma razão da ordem de
// serviço: "summary" é palavra, não uuid, e a tela de indicadores não pode
// depender da ordem de registro no roteador.
export async function chargesRoutes(app: FastifyInstance): Promise<void> {
  app.get("/charges", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "charge:read");
    const q = listChargesQuery.parse(req.query);
    return service.listCharges(
      ctx.companyId,
      { page: q.page, pageSize: q.pageSize },
      {
        search: q.search,
        status: q.status,
        method: q.method,
        clientId: q.clientId,
        saleId: q.saleId,
        serviceOrderId: q.serviceOrderId,
        overdue: q.overdue === "true",
        sort: q.sort,
      },
    );
  });

  app.get("/charges/summary", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "charge:read");
    return service.summary(ctx.companyId);
  });

  app.get("/charges/:id", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "charge:read");
    const { id } = req.params as { id: string };
    return service.getCharge(ctx.companyId, id);
  });

  app.post("/charges", { preHandler: [app.authenticate] }, async (req, reply) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "charge:write");
    const input = createChargeSchema.parse(req.body);
    const cobranca = await service.createCharge(ctx.companyId, input, { userId: ctx.userId, role: ctx.role }, req.ip);
    return reply.status(201).send(cobranca);
  });

  app.post("/charges/:id/pay", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "charge:write");
    const { id } = req.params as { id: string };
    const input = payChargeSchema.parse(req.body ?? {});
    return service.payCharge(ctx.companyId, id, input, { userId: ctx.userId, role: ctx.role }, req.ip);
  });

  app.post("/charges/:id/cancel", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "charge:write");
    const { id } = req.params as { id: string };
    const { reason } = cancelChargeSchema.parse(req.body);
    return service.cancelCharge(ctx.companyId, id, reason, { userId: ctx.userId, role: ctx.role }, req.ip);
  });
}
