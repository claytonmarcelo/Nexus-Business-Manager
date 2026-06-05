import { FastifyInstance } from 'fastify';
import { loginHandler, registerHandler, profileHandler, logoutHandler } from './auth.controller';
import { authenticate } from '../../shared/middlewares/auth.middleware';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', loginHandler);

  app.post('/auth/register', registerHandler);

  app.get('/auth/me', { preHandler: [authenticate] }, profileHandler);

  app.post('/auth/logout', { preHandler: [authenticate] }, logoutHandler);
}
