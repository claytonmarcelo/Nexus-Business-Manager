import { FastifyRequest, FastifyReply } from 'fastify';
import { createSaleSchema } from './sales.schema';
import * as saleService from './sales.service';
import { parsePagination } from '../../shared/utils/pagination';
import { log } from '../audit/audit.service';

export async function listHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const params = parsePagination(request.query as Record<string, any>);
  const result = await saleService.listSales(user.companyId, params);
  return reply.send({ success: true, ...result });
}

export async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: number };
  const { id } = request.params as { id: string };
  const sale = await saleService.getSaleById(Number(id), user.companyId);
  const items = await saleService.getSaleItems(Number(id));
  return reply.send({ success: true, data: { ...sale, items } });
}

export async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const data = createSaleSchema.parse(request.body);
  const sale = await saleService.createSale(data, user.id, user.companyId);
  await log(user.id, user.name, 'CREATE', 'sale', sale.id, null, data, request.ip, user.companyId);
  return reply.status(201).send({ success: true, data: sale });
}
