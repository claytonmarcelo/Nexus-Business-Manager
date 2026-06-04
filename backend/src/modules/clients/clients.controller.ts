import { FastifyRequest, FastifyReply } from 'fastify';
import { createClientSchema, updateClientSchema } from './clients.schema';
import * as clientService from './clients.service';

export async function listHandler(_request: FastifyRequest, reply: FastifyReply) {
  const clients = await clientService.listClients();
  return reply.send(clients);
}

export async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const client = await clientService.getClientById(Number(id));
  return reply.send(client);
}

export async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const data = createClientSchema.parse(request.body);
  const user = request.user as { id: number };
  const client = await clientService.createClient(data, user.id);
  return reply.status(201).send(client);
}

export async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const data = updateClientSchema.parse(request.body);
  const client = await clientService.updateClient(Number(id), data);
  return reply.send(client);
}

export async function deleteHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await clientService.deleteClient(Number(id));
  return reply.status(204).send();
}
