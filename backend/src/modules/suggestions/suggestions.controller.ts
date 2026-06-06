import { FastifyRequest, FastifyReply } from 'fastify';
import { createSuggestionSchema, updateSuggestionSchema } from './suggestions.schema';
import * as suggestionService from './suggestions.service';
import { parsePagination } from '../../shared/utils/pagination';
import { log } from '../audit/audit.service';

export async function listHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const { status, category } = request.query as { status?: string; category?: string };
  const params = parsePagination(request.query as Record<string, any>);
  const result = await suggestionService.listSuggestions(user.companyId, { ...params, status, category });
  return reply.send({ success: true, ...result });
}

export async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: number };
  const { id } = request.params as { id: string };
  const suggestion = await suggestionService.getSuggestionById(Number(id), user.companyId);
  return reply.send({ success: true, data: suggestion });
}

export async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const data = createSuggestionSchema.parse(request.body);
  const { suggestion, blocked } = await suggestionService.createSuggestion(data, user.id, user.name, user.companyId);
  await log(user.id, user.name, 'CREATE', 'suggestion', suggestion.id, null, data, request.ip, user.companyId);

  if (blocked) {
    return reply.status(201).send({
      success: true,
      data: suggestion,
      blocked: true,
      message: 'Sugestao enviada mas bloqueada por conteudo ofensivo. Entre em contato com o administrador.',
    });
  }

  return reply.status(201).send({ success: true, data: suggestion, message: 'Sugestao enviada com sucesso!' });
}

export async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const { id } = request.params as { id: string };
  const data = updateSuggestionSchema.parse(request.body);
  const old = await suggestionService.getSuggestionById(Number(id), user.companyId);
  const suggestion = await suggestionService.updateSuggestion(Number(id), data, user.companyId);
  await log(user.id, user.name, 'UPDATE', 'suggestion', Number(id), old, data, request.ip, user.companyId);
  return reply.send({ success: true, data: suggestion });
}

export async function deleteHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const { id } = request.params as { id: string };
  const old = await suggestionService.getSuggestionById(Number(id), user.companyId);
  await suggestionService.deleteSuggestion(Number(id), user.companyId);
  await log(user.id, user.name, 'DELETE', 'suggestion', Number(id), old, null, request.ip, user.companyId);
  return reply.send({ success: true, message: 'Sugestao excluida com sucesso' });
}

export async function statsHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: number };
  const stats = await suggestionService.countByStatus(user.companyId);
  return reply.send({ success: true, data: stats });
}
