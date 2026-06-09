import { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { authorize } from '../../shared/middlewares/role.middleware';
import * as subscriptionController from './subscription.controller';

export async function subscriptionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/subscription', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, subscriptionController.getSubscriptionHandler);
  app.post('/subscription/change', { preHandler: [authorize('admin', 'manager')] }, subscriptionController.changePlanHandler);
  app.post('/subscription/cancel', { preHandler: [authorize('admin')] }, subscriptionController.cancelSubscriptionHandler);
  app.get('/subscription/invoices', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, subscriptionController.getInvoicesHandler);
}
