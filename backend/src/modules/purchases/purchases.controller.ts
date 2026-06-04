import { FastifyRequest, FastifyReply } from 'fastify';
import { createPurchaseSchema, updatePurchaseStatusSchema } from './purchases.schema';
import * as purchaseService from './purchases.service';
import { parsePagination } from '../../shared/utils/pagination';
import { log } from '../audit/audit.service';

export async function listHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const params = parsePagination(request.query as Record<string, any>);
  const result = await purchaseService.listPurchases(user.companyId, params);
  return reply.send({ success: true, ...result });
}

export async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: number };
  const { id } = request.params as { id: string };
  const purchase = await purchaseService.getPurchaseById(Number(id), user.companyId);
  const items = await purchaseService.getPurchaseItems(Number(id));
  return reply.send({ success: true, data: { ...purchase, items } });
}

export async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const data = createPurchaseSchema.parse(request.body);
  const purchase = await purchaseService.createPurchase(data, user.id, user.companyId);
  await log(user.id, user.name, 'CREATE', 'purchase', purchase.id, null, data, request.ip, user.companyId);
  return reply.status(201).send({ success: true, data: purchase });
}

export async function receiveHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const { id } = request.params as { id: string };
  await purchaseService.receivePurchase(Number(id), user.id, user.companyId);
  await log(user.id, user.name, 'UPDATE', 'purchase', Number(id), null, { status: 'RECEBIDA' }, request.ip, user.companyId);
  return reply.send({ success: true, message: 'Compra recebida e estoque atualizado' });
}

export async function cancelHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const { id } = request.params as { id: string };
  await purchaseService.cancelPurchase(Number(id), user.companyId);
  await log(user.id, user.name, 'UPDATE', 'purchase', Number(id), null, { status: 'CANCELADA' }, request.ip, user.companyId);
  return reply.send({ success: true, message: 'Compra cancelada com sucesso' });
}

export async function updateStatusHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: number };
  const { id } = request.params as { id: string };
  const data = updatePurchaseStatusSchema.parse(request.body);
  const purchase = await purchaseService.updatePurchaseStatus(Number(id), data, user.companyId);
  return reply.send({ success: true, data: purchase });
}
