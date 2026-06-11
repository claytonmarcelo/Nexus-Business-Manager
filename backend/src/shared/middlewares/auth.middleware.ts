import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../errors/app-error';

export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    throw new AppError('Token invalido ou ausente', 401);
  }
}
