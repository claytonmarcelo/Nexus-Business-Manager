import { FastifyInstance } from 'fastify';
import { loginHandler, profileHandler, logoutHandler } from './auth.controller';
import { authenticate } from '../../shared/middlewares/auth.middleware';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', {
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
  }, loginHandler);

  app.get('/auth/me', { preHandler: [authenticate] }, profileHandler);

  app.post('/auth/logout', { preHandler: [authenticate] }, logoutHandler);
}
