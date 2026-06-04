import { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { authorize } from '../../shared/middlewares/role.middleware';
import * as appointmentController from './appointments.controller';

export async function appointmentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/appointments', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, appointmentController.listHandler);
  app.get('/appointments/:id', { preHandler: [authorize('admin', 'manager', 'operator', 'viewer')] }, appointmentController.getByIdHandler);
  app.post('/appointments', { preHandler: [authorize('admin', 'manager', 'operator')] }, appointmentController.createHandler);
  app.put('/appointments/:id', { preHandler: [authorize('admin', 'manager', 'operator')] }, appointmentController.updateHandler);
  app.delete('/appointments/:id', { preHandler: [authorize('admin', 'manager')] }, appointmentController.deleteHandler);
}
