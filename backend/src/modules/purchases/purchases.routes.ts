import { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { authorize } from '../../shared/middlewares/role.middleware';
import * as purchaseController from './purchases.controller';

export async function purchaseRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/purchases', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, purchaseController.listHandler);
  app.get('/purchases/:id', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, purchaseController.getByIdHandler);
  app.post('/purchases', { preHandler: [authorize('admin', 'manager', 'operator')] }, purchaseController.createHandler);
  app.post('/purchases/:id/receive', { preHandler: [authorize('admin', 'manager')] }, purchaseController.receiveHandler);
  app.post('/purchases/:id/cancel', { preHandler: [authorize('admin', 'manager')] }, purchaseController.cancelHandler);
  app.put('/purchases/:id/status', { preHandler: [authorize('admin', 'manager')] }, purchaseController.updateStatusHandler);
}
