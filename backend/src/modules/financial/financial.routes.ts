import { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { authorize } from '../../shared/middlewares/role.middleware';
import * as financialController from './financial.controller';

export async function financialRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/financial', { preHandler: [authorize('admin', 'manager', 'viewer')] }, financialController.listHandler);
  app.get('/financial/cashflow', { preHandler: [authorize('admin', 'manager', 'viewer')] }, financialController.cashFlowHandler);
  app.get('/financial/cashflow/period', { preHandler: [authorize('admin', 'manager', 'viewer')] }, financialController.cashFlowByPeriodHandler);
  app.get('/financial/:id', { preHandler: [authorize('admin', 'manager', 'viewer')] }, financialController.getByIdHandler);
  app.post('/financial', { preHandler: [authorize('admin', 'manager', 'operator')] }, financialController.createHandler);
  app.put('/financial/:id', { preHandler: [authorize('admin', 'manager')] }, financialController.updateHandler);
  app.delete('/financial/:id', { preHandler: [authorize('admin', 'manager')] }, financialController.deleteHandler);
}
