import { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { authorize } from '../../shared/middlewares/role.middleware';
import * as saleController from './sales.controller';

export async function saleRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/sales', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, saleController.listHandler);
  app.get('/sales/:id', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, saleController.getByIdHandler);
  app.post('/sales', { preHandler: [authorize('admin', 'manager', 'operator')] }, saleController.createHandler);
}
