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

  app.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' };
  });

  return app;
}
