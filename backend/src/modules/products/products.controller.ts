import { FastifyRequest, FastifyReply } from 'fastify';
import { createProductSchema, updateProductSchema } from './products.schema';
import * as productService from './products.service';

export async function listHandler(_request: FastifyRequest, reply: FastifyReply) {
  const user = _request.user as { company_id: number };
  const products = await productService.listProducts(user.company_id);
  return reply.send(products);
}

export async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const { id } = request.params as { id: string };
  const product = await productService.getProductById(Number(id), user.company_id);
  return reply.send(product);
}

export async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; company_id: number };
  const data = createProductSchema.parse(request.body);
  const product = await productService.createProduct(data, user.id, user.company_id);
  return reply.status(201).send(product);
}

export async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const { id } = request.params as { id: string };
  const data = updateProductSchema.parse(request.body);
  const product = await productService.updateProduct(Number(id), data, user.company_id);
  return reply.send(product);
}

export async function deleteHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const { id } = request.params as { id: string };
  await productService.deleteProduct(Number(id), user.company_id);
  return reply.status(204).send();
}
