import { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { authorize } from '../../shared/middlewares/role.middleware';
import * as stockController from './stock.controller';

export async function stockRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/stock', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, stockController.listHandler);
  app.get('/stock/product/:productId', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, stockController.getByProductHandler);
  app.post('/stock', { preHandler: [authorize('admin', 'manager', 'operator')] }, stockController.createHandler);
}
