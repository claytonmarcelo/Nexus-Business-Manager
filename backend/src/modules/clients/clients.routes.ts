import { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { authorize } from '../../shared/middlewares/role.middleware';
import * as clientController from './clients.controller';

export async function clientRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/clients', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, clientController.listHandler);
  app.get('/clients/:id', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, clientController.getByIdHandler);
  app.post('/clients', { preHandler: [authorize('admin', 'manager', 'operator')] }, clientController.createHandler);
  app.put('/clients/:id', { preHandler: [authorize('admin', 'manager', 'operator')] }, clientController.updateHandler);
  app.delete('/clients/:id', { preHandler: [authorize('admin', 'manager')] }, clientController.deleteHandler);
}
