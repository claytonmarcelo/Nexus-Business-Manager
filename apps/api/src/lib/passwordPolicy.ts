import { z } from "zod";

// Regra definitiva de acesso (definida pelo administrador do projeto):
// senha com no mínimo 8 caracteres, incluindo ao menos uma letra MAIÚSCULA
// e ao menos um caractere ESPECIAL. Vale para toda senha criada no sistema.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const SUPER_ADMIN_EMAIL = "nexusbussiness.admin@gmail.com";

export function isStrongPassword(pw: string): boolean {
  return (
    pw.length >= PASSWORD_MIN_LENGTH &&
    pw.length <= PASSWORD_MAX_LENGTH &&
    /[A-Z]/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw)
  );
}

export const PASSWORD_HINT =
  "A senha deve ter no mínimo 8 caracteres, incluindo uma letra maiúscula e um caractere especial";

export const strongPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, PASSWORD_HINT)
  .max(PASSWORD_MAX_LENGTH, "Senha longa demais")
  .refine(isStrongPassword, PASSWORD_HINT);
