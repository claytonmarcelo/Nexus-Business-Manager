import type { FastifyInstance } from "fastify";
import type { ServiceOrderStatus } from "@prisma/client";
import {
  createServiceOrderSchema,
  listServiceOrdersQuery,
  updateServiceOrderSchema,
  updateServiceOrderStatusSchema,
} from "./service-orders.schemas";
import * as service from "./service-orders.service";
import { resolveCompanyContext } from "../../lib/company-context";
import { assertPermission } from "../../lib/rbac";

// F3.2 Parte 1 — as seis portas das Ordens de Serviço.
//
// Nada aqui decide regra de negócio: a rota autenticada, resolve a empresa DO
// token assinado (nunca do corpo — o `companyId` que chegar na payload é
// descartado pelo schema), confere o papel na matriz e entrega ao serviço. A
// regra fina de quem-pode-o-quê mora em service-orders.service.ts, que é onde
// ela vale para qualquer tela ou integrador futuro.
//
// Uma rota tem um desenho diferente de propósito: PATCH e status abrem exceção
// para o STAFF antes de chamar `assertPermission`. O atendente não tem
// `service_order:write` na matriz — e mesmo assim precisa anotar o diagnóstico e
// mover o andamento da ordem que está NA MÃO DELE. Quem corta o campo proibido é
// o serviço, com o papel e o `assignedUserId` na mão; a rota só não deixa o
// atendente passar por um portão que ele nunca teve, para o 403 sair do lugar
// certo (a regra), e não do susto (o portão).
export async function serviceOrdersRoutes(app: FastifyInstance): Promise<void> {
  app.get("/service-orders", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "service_order:read");
    const q = listServiceOrdersQuery.parse(req.query);
    return service.listServiceOrders(
      ctx.companyId,
      { page: q.page, pageSize: q.pageSize },
      {
        search: q.search,
        status: q.status,
        priority: q.priority,
        assignedUserId: q.assignedUserId,
        from: q.from,
        to: q.to,
        sort: q.sort,
      },
    );
  });

  // Antes da rota com `:id`: "summary" é uma palavra, não um uuid, e a tela de
  // indicadores não pode depender da ordem de registro no roteador.
  app.get("/service-orders/summary", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "service_order:read");
    return service.summary(ctx.companyId);
  });

  app.get("/service-orders/:id", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "service_order:read");
    const { id } = req.params as { id: string };
    return service.getServiceOrder(ctx.companyId, id);
  });

  app.post("/service-orders", { preHandler: [app.authenticate] }, async (req, reply) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "service_order:write");
    const input = createServiceOrderSchema.parse(req.body);
    const ordem = await service.createServiceOrder(ctx.companyId, input, { userId: ctx.userId, role: ctx.role }, req.ip);
    return reply.status(201).send(ordem);
  });

  app.patch("/service-orders/:id", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    if (ctx.role !== "STAFF") assertPermission(ctx.role, "service_order:write");
    const { id } = req.params as { id: string };
    const input = updateServiceOrderSchema.parse(req.body);
    return service.updateServiceOrder(ctx.companyId, id, input, { userId: ctx.userId, role: ctx.role }, req.ip);
  });

  app.post("/service-orders/:id/status", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    if (ctx.role !== "STAFF") assertPermission(ctx.role, "service_order:write");
    const { id } = req.params as { id: string };
    const { status, note } = updateServiceOrderStatusSchema.parse(req.body);
    return service.changeStatus(
      ctx.companyId,
      id,
      status as ServiceOrderStatus,
      note,
      { userId: ctx.userId, role: ctx.role },
      req.ip,
    );
  });
}
