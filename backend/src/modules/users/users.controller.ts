import { FastifyRequest, FastifyReply } from 'fastify';
import { createUserSchema, updateUserSchema } from './users.schema';
import * as userService from './users.service';

export async function listHandler(_request: FastifyRequest, reply: FastifyReply) {
  const user = _request.user as { company_id: number };
  const users = await userService.listUsers(user.company_id);
  return reply.send(users);
}

export async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const result = await userService.getUserById(Number(id));
  return reply.send(result);
}

export async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const data = createUserSchema.parse(request.body);
  const result = await userService.createUser(data, user.company_id);
  return reply.status(201).send(result);
}

export async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const data = updateUserSchema.parse(request.body);
  const result = await userService.updateUser(Number(id), data);
  return reply.send(result);
}

export async function deleteHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await userService.deleteUser(Number(id));
  return reply.status(204).send();
}
