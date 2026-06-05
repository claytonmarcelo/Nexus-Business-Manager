import { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { authorize } from '../../shared/middlewares/role.middleware';
import * as dashboardController from './dashboard.controller';

export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/dashboard', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, dashboardController.statsHandler);
}
