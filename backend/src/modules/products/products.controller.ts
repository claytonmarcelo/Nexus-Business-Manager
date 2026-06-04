import { FastifyRequest, FastifyReply } from 'fastify';
import { createProductSchema, updateProductSchema } from './products.schema';
import * as productService from './products.service';

export async function listHandler(_request: FastifyRequest, reply: FastifyReply) {
  const products = await productService.listProducts();
  return reply.send(products);
}

export async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const product = await productService.getProductById(Number(id));
  return reply.send(product);
}

export async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const data = createProductSchema.parse(request.body);
  const user = request.user as { id: number };
  const product = await productService.createProduct(data, user.id);
  return reply.status(201).send(product);
}

export async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const data = updateProductSchema.parse(request.body);
  const product = await productService.updateProduct(Number(id), data);
  return reply.send(product);
}

export async function deleteHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await productService.deleteProduct(Number(id));
  return reply.status(204).send();
}
