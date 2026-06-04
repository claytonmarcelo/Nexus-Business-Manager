import { FastifyRequest, FastifyReply } from 'fastify';
import { createAppointmentSchema, updateAppointmentSchema } from './appointments.schema';
import * as appointmentService from './appointments.service';

export async function listHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const { date } = request.query as { date?: string };
  if (date) {
    const appointments = await appointmentService.getAppointmentsByDate(date, user.company_id);
    return reply.send(appointments);
  }
  const appointments = await appointmentService.listAppointments(user.company_id);
  return reply.send(appointments);
}

export async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const { id } = request.params as { id: string };
  const appointment = await appointmentService.getAppointmentById(Number(id), user.company_id);
  return reply.send(appointment);
}

export async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; company_id: number };
  const data = createAppointmentSchema.parse(request.body);
  const appointment = await appointmentService.createAppointment(data, user.id, user.company_id);
  return reply.status(201).send(appointment);
}

export async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const { id } = request.params as { id: string };
  const data = updateAppointmentSchema.parse(request.body);
  const appointment = await appointmentService.updateAppointment(Number(id), data, user.company_id);
  return reply.send(appointment);
}

export async function deleteHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const { id } = request.params as { id: string };
  await appointmentService.deleteAppointment(Number(id), user.company_id);
  return reply.status(204).send();
}
