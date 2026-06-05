import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no minimo 3 caracteres'),
  email: z.string().email('Email invalido'),
  password: z.string().min(8, 'Senha deve ter no minimo 8 caracteres').max(64),
  role: z.enum(['admin', 'manager', 'operator', 'viewer']),
  avatarUrl: z.string().max(255).optional(),
  themePreference: z.enum(['dark', 'light']).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(3).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).max(64).optional(),
  role: z.enum(['admin', 'manager', 'operator', 'viewer']).optional(),
  active: z.boolean().optional(),
  avatarUrl: z.string().max(255).optional(),
  themePreference: z.enum(['dark', 'light']).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
