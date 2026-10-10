import type { FastifyInstance } from "fastify";
import {
  createEventSchema,
  listEventsQuery,
  updateEventSchema,
  updateStatusSchema,
} from "./agenda.schemas";
import * as service from "./agenda.service";
import { resolveCompanyContext } from "../../lib/company-context";
import { assertPermission } from "../../lib/rbac";

// RBAC e isolamento por empresa sempre no backend (secoes 34/35).
export async function agendaRoutes(app: FastifyInstance): Promise<void> {
  app.get("/agenda/events", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "agenda:read");
    const q = listEventsQuery.parse(req.query);
    return service.listEvents(ctx.companyId, {
      from: q.from,
      to: q.to,
      status: q.status,
      type: q.type,
      search: q.search,
      userId: ctx.userId,
    });
  });

  app.get("/agenda/summary", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "agenda:read");
    const q = listEventsQuery.parse(req.query);
    return service.agendaSummary(ctx.companyId, q.from, q.to);
  });

  app.post("/agenda/events", { preHandler: [app.authenticate] }, async (req, reply) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "agenda:write");
    const input = createEventSchema.parse(req.body);
    const evento = await service.createEvent(ctx.companyId, input, ctx.userId, req.ip);
    return reply.status(201).send(evento);
  });

  app.get("/agenda/events/:id", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "agenda:read");
    const { id } = req.params as { id: string };
    return service.getEventoDetalhado(ctx.companyId, id, ctx.userId);
  });

  app.patch("/agenda/events/:id", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "agenda:write");
    const { id } = req.params as { id: string };
    const input = updateEventSchema.parse(req.body);
    return service.updateEvent(ctx.companyId, id, input, ctx.userId, req.ip);
  });

  app.patch("/agenda/events/:id/status", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "agenda:write");
    const { id } = req.params as { id: string };
    const { status } = updateStatusSchema.parse(req.body);
    return service.changeStatus(ctx.companyId, id, status, ctx.userId, req.ip);
  });

  app.delete("/agenda/events/:id", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "agenda:write");
    const { id } = req.params as { id: string };
    return service.deleteEvent(ctx.companyId, id, ctx.userId, req.ip);
  });
}
