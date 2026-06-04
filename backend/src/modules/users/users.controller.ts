import { FastifyRequest, FastifyReply } from 'fastify';
import { createUserSchema, updateUserSchema } from './users.schema';
import * as userService from './users.service';
import { parsePagination } from '../../shared/utils/pagination';
import { log } from '../audit/audit.service';

export async function listHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const params = parsePagination(request.query as Record<string, any>);
  const result = await userService.listUsers(user.companyId, params);
  return reply.send({ success: true, ...result });
}

export async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const result = await userService.getUserById(Number(id));
  return reply.send({ success: true, data: result });
}

export async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const data = createUserSchema.parse(request.body);
  const result = await userService.createUser(data, user.companyId);
  await log(user.id, user.name, 'CREATE', 'user', result.id, null, { ...data, password: '***' }, request.ip, user.companyId);
  return reply.status(201).send({ success: true, data: result });
}

export async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const { id } = request.params as { id: string };
  const data = updateUserSchema.parse(request.body);
  const old = await userService.getUserById(Number(id));
  const result = await userService.updateUser(Number(id), data);
  await log(user.id, user.name, 'UPDATE', 'user', Number(id), old, { ...data, password: data.password ? '***' : undefined }, request.ip, user.companyId);
  return reply.send({ success: true, data: result });
}

export async function deleteHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const { id } = request.params as { id: string };
  const old = await userService.getUserById(Number(id));
  await userService.deleteUser(Number(id));
  await log(user.id, user.name, 'DELETE', 'user', Number(id), old, null, request.ip, user.companyId);
  return reply.send({ success: true, message: 'Usuario excluido com sucesso' });
}
