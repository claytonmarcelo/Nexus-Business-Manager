import { z } from "zod";
import { strongPassword, PASSWORD_HINT } from "../../lib/passwordPolicy";
import { somenteDigitos, telefoneValido } from "../../lib/brFields";

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

// Perfil da própria conta: todo papel pode ajustar o próprio nome e telefone.
// Campo ausente significa "não mexer"; telefone vazio ou null limpa o valor.
export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2, "Informe seu nome completo").max(120, "Nome longo demais").optional(),
    phone: z
      .string()
      .trim()
      .max(32, "Telefone longo demais")
      .refine(
        (v) => v === "" || telefoneValido(somenteDigitos(v)),
        "Informe um telefone válido com DDD (ex.: (11) 98888-7777)",
      )
      .nullable()
      .optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, "Envie ao menos um campo para gravar");

// Troca de senha autenticada: conferimos a senha atual antes de gravar a nova.
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual"),
    newPassword: strongPassword,
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export { PASSWORD_HINT };
