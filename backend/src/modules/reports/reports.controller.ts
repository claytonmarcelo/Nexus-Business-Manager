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

export async function downloadPDFHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const { type } = request.params as { type: string };

  const validTypes = ['clients', 'products', 'financial', 'stock'];
  if (!validTypes.includes(type)) {
    return reply.status(400).send({ error: 'Tipo de relatorio invalido' });
  }

  const pdf = await reportService.generatePDF(user.company_id, type);

  reply.header('Content-Type', 'application/pdf');
  reply.header('Content-Disposition', `attachment; filename=relatorio_${type}_${new Date().toISOString().split('T')[0]}.pdf`);
  return reply.send(pdf);
}

export async function downloadExcelHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const { type } = request.params as { type: string };

  const validTypes = ['clients', 'products', 'financial', 'stock'];
  if (!validTypes.includes(type)) {
    return reply.status(400).send({ error: 'Tipo de relatorio invalido' });
  }

  const excel = await reportService.generateExcel(user.company_id, type);

  reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  reply.header('Content-Disposition', `attachment; filename=relatorio_${type}_${new Date().toISOString().split('T')[0]}.xlsx`);
  return reply.send(excel);
}
