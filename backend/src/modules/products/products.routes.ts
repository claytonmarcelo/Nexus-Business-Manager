import { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { authorize } from '../../shared/middlewares/role.middleware';
import * as productController from './products.controller';

export async function productRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/products', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, productController.listHandler);
  app.get('/products/:id', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, productController.getByIdHandler);
  app.post('/products', { preHandler: [authorize('admin', 'manager', 'operator')] }, productController.createHandler);
  app.put('/products/:id', { preHandler: [authorize('admin', 'manager', 'operator')] }, productController.updateHandler);
  app.delete('/products/:id', { preHandler: [authorize('admin', 'manager')] }, productController.deleteHandler);
}
