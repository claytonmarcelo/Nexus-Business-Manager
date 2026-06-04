import { FastifyRequest, FastifyReply } from 'fastify';
import { createPurchaseSchema, updatePurchaseStatusSchema } from './purchases.schema';
import * as purchaseService from './purchases.service';

export async function listHandler(_request: FastifyRequest, reply: FastifyReply) {
  const user = _request.user as { company_id: number };
  const purchases = await purchaseService.listPurchases(user.company_id);
  return reply.send(purchases);
}

export async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const { id } = request.params as { id: string };
  const purchase = await purchaseService.getPurchaseById(Number(id), user.company_id);
  const items = await purchaseService.getPurchaseItems(Number(id));
  return reply.send({ ...purchase, items });
}

export async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; company_id: number };
  const data = createPurchaseSchema.parse(request.body);
  const purchase = await purchaseService.createPurchase(data, user.id, user.company_id);
  return reply.status(201).send(purchase);
}

export async function receiveHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; company_id: number };
  const { id } = request.params as { id: string };
  await purchaseService.receivePurchase(Number(id), user.id, user.company_id);
  return reply.send({ message: 'Compra recebida e estoque atualizado' });
}

export async function updateStatusHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const { id } = request.params as { id: string };
  const data = updatePurchaseStatusSchema.parse(request.body);
  const purchase = await purchaseService.updatePurchaseStatus(Number(id), data, user.company_id);
  return reply.send(purchase);
}
