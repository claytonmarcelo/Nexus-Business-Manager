import { FastifyInstance } from 'fastify';
import { loginHandler, profileHandler } from './auth.controller';
import { authenticate } from '../../shared/middlewares/auth.middleware';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', loginHandler);
  app.get('/auth/me', { preHandler: [authenticate] }, profileHandler);
}
