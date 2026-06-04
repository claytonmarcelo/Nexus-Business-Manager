import { FastifyRequest, FastifyReply } from 'fastify';
import * as auditService from './audit.service';

export async function listHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; company_id: number };
  const logs = await auditService.listLogs(user.company_id);
  return reply.send(logs);
}

export async function listByEntityHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; company_id: number };
  const { entityType, entityId } = request.params as { entityType: string; entityId: string };
  const logs = await auditService.listLogsByEntity(user.company_id, entityType, Number(entityId));
  return reply.send(logs);
}
