import { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { authorize } from '../../shared/middlewares/role.middleware';
import * as aiController from './ai.controller';

export async function aiRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.post('/ai/chat', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, aiController.chatHandler);
  app.get('/ai/suggestions', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, aiController.suggestionsHandler);
  app.get('/ai/insights', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, aiController.insightsHandler);
  app.get('/ai/help/:module', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, aiController.helpHandler);
  app.post('/ai/analyze', { preHandler: [authorize('admin', 'manager')] }, aiController.analyzeHandler);
}
