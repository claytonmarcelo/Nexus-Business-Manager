import { FastifyRequest, FastifyReply } from 'fastify';
import { createTransactionSchema, updateTransactionSchema } from './financial.schema';
import * as financialService from './financial.service';
import { parsePagination } from '../../shared/utils/pagination';
import { log } from '../audit/audit.service';

export async function listHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const params = parsePagination(request.query as Record<string, any>);
  const result = await financialService.listTransactions(user.companyId, params);
  return reply.send({ success: true, ...result });
}

export async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: number };
  const { id } = request.params as { id: string };
  const transaction = await financialService.getTransactionById(Number(id), user.companyId);
  return reply.send({ success: true, data: transaction });
}

export async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const data = createTransactionSchema.parse(request.body);
  const transaction = await financialService.createTransaction(data, user.id, user.companyId);
  await log(user.id, user.name, 'CREATE', 'transaction', transaction.id, null, data, request.ip, user.companyId);
  return reply.status(201).send({ success: true, data: transaction });
}

export async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const { id } = request.params as { id: string };
  const data = updateTransactionSchema.parse(request.body);
  const old = await financialService.getTransactionById(Number(id), user.companyId);
  const transaction = await financialService.updateTransaction(Number(id), data, user.companyId);
  await log(user.id, user.name, 'UPDATE', 'transaction', Number(id), old, data, request.ip, user.companyId);
  return reply.send({ success: true, data: transaction });
}

export async function deleteHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const { id } = request.params as { id: string };
  const old = await financialService.getTransactionById(Number(id), user.companyId);
  await financialService.deleteTransaction(Number(id), user.companyId);
  await log(user.id, user.name, 'DELETE', 'transaction', Number(id), old, null, request.ip, user.companyId);
  return reply.send({ success: true, message: 'Transacao excluida com sucesso' });
}

export async function cashFlowHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: number };
  const flow = await financialService.getCashFlow(user.companyId);
  return reply.send({ success: true, data: flow });
}

export async function cashFlowByPeriodHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: number };
  const { startDate, endDate } = request.query as { startDate: string; endDate: string };
  const flow = await financialService.getCashFlowByPeriod(startDate, endDate, user.companyId);
  return reply.send({ success: true, data: flow });
}
