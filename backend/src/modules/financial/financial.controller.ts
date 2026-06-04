import { FastifyRequest, FastifyReply } from 'fastify';
import { createTransactionSchema, updateTransactionSchema } from './financial.schema';
import * as financialService from './financial.service';

export async function listHandler(_request: FastifyRequest, reply: FastifyReply) {
  const user = _request.user as { company_id: number };
  const transactions = await financialService.listTransactions(user.company_id);
  return reply.send(transactions);
}

export async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const { id } = request.params as { id: string };
  const transaction = await financialService.getTransactionById(Number(id), user.company_id);
  return reply.send(transaction);
}

export async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; company_id: number };
  const data = createTransactionSchema.parse(request.body);
  const transaction = await financialService.createTransaction(data, user.id, user.company_id);
  return reply.status(201).send(transaction);
}

export async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const { id } = request.params as { id: string };
  const data = updateTransactionSchema.parse(request.body);
  const transaction = await financialService.updateTransaction(Number(id), data, user.company_id);
  return reply.send(transaction);
}

export async function deleteHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const { id } = request.params as { id: string };
  await financialService.deleteTransaction(Number(id), user.company_id);
  return reply.status(204).send();
}

export async function cashFlowHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const flow = await financialService.getCashFlow(user.company_id);
  return reply.send(flow);
}

export async function cashFlowByPeriodHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const { startDate, endDate } = request.query as { startDate: string; endDate: string };
  const flow = await financialService.getCashFlowByPeriod(startDate, endDate, user.company_id);
  return reply.send(flow);
}
