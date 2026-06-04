import { FastifyRequest, FastifyReply } from 'fastify';
import { createMovementSchema } from './stock.schema';
import * as stockService from './stock.service';
import { parsePagination } from '../../shared/utils/pagination';
import { log } from '../audit/audit.service';

export async function listHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const params = parsePagination(request.query as Record<string, any>);
  const result = await stockService.listMovements(user.companyId, params);
  return reply.send({ success: true, ...result });
}

export async function getByProductHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: number };
  const { productId } = request.params as { productId: string };
  const movements = await stockService.getMovementsByProduct(Number(productId), user.companyId);
  return reply.send({ success: true, data: movements });
}

export async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const data = createMovementSchema.parse(request.body);
  const movement = await stockService.createMovement(data, user.id, user.companyId);
  await log(user.id, user.name, 'CREATE', 'stock_movement', movement.id, null, data, request.ip, user.companyId);
  return reply.status(201).send({ success: true, data: movement });
}
