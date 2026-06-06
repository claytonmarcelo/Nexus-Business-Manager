import { FastifyRequest, FastifyReply } from 'fastify';
import { createLeadSchema, updateLeadSchema } from './crm.schema';
import * as crmService from './crm.service';
import { parsePagination } from '../../shared/utils/pagination';
import { log } from '../audit/audit.service';

export async function listHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: number };
  const { status } = request.query as { status?: string };
  const params = parsePagination(request.query as Record<string, any>);
  const result = await crmService.listLeads(user.companyId, { ...params, status });
  return reply.send({ success: true, ...result });
}

export async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: number };
  const { id } = request.params as { id: string };
  const lead = await crmService.getLeadById(Number(id), user.companyId);
  return reply.send({ success: true, data: lead });
}

export async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const data = createLeadSchema.parse(request.body);
  const lead = await crmService.createLead(data, user.id, user.companyId);
  await log(user.id, user.name, 'CREATE', 'crm_lead', lead.id, null, data, request.ip, user.companyId);
  return reply.status(201).send({ success: true, data: lead });
}

export async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const { id } = request.params as { id: string };
  const data = updateLeadSchema.parse(request.body);
  const old = await crmService.getLeadById(Number(id), user.companyId);
  const lead = await crmService.updateLead(Number(id), data, user.companyId);
  await log(user.id, user.name, 'UPDATE', 'crm_lead', Number(id), old, data, request.ip, user.companyId);
  return reply.send({ success: true, data: lead });
}

export async function deleteHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const { id } = request.params as { id: string };
  const old = await crmService.getLeadById(Number(id), user.companyId);
  await crmService.deleteLead(Number(id), user.companyId);
  await log(user.id, user.name, 'DELETE', 'crm_lead', Number(id), old, null, request.ip, user.companyId);
  return reply.send({ success: true, message: 'Lead excluido com sucesso' });
}

export async function statsHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: number };
  const stats = await crmService.countByStatus(user.companyId);
  return reply.send({ success: true, data: stats });
}
