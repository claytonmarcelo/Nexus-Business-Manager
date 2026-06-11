import { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { authorize } from '../../shared/middlewares/role.middleware';
import * as backupController from './backup.controller';

export async function backupRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/backups', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, backupController.listHandler);
  app.post('/backups', { preHandler: [authorize('admin', 'manager')] }, backupController.createHandler);
  app.get('/backups/:id/download', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, backupController.downloadHandler);
}
