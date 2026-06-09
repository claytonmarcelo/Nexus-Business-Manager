import { FastifyRequest, FastifyReply } from 'fastify';
import * as subscriptionService from './subscription.service';

export async function getSubscriptionHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: number; id: number };
  const data = await subscriptionService.getSubscription(user.companyId, user.id);
  return reply.send({ success: true, ...data });
}

export async function changePlanHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: number; id: number };
  const { plan } = request.body as { plan: string };
  await subscriptionService.changePlan(user.companyId, plan);
  return reply.send({ success: true, message: 'Plano alterado com sucesso' });
}

export async function cancelSubscriptionHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: number; id: number };
  await subscriptionService.cancelSubscription(user.companyId);
  return reply.send({ success: true, message: 'Assinatura cancelada' });
}

export async function getInvoicesHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: number; id: number };
  const invoices = await subscriptionService.getInvoices(user.companyId);
  return reply.send(invoices);
}
