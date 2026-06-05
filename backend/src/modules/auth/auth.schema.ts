import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(8, 'Senha deve ter no minimo 8 caracteres'),
});

export type LoginInput = z.infer<typeof loginSchema>;
