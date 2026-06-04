import { FastifyRequest, FastifyReply } from 'fastify';
import * as notificationService from './notifications.service';

export async function listHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: number };
  const notifications = await notificationService.listNotifications(user.companyId);
  const unreadCount = await notificationService.getUnreadCount(user.companyId);
  return reply.send({ success: true, data: notifications, unreadCount });
}

export async function markAsReadHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: number };
  const { id } = request.params as { id: string };
  await notificationService.markAsRead(Number(id), user.companyId);
  return reply.send({ success: true, message: 'Notificacao marcada como lida' });
}

export async function markAllAsReadHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: number };
  await notificationService.markAllAsRead(user.companyId);
  return reply.send({ success: true, message: 'Todas notificacoes marcadas como lidas' });
}

export async function generateAlertsHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: number };
  await notificationService.generateAlerts(user.companyId);
  return reply.send({ success: true, message: 'Alertas gerados com sucesso' });
}
