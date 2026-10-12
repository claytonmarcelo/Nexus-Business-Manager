import { z } from "zod";
import { env } from "../config/env";

// Regra definitiva de acesso (definida pelo administrador do projeto):
// senha com no mínimo 8 caracteres, incluindo ao menos uma letra MAIÚSCULA
// e ao menos um caractere ESPECIAL. Vale para toda senha criada no sistema.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

// A8 tirou o endereço do código; a R2 tirou também o valor histórico que fazia
// de padrão fora de produção. O administrador real desta instalação vem de
// SUPER_ADMIN_EMAIL, declarado no `.env` da máquina — nunca no repositório.
// Sem a variável, dev e teste usam a conta fictícia abaixo, que não casa com
// ninguém de verdade. Em produção a ausência derruba a inicialização (o
// validador de `config/producao.ts`), então ninguém herda padrão nenhum: a
// proteção continua sendo a bandeira `platformRole` no banco.
const ADMINISTRADOR_GLOBAL_FICTICIO = "admin@exemplo.test";

export const SUPER_ADMIN_EMAIL = (
  env.SUPER_ADMIN_EMAIL || (env.NODE_ENV === "production" ? "" : ADMINISTRADOR_GLOBAL_FICTICIO)
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
