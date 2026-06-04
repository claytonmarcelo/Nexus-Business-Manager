import { FastifyRequest, FastifyReply } from 'fastify';
import { createProductSchema, updateProductSchema } from './products.schema';
import * as productService from './products.service';
import { parsePagination } from '../../shared/utils/pagination';
import { log } from '../audit/audit.service';

export async function listHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const params = parsePagination(request.query as Record<string, any>);
  const result = await productService.listProducts(user.companyId, params);
  return reply.send({ success: true, ...result });
}

export async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: number };
  const { id } = request.params as { id: string };
  const product = await productService.getProductById(Number(id), user.companyId);
  return reply.send({ success: true, data: product });
}

export async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const data = createProductSchema.parse(request.body);
  const product = await productService.createProduct(data, user.id, user.companyId);
  await log(user.id, user.name, 'CREATE', 'product', product.id, null, data, request.ip, user.companyId);
  return reply.status(201).send({ success: true, data: product });
}

export async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const { id } = request.params as { id: string };
  const data = updateProductSchema.parse(request.body);
  const old = await productService.getProductById(Number(id), user.companyId);
  const product = await productService.updateProduct(Number(id), data, user.companyId);
  await log(user.id, user.name, 'UPDATE', 'product', Number(id), old, data, request.ip, user.companyId);
  return reply.send({ success: true, data: product });
}

export async function deleteHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const { id } = request.params as { id: string };
  const old = await productService.getProductById(Number(id), user.companyId);
  await productService.deleteProduct(Number(id), user.companyId);
  await log(user.id, user.name, 'DELETE', 'product', Number(id), old, null, request.ip, user.companyId);
  return reply.send({ success: true, message: 'Produto excluido com sucesso' });
}
