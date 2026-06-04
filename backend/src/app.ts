import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import dotenv from 'dotenv';

import { authRoutes } from './modules/auth/auth.routes';
import { userRoutes } from './modules/users/users.routes';
import { clientRoutes } from './modules/clients/clients.routes';
import { productRoutes } from './modules/products/products.routes';
import { stockRoutes } from './modules/stock/stock.routes';
import { supplierRoutes } from './modules/suppliers/suppliers.routes';
import { purchaseRoutes } from './modules/purchases/purchases.routes';
import { saleRoutes } from './modules/sales/sales.routes';
import { financialRoutes } from './modules/financial/financial.routes';
import { appointmentRoutes } from './modules/appointments/appointments.routes';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes';
import { reportRoutes } from './modules/reports/reports.routes';
import { notificationRoutes } from './modules/notifications/notifications.routes';
import { auditRoutes } from './modules/audit/audit.routes';
import { companyRoutes } from './modules/companies/companies.routes';
import { AppError } from './shared/errors/app-error';

dotenv.config();

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: 'info',
    },
  });

  await app.register(cors, {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'nexus-default-secret',
    sign: { expiresIn: process.env.JWT_EXPIRES_IN || '8h' },
  });

  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  const uploadsDir = path.resolve(__dirname, '..', 'uploads');
  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: '/uploads/',
    decorateReply: false,
  });

  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new AppError('Token invalido ou ausente', 401);
    }
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error.validation) {
      return reply.status(400).send({
        error: 'Erro de validacao',
        message: error.message,
        details: error.validation,
      });
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.message,
        statusCode: error.statusCode,
      });
    }

    app.log.error(error);

    return reply.status(500).send({
      error: 'Erro interno do servidor',
      statusCode: 500,
    });
  });

  await app.register(authRoutes, { prefix: '/api' });
  await app.register(userRoutes, { prefix: '/api' });
  await app.register(clientRoutes, { prefix: '/api' });
  await app.register(productRoutes, { prefix: '/api' });
  await app.register(stockRoutes, { prefix: '/api' });
  await app.register(supplierRoutes, { prefix: '/api' });
  await app.register(purchaseRoutes, { prefix: '/api' });
  await app.register(saleRoutes, { prefix: '/api' });
  await app.register(financialRoutes, { prefix: '/api' });
  await app.register(appointmentRoutes, { prefix: '/api' });
  await app.register(dashboardRoutes, { prefix: '/api' });
  await app.register(reportRoutes, { prefix: '/api' });
  await app.register(notificationRoutes, { prefix: '/api' });
  await app.register(auditRoutes, { prefix: '/api' });
  await app.register(companyRoutes, { prefix: '/api' });

  app.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' };
  });

  return app;
}
