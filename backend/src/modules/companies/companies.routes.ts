import { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { authorize } from '../../shared/middlewares/role.middleware';
import * as companyController from './companies.controller';

export async function companyRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/companies', { preHandler: [authorize('admin')] }, companyController.listHandler);
  app.get('/companies/:id', { preHandler: [authorize('admin')] }, companyController.getByIdHandler);
  app.post('/companies', { preHandler: [authorize('admin')] }, companyController.createHandler);
  app.put('/companies/:id', { preHandler: [authorize('admin')] }, companyController.updateHandler);
}
