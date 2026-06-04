import { z } from 'zod';

export const createAppointmentSchema = z.object({
  title: z.string().min(2, 'Titulo deve ter no minimo 2 caracteres'),
  description: z.string().optional().nullable(),
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve ser no formato YYYY-MM-DD'),
  appointment_time: z.string().optional().nullable(),
  client_id: z.number().int().positive().optional().nullable(),
});

export const updateAppointmentSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  appointment_time: z.string().optional().nullable(),
  client_id: z.number().int().positive().optional().nullable(),
  status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
