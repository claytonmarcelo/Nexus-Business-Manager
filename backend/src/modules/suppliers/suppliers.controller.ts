import { FastifyRequest, FastifyReply } from 'fastify';
import { createSupplierSchema, updateSupplierSchema } from './suppliers.schema';
import * as supplierService from './suppliers.service';
import { parsePagination } from '../../shared/utils/pagination';
import { log } from '../audit/audit.service';

export async function listHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const params = parsePagination(request.query as Record<string, any>);
  const result = await supplierService.listSuppliers(user.companyId, params);
  return reply.send({ success: true, ...result });
}

export async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: number };
  const { id } = request.params as { id: string };
  const supplier = await supplierService.getSupplierById(Number(id), user.companyId);
  return reply.send({ success: true, data: supplier });
}

export async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const data = createSupplierSchema.parse(request.body);
  const supplier = await supplierService.createSupplier(data, user.id, user.companyId);
  await log(user.id, user.name, 'CREATE', 'supplier', supplier.id, null, data, request.ip, user.companyId);
  return reply.status(201).send({ success: true, data: supplier });
}

export async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const { id } = request.params as { id: string };
  const data = updateSupplierSchema.parse(request.body);
  const old = await supplierService.getSupplierById(Number(id), user.companyId);
  const supplier = await supplierService.updateSupplier(Number(id), data, user.companyId);
  await log(user.id, user.name, 'UPDATE', 'supplier', Number(id), old, data, request.ip, user.companyId);
  return reply.send({ success: true, data: supplier });
}

export async function deleteHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const { id } = request.params as { id: string };
  const old = await supplierService.getSupplierById(Number(id), user.companyId);
  await supplierService.deleteSupplier(Number(id), user.companyId);
  await log(user.id, user.name, 'DELETE', 'supplier', Number(id), old, null, request.ip, user.companyId);
  return reply.send({ success: true, message: 'Fornecedor excluido com sucesso' });
}
