import { FastifyRequest, FastifyReply } from 'fastify';
import * as auditService from './audit.service';
import { parsePagination } from '../../shared/utils/pagination';

export async function listHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: number };
  const params = parsePagination(request.query as Record<string, any>);
  const result = await auditService.listLogs(user.companyId, params);
  return reply.send({ success: true, ...result });
}

export async function listByEntityHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: number };
  const { entityType, entityId } = request.params as { entityType: string; entityId: string };
  const logs = await auditService.listLogsByEntity(user.companyId, entityType, Number(entityId));
  return reply.send({ success: true, data: logs });
}
