import { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { authorize } from '../../shared/middlewares/role.middleware';
import * as suggestionController from './suggestions.controller';

export async function suggestionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/suggestions', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, suggestionController.listHandler);
  app.get('/suggestions/stats', { preHandler: [authorize('admin', 'manager')] }, suggestionController.statsHandler);
  app.get('/suggestions/:id', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, suggestionController.getByIdHandler);
  app.post('/suggestions', { preHandler: [authorize('admin', 'manager', 'operator')] }, suggestionController.createHandler);
  app.put('/suggestions/:id', { preHandler: [authorize('admin', 'manager')] }, suggestionController.updateHandler);
  app.delete('/suggestions/:id', { preHandler: [authorize('admin', 'manager')] }, suggestionController.deleteHandler);
}
