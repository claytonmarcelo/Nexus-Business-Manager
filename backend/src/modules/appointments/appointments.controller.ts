import { FastifyRequest, FastifyReply } from 'fastify';
import { createAppointmentSchema, updateAppointmentSchema } from './appointments.schema';
import * as appointmentService from './appointments.service';
import { parsePagination } from '../../shared/utils/pagination';
import { log } from '../audit/audit.service';

export async function listHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const { date } = request.query as { date?: string };
  if (date) {
    const appointments = await appointmentService.getAppointmentsByDate(date, user.companyId);
    return reply.send({ success: true, data: appointments });
  }
  const params = parsePagination(request.query as Record<string, any>);
  const result = await appointmentService.listAppointments(user.companyId, params);
  return reply.send({ success: true, ...result });
}

export async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: number };
  const { id } = request.params as { id: string };
  const appointment = await appointmentService.getAppointmentById(Number(id), user.companyId);
  return reply.send({ success: true, data: appointment });
}

export async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const data = createAppointmentSchema.parse(request.body);
  const appointment = await appointmentService.createAppointment(data, user.id, user.companyId);
  await log(user.id, user.name, 'CREATE', 'appointment', appointment.id, null, data, request.ip, user.companyId);
  return reply.status(201).send({ success: true, data: appointment });
}

export async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const { id } = request.params as { id: string };
  const data = updateAppointmentSchema.parse(request.body);
  const old = await appointmentService.getAppointmentById(Number(id), user.companyId);
  const appointment = await appointmentService.updateAppointment(Number(id), data, user.companyId);
  await log(user.id, user.name, 'UPDATE', 'appointment', Number(id), old, data, request.ip, user.companyId);
  return reply.send({ success: true, data: appointment });
}

export async function deleteHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const { id } = request.params as { id: string };
  const old = await appointmentService.getAppointmentById(Number(id), user.companyId);
  await appointmentService.deleteAppointment(Number(id), user.companyId);
  await log(user.id, user.name, 'DELETE', 'appointment', Number(id), old, null, request.ip, user.companyId);
  return reply.send({ success: true, message: 'Agendamento excluido com sucesso' });
}
