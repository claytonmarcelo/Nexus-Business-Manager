import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import path from 'path';
import fs from 'fs';
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
import { checkDatabaseHealth } from './shared/health-check';

dotenv.config();

export async function buildApp() {
  const logDir = path.resolve(__dirname, '..', 'logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

  const app = Fastify({
    logger: {
      level: 'info',
      file: path.join(logDir, 'app.log'),
      transport: {
        target: 'pino-pretty',
        options: { colorize: false, translateTime: 'SYS:yyyy-mm-dd HH:MM:ss' },
      },
    },
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
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
      if (request.user) {
        request.user.company_id = request.user.companyId;
        request.user.companyId = request.user.companyId || request.user.company_id;
      }
    } catch {
      throw new AppError('Token invalido ou ausente', 401);
    }
  });

  function errorCode(status: number): string {
    if (status === 400) return 'VALIDATION_ERROR';
    if (status === 401) return 'UNAUTHORIZED';
    if (status === 403) return 'FORBIDDEN';
    if (status === 404) return 'NOT_FOUND';
    if (status === 409) return 'CONFLICT';
    if (status === 429) return 'TOO_MANY_REQUESTS';
    return 'INTERNAL_ERROR';
  }

  app.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode || (error instanceof AppError ? error.statusCode : 500);
    const message = error.message || 'Erro interno do servidor';

    if (statusCode === 429) {
      return reply.status(429).send({
        success: false,
        message: 'Muitas requisicoes. Tente novamente em alguns instantes.',
        errorCode: 'TOO_MANY_REQUESTS',
      });
    }

    if (error.validation) {
      return reply.status(400).send({
        success: false,
        message: message,
        errorCode: 'VALIDATION_ERROR',
        details: error.validation,
      });
    }

    if (error instanceof AppError) {
      return reply.status(statusCode).send({
        success: false,
        message: message,
        errorCode: errorCode(statusCode),
      });
    }

    app.log.error(error);

    return reply.status(500).send({
      success: false,
      message: 'Erro interno do servidor',
      errorCode: 'INTERNAL_ERROR',
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
    const db = await checkDatabaseHealth();
    return {
      status: db.ok ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      database: db,
      uptime: process.uptime(),
      nodeVersion: process.version,
    };
  });

  return app;
}
