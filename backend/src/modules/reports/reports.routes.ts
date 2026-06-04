import { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { authorize } from '../../shared/middlewares/role.middleware';
import * as reportController from './reports.controller';

export async function reportRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/reports/clients', { preHandler: [authorize('admin', 'manager', 'viewer')] }, reportController.clientsReportHandler);
  app.get('/reports/products', { preHandler: [authorize('admin', 'manager', 'viewer')] }, reportController.productsReportHandler);
  app.get('/reports/financial', { preHandler: [authorize('admin', 'manager', 'viewer')] }, reportController.financialReportHandler);
  app.get('/reports/stock', { preHandler: [authorize('admin', 'manager', 'viewer')] }, reportController.stockReportHandler);
}
