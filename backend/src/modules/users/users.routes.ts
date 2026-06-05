import { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { authorize } from '../../shared/middlewares/role.middleware';
import * as userController from './users.controller';

export async function userRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/users', { preHandler: [authorize('admin', 'manager', 'viewer')] }, userController.listHandler);
  app.get('/users/:id', { preHandler: [authorize('admin', 'manager', 'viewer')] }, userController.getByIdHandler);
  app.post('/users', { preHandler: [authorize('admin')] }, userController.createHandler);
  app.put('/users/:id', { preHandler: [authorize('admin', 'manager')] }, userController.updateHandler);
  app.post('/users/avatar', { preHandler: [authenticate] }, userController.uploadAvatarHandler);
  app.put('/users/theme', { preHandler: [authenticate] }, userController.updateThemeHandler);
  app.put('/users/profile', { preHandler: [authenticate] }, userController.updateProfileHandler);
  app.delete('/users/:id', { preHandler: [authorize('admin')] }, userController.deleteHandler);
}
