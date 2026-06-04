import { FastifyRequest, FastifyReply } from 'fastify';
import { loginSchema } from './auth.schema';
import { authenticateUser } from './auth.service';
import { log } from '../audit/audit.service';

export async function loginHandler(request: FastifyRequest, reply: FastifyReply) {
  const data = loginSchema.parse(request.body);

  const user = await authenticateUser(data);

  const token = await reply.jwtSign({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
  });

  await log(user.id, user.name, 'LOGIN', 'auth', 0, null, null, request.ip, user.companyId || 1);

  return reply.send({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    },
  });
}

export async function logoutHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as {
    id: number;
    name: string;
    email: string;
    role: string;
    companyId: number;
  };

  await log(user.id, user.name, 'LOGOUT', 'auth', 0, null, null, request.ip, user.companyId || 1);

  return reply.send({ success: true, message: 'Sessao encerrada com sucesso' });
}

export async function profileHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as {
    id: number;
    name: string;
    email: string;
    role: string;
    companyId: number;
  };

  return reply.send({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    },
  });
}