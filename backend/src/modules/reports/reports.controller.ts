import { FastifyRequest, FastifyReply } from 'fastify';
import * as reportService from './reports.service';
import { log } from '../audit/audit.service';

export async function clientsReportHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const data = await reportService.generateClientReport(user.companyId);
  await log(user.id, user.name, 'EXPORT', 'report', null, null, { type: 'clients' }, request.ip, user.companyId);
  return reply.send({ success: true, data });
}

export async function productsReportHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const data = await reportService.generateProductReport(user.companyId);
  await log(user.id, user.name, 'EXPORT', 'report', null, null, { type: 'products' }, request.ip, user.companyId);
  return reply.send({ success: true, data });
}

export async function financialReportHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const data = await reportService.generateFinancialReport(user.companyId);
  await log(user.id, user.name, 'EXPORT', 'report', null, null, { type: 'financial' }, request.ip, user.companyId);
  return reply.send({ success: true, data });
}

export async function stockReportHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const data = await reportService.generateStockReport(user.companyId);
  await log(user.id, user.name, 'EXPORT', 'report', null, null, { type: 'stock' }, request.ip, user.companyId);
  return reply.send({ success: true, data });
}

export async function salesReportHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const data = await reportService.generateSalesReport(user.companyId);
  await log(user.id, user.name, 'EXPORT', 'report', null, null, { type: 'sales' }, request.ip, user.companyId);
  return reply.send({ success: true, data });
}

export async function downloadPDFHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const { type } = request.params as { type: string };

  const validTypes = ['clients', 'products', 'financial', 'stock', 'sales'];
  if (!validTypes.includes(type)) {
    return reply.status(400).send({ success: false, message: 'Tipo de relatorio invalido', errorCode: 'VALIDATION_ERROR' });
  }

  const pdf = await reportService.generatePDF(user.companyId, type);
  await log(user.id, user.name, 'EXPORT', 'report_pdf', null, null, { type }, request.ip, user.companyId);

  reply.header('Content-Type', 'application/pdf');
  reply.header('Content-Disposition', `attachment; filename=relatorio_${type}_${new Date().toISOString().split('T')[0]}.pdf`);
  return reply.send(pdf);
}

export async function downloadExcelHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const { type } = request.params as { type: string };

  const validTypes = ['clients', 'products', 'financial', 'stock', 'sales'];
  if (!validTypes.includes(type)) {
    return reply.status(400).send({ success: false, message: 'Tipo de relatorio invalido', errorCode: 'VALIDATION_ERROR' });
  }

  const excel = await reportService.generateExcel(user.companyId, type);
  await log(user.id, user.name, 'EXPORT', 'report_xlsx', null, null, { type }, request.ip, user.companyId);

  reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  reply.header('Content-Disposition', `attachment; filename=relatorio_${type}_${new Date().toISOString().split('T')[0]}.xlsx`);
  return reply.send(excel);
}
