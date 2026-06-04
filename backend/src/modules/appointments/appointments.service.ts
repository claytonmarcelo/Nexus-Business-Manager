import { query, execute } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/app-error';
import { CreateAppointmentInput, UpdateAppointmentInput } from './appointments.schema';
import { RowDataPacket } from 'mysql2';
import { PaginationParams, PaginatedResult, buildPaginatedResponse } from '../../shared/utils/pagination';

interface AppointmentRow extends RowDataPacket {
  id: number;
  title: string;
  description: string | null;
  appointment_date: string;
  appointment_time: string | null;
  client_id: number | null;
  status: string;
  created_at: string;
  client_name: string | null;
}

export async function listAppointments(companyId: number, params: PaginationParams): Promise<PaginatedResult<AppointmentRow>> {
  const where = ['a.company_id = ?'];
  const values: unknown[] = [companyId];

  if (params.search) {
    where.push('(a.title LIKE ? OR c.name LIKE ?)');
    const term = `%${params.search}%`;
    values.push(term, term);
  }

  const countResult = await query<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM appointments a LEFT JOIN clients c ON c.id = a.client_id WHERE ${where.join(' AND ')}`, values
  );
  const total = countResult[0].total;

  const data = await query<AppointmentRow[]>(
    `SELECT a.*, c.name as client_name
     FROM appointments a
     LEFT JOIN clients c ON c.id = a.client_id
     WHERE ${where.join(' AND ')}
     ORDER BY a.appointment_date DESC, a.appointment_time ASC LIMIT ? OFFSET ?`,
    [...values, params.limit, params.offset]
  );

  return buildPaginatedResponse(data, total, params);
}

export async function getAppointmentsByDate(date: string, companyId: number): Promise<AppointmentRow[]> {
  return query<AppointmentRow[]>(
    `SELECT a.*, c.name as client_name
     FROM appointments a
     LEFT JOIN clients c ON c.id = a.client_id
     WHERE a.appointment_date = ? AND a.company_id = ?
     ORDER BY a.appointment_time ASC`, [date, companyId]
  );
}

export async function getAppointmentById(id: number, companyId: number): Promise<AppointmentRow> {
  const appointments = await query<AppointmentRow[]>(
    `SELECT a.*, c.name as client_name
     FROM appointments a
     LEFT JOIN clients c ON c.id = a.client_id
     WHERE a.id = ? AND a.company_id = ?`, [id, companyId]
  );
  if (appointments.length === 0) throw new AppError('Agendamento nao encontrado', 404);
  return appointments[0];
}

export async function createAppointment(data: CreateAppointmentInput, userId: number, companyId: number): Promise<AppointmentRow> {
  const result = await execute(
    'INSERT INTO appointments (title, description, appointment_date, appointment_time, client_id, status, created_by, company_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [data.title, data.description || null, data.appointment_date, data.appointment_time || null, data.client_id || null, data.status || 'scheduled', userId, companyId]
  );
  return getAppointmentById(result.insertId, companyId);
}

export async function updateAppointment(id: number, data: UpdateAppointmentInput, companyId: number): Promise<AppointmentRow> {
  await getAppointmentById(id, companyId);

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
  if (data.appointment_date !== undefined) { fields.push('appointment_date = ?'); values.push(data.appointment_date); }
  if (data.appointment_time !== undefined) { fields.push('appointment_time = ?'); values.push(data.appointment_time); }
  if (data.client_id !== undefined) { fields.push('client_id = ?'); values.push(data.client_id); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }

  if (fields.length > 0) {
    values.push(id, companyId);
    await execute(`UPDATE appointments SET ${fields.join(', ')} WHERE id = ? AND company_id = ?`, values);
  }

  return getAppointmentById(id, companyId);
}

export async function deleteAppointment(id: number, companyId: number): Promise<void> {
  await getAppointmentById(id, companyId);
  await execute('DELETE FROM appointments WHERE id = ? AND company_id = ?', [id, companyId]);
}
