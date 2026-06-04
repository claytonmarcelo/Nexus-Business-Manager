import { FastifyRequest, FastifyReply } from 'fastify';
import { createSaleSchema } from './sales.schema';
import * as saleService from './sales.service';

export async function listHandler(_request: FastifyRequest, reply: FastifyReply) {
  const user = _request.user as { company_id: number };
  const sales = await saleService.listSales(user.company_id);
  return reply.send(sales);
}

export async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const { id } = request.params as { id: string };
  const sale = await saleService.getSaleById(Number(id), user.company_id);
  const items = await saleService.getSaleItems(Number(id));
  return reply.send({ ...sale, items });
}

export async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; company_id: number };
  const data = createSaleSchema.parse(request.body);
  const sale = await saleService.createSale(data, user.id, user.company_id);
  return reply.status(201).send(sale);
}
