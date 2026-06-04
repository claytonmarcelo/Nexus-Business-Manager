import { FastifyRequest, FastifyReply } from 'fastify';
import * as notificationService from './notifications.service';

export async function listHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const notifications = await notificationService.listNotifications(user.company_id);
  const unreadCount = await notificationService.getUnreadCount(user.company_id);
  return reply.send({ notifications, unreadCount });
}

export async function markAsReadHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const { id } = request.params as { id: string };
  await notificationService.markAsRead(Number(id), user.company_id);
  return reply.status(204).send();
}

export async function markAllAsReadHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  await notificationService.markAllAsRead(user.company_id);
  return reply.status(204).send();
}

export async function generateAlertsHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  await notificationService.generateAlerts(user.company_id);
  return reply.send({ message: 'Alertas gerados com sucesso' });
}
