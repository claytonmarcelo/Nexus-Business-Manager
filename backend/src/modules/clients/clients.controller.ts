import { FastifyRequest, FastifyReply } from 'fastify';
import { createClientSchema, updateClientSchema } from './clients.schema';
import * as clientService from './clients.service';

export async function listHandler(_request: FastifyRequest, reply: FastifyReply) {
  const user = _request.user as { id: number; company_id: number };
  const clients = await clientService.listClients(user.company_id);
  return reply.send(clients);
}

export async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; company_id: number };
  const { id } = request.params as { id: string };
  const client = await clientService.getClientById(Number(id), user.company_id);
  return reply.send(client);
}

export async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; company_id: number };
  const data = createClientSchema.parse(request.body);
  const client = await clientService.createClient(data, user.id, user.company_id);
  return reply.status(201).send(client);
}

export async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; company_id: number };
  const { id } = request.params as { id: string };
  const data = updateClientSchema.parse(request.body);
  const client = await clientService.updateClient(Number(id), data, user.company_id);
  return reply.send(client);
}

export async function deleteHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; company_id: number };
  const { id } = request.params as { id: string };
  await clientService.deleteClient(Number(id), user.company_id);
  return reply.status(204).send();
}
