import { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { authorize } from '../../shared/middlewares/role.middleware';
import * as notificationController from './notifications.controller';

export async function notificationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/notifications', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, notificationController.listHandler);
  app.post('/notifications/generate', { preHandler: [authorize('admin', 'manager')] }, notificationController.generateAlertsHandler);
  app.put('/notifications/:id/read', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, notificationController.markAsReadHandler);
  app.put('/notifications/read-all', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, notificationController.markAllAsReadHandler);
}
