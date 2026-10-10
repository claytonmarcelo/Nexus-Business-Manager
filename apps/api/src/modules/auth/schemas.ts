import { z } from "zod";
import { strongPassword, PASSWORD_HINT } from "../../lib/passwordPolicy";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  companyId: z.string().min(1).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const switchCompanySchema = z.object({
  companyId: z.string().min(1),
});

// Cadastro self-service: cria usuário + empresa própria (OWNER).
export const registerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: strongPassword,
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  token: z.string().min(16, "Cole o código de recuperação recebido"),
  password: strongPassword,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export { PASSWORD_HINT };
