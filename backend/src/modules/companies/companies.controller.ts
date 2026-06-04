import { FastifyRequest, FastifyReply } from 'fastify';
import { createCompanySchema, updateCompanySchema } from './companies.schema';
import * as companyService from './companies.service';

export async function listHandler(request: FastifyRequest, reply: FastifyReply) {
  const companies = await companyService.listCompanies();
  return reply.send({ success: true, data: companies });
}

export async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const company = await companyService.getCompanyById(Number(id));
  return reply.send({ success: true, data: company });
}

export async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const data = createCompanySchema.parse(request.body);
  const company = await companyService.createCompany(data);
  return reply.status(201).send({ success: true, data: company });
}

export async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const data = updateCompanySchema.parse(request.body);
  const company = await companyService.updateCompany(Number(id), data);
  return reply.send({ success: true, data: company });
}
