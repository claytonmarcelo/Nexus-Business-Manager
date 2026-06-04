import { FastifyRequest, FastifyReply } from 'fastify';
import { createSupplierSchema, updateSupplierSchema } from './suppliers.schema';
import * as supplierService from './suppliers.service';

export async function listHandler(_request: FastifyRequest, reply: FastifyReply) {
  const user = _request.user as { company_id: number };
  const suppliers = await supplierService.listSuppliers(user.company_id);
  return reply.send(suppliers);
}

export async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const { id } = request.params as { id: string };
  const supplier = await supplierService.getSupplierById(Number(id), user.company_id);
  return reply.send(supplier);
}

export async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; company_id: number };
  const data = createSupplierSchema.parse(request.body);
  const supplier = await supplierService.createSupplier(data, user.id, user.company_id);
  return reply.status(201).send(supplier);
}

export async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const { id } = request.params as { id: string };
  const data = updateSupplierSchema.parse(request.body);
  const supplier = await supplierService.updateSupplier(Number(id), data, user.company_id);
  return reply.send(supplier);
}

export async function deleteHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const { id } = request.params as { id: string };
  await supplierService.deleteSupplier(Number(id), user.company_id);
  return reply.status(204).send();
}
