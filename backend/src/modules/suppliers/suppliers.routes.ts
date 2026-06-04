import { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { authorize } from '../../shared/middlewares/role.middleware';
import * as supplierController from './suppliers.controller';

export async function supplierRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/suppliers', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, supplierController.listHandler);
  app.get('/suppliers/:id', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, supplierController.getByIdHandler);
  app.post('/suppliers', { preHandler: [authorize('admin', 'manager', 'operator')] }, supplierController.createHandler);
  app.put('/suppliers/:id', { preHandler: [authorize('admin', 'manager', 'operator')] }, supplierController.updateHandler);
  app.delete('/suppliers/:id', { preHandler: [authorize('admin', 'manager')] }, supplierController.deleteHandler);
}
