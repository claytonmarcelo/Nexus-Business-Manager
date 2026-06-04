import { FastifyRequest, FastifyReply } from 'fastify';
import { createClientSchema, updateClientSchema } from './clients.schema';
import * as clientService from './clients.service';
import { parsePagination } from '../../shared/utils/pagination';
import { log } from '../audit/audit.service';

export async function listHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const params = parsePagination(request.query as Record<string, any>);
  const result = await clientService.listClients(user.companyId, params);
  return reply.send({ success: true, ...result });
}

export async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; companyId: number };
  const { id } = request.params as { id: string };
  const client = await clientService.getClientById(Number(id), user.companyId);
  return reply.send({ success: true, data: client });
}

export async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const data = createClientSchema.parse(request.body);
  const client = await clientService.createClient(data, user.id, user.companyId);
  await log(user.id, user.name, 'CREATE', 'client', client.id, null, data, request.ip, user.companyId);
  return reply.status(201).send({ success: true, data: client });
}

export async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const { id } = request.params as { id: string };
  const data = updateClientSchema.parse(request.body);
  const old = await clientService.getClientById(Number(id), user.companyId);
  const client = await clientService.updateClient(Number(id), data, user.companyId);
  await log(user.id, user.name, 'UPDATE', 'client', client.id, old, data, request.ip, user.companyId);
  return reply.send({ success: true, data: client });
}

export async function deleteHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const { id } = request.params as { id: string };
  const old = await clientService.getClientById(Number(id), user.companyId);
  await clientService.deleteClient(Number(id), user.companyId);
  await log(user.id, user.name, 'DELETE', 'client', Number(id), old, null, request.ip, user.companyId);
  return reply.status(200).send({ success: true, message: 'Cliente excluido com sucesso' });
}
