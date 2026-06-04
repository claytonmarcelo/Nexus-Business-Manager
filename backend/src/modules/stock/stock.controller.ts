import { FastifyRequest, FastifyReply } from 'fastify';
import { createMovementSchema } from './stock.schema';
import * as stockService from './stock.service';

export async function listHandler(_request: FastifyRequest, reply: FastifyReply) {
  const user = _request.user as { company_id: number };
  const movements = await stockService.listMovements(user.company_id);
  return reply.send(movements);
}

export async function getByProductHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const { productId } = request.params as { productId: string };
  const movements = await stockService.getMovementsByProduct(Number(productId), user.company_id);
  return reply.send(movements);
}

export async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; company_id: number };
  const data = createMovementSchema.parse(request.body);
  const movement = await stockService.createMovement(data, user.id, user.company_id);
  return reply.status(201).send(movement);
}
