import { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { authorize } from '../../shared/middlewares/role.middleware';
import * as auditController from './audit.controller';

export async function auditRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/audit', { preHandler: [authorize('admin', 'manager')] }, auditController.listHandler);
  app.get('/audit/:entityType/:entityId', { preHandler: [authorize('admin', 'manager')] }, auditController.listByEntityHandler);
}
