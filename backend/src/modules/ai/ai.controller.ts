import { FastifyRequest, FastifyReply } from 'fastify';
import { chatSchema, analyzeSchema } from './ai.schemas';
import * as aiService from './ai.service';

export async function chatHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const data = chatSchema.parse(request.body);
  const result = await aiService.chat(data, user.companyId);
  return reply.send({ success: true, ...result });
}

export async function suggestionsHandler(request: FastifyRequest, reply: FastifyReply) {
  const { module } = request.query as { module?: string };
  const suggestions = await aiService.getSuggestions(module || '');
  return reply.send({ success: true, data: suggestions });
}

export async function insightsHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: number };
  const insights = await aiService.getInsights(user.companyId);
  return reply.send({ success: true, data: insights });
}

export async function helpHandler(request: FastifyRequest, reply: FastifyReply) {
  const { module } = request.params as { module: string };
  const result = await aiService.getHelp(module);
  return reply.send({ success: true, data: result });
}

export async function analyzeHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: number };
  const data = analyzeSchema.parse(request.body);
  const result = await aiService.analyze(data, user.companyId);
  return reply.send({ success: true, ...result });
}
