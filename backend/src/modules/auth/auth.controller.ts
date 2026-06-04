import { FastifyRequest, FastifyReply } from 'fastify';
import { loginSchema } from './auth.schema';
import { authenticateUser } from './auth.service';

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

  return reply.send({
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

export async function profileHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as {
    id: number;
    name: string;
    email: string;
    role: string;
    companyId: number;
  };

  return reply.send({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
  });
}