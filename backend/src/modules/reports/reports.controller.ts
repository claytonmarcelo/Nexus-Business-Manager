import { FastifyRequest, FastifyReply } from 'fastify';
import * as reportService from './reports.service';

export async function clientsReportHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const data = await reportService.generateClientReport(user.company_id);
  return reply.send(data);
}

export async function productsReportHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const data = await reportService.generateProductReport(user.company_id);
  return reply.send(data);
}

export async function financialReportHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const data = await reportService.generateFinancialReport(user.company_id);
  return reply.send(data);
}

export async function stockReportHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const data = await reportService.generateStockReport(user.company_id);
  return reply.send(data);
}
