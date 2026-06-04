import { FastifyRequest, FastifyReply } from 'fastify';
import { createUserSchema, updateUserSchema } from './users.schema';
import * as userService from './users.service';

export async function listHandler(_request: FastifyRequest, reply: FastifyReply) {
  const users = await userService.listUsers();
  return reply.send(users);
}

export async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const user = await userService.getUserById(Number(id));
  return reply.send(user);
}

export async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const data = createUserSchema.parse(request.body);
  const user = await userService.createUser(data);
  return reply.status(201).send(user);
}

export async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const data = updateUserSchema.parse(request.body);
  const user = await userService.updateUser(Number(id), data);
  return reply.send(user);
}

export async function deleteHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await userService.deleteUser(Number(id));
  return reply.status(204).send();
}
