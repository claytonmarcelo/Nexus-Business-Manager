import { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { authorize } from '../../shared/middlewares/role.middleware';
import * as crmController from './crm.controller';

export async function crmRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/crm', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, crmController.listHandler);
  app.get('/crm/stats', { preHandler: [authorize('admin', 'manager')] }, crmController.statsHandler);
  app.get('/crm/:id', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, crmController.getByIdHandler);
  app.post('/crm', { preHandler: [authorize('admin', 'manager', 'operator')] }, crmController.createHandler);
  app.put('/crm/:id', { preHandler: [authorize('admin', 'manager', 'operator')] }, crmController.updateHandler);
  app.delete('/crm/:id', { preHandler: [authorize('admin', 'manager')] }, crmController.deleteHandler);
}
