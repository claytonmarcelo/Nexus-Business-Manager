import { z } from "zod";
import { env } from "../config/env";

// Regra definitiva de acesso (definida pelo administrador do projeto):
// senha com no mínimo 8 caracteres, incluindo ao menos uma letra MAIÚSCULA
// e ao menos um caractere ESPECIAL. Vale para toda senha criada no sistema.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

// A8: o endereço do administrador global saiu do código. Vem de
// SUPER_ADMIN_EMAIL no ambiente, e o valor histórico só vale fora de produção
// (é a conta que README, seed local e ferramentas de print conhecem). Em
// produção, sem a variável, a string fica vazia: ninguém é "o administrador"
// por endereço, e a proteção real continua sendo a bandeira `platformRole` no
// banco. Comparar com "" nunca casa com um usuário de verdade.
const ADMINISTRADOR_GLOBAL_PADRAO = "nexusbussiness.admin@gmail.com";

export const SUPER_ADMIN_EMAIL = (
  env.SUPER_ADMIN_EMAIL || (env.NODE_ENV === "production" ? "" : ADMINISTRADOR_GLOBAL_PADRAO)
).toLowerCase();

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
