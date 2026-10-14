import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import { env } from "../config/env";
import { unauthorized } from "../lib/errors";

export interface AccessTokenPayload {
  sub: string; // userId
  cid: string; // empresa ativa
  role: string;
  // Um token de sessão nunca traz escopo. Os dois escopos abaixo são etapas do
  // login (F4/D3) e existem para que a resposta "falta o segundo fator" não
  // precise emitir uma sessão pela metade — ver `authenticate` e
  // `authenticateSegundoFator`, que se recusam mutuamente.
  escopo?: never;
}

/** Os dois tokens de etapa do login: um pede configuração, o outro pede o código. */
export type EscopoDeToken = "2fa-configuracao" | "2fa-desafio";

export interface EscopoPayload {
  sub: string;
  escopo: EscopoDeToken;
  // O desafio já sabe em que casa a pessoa ia entrar; a configuração também
  // precisa disso para conseguir emitir sessão quando o segundo fator ligar.
  cid?: string;
  role?: string;
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authenticateSegundoFator: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

interface PayloadBruto {
  sub?: unknown;
  cid?: unknown;
  role?: unknown;
  escopo?: unknown;
}

function payloadBruto(req: FastifyRequest): PayloadBruto {
  const u = req.user as unknown;
  return u && typeof u === "object" ? (u as PayloadBruto) : {};
}

// Função nomeada de propósito: o gate estrutural (plugins/gate.ts) reconhece a
// proteção de rota por identidade desta função, não por string solta.
export async function authenticate(req: FastifyRequest): Promise<void> {
  try {
    await req.jwtVerify();
  } catch {
    throw unauthorized("Token inválido ou expirado");
  }
  // F4 (D3): o token de etapa NÃO abre rota de negócio. Ele é assinado com o mesmo
  // segredo, com o mesmo `sub` e um tempo de vida curto — se a diferença entre ele
  // e uma sessão fosse só a boa vontade de quem confere, quem tivesse o token de
  // desafio poderia circular o painel inteiro enquanto o segundo fator ainda nem
  // foi digitado. A régua é construtiva: sessão exige empresa e papel e exige não
  // ter escopo; o contrário também é verdade em `authenticateSegundoFator`.
  const bruto = payloadBruto(req);
  if (typeof bruto.escopo === "string" || typeof bruto.sub !== "string" || typeof bruto.cid !== "string" || typeof bruto.role !== "string") {
    throw unauthorized("Token inválido ou expirado");
  }
}

// Decorador das rotas de segundo fator: só entra token de etapa, e cada rota
// ainda diz qual dos dois escopos aceita. Uma sessão comum é recusada aqui pelo
// mesmo motivo de acima — desligar o segundo fator é decisão autenticada, não
// consequência de ter chegado com a chave errada.
export async function authenticateSegundoFator(req: FastifyRequest): Promise<void> {
  try {
    await req.jwtVerify();
  } catch {
    throw unauthorized("Token de etapa expirado; faça login novamente");
  }
  const bruto = payloadBruto(req);
  if (bruto.escopo !== "2fa-configuracao" && bruto.escopo !== "2fa-desafio") {
    throw unauthorized("Token de etapa expirado; faça login novamente");
  }
}

async function authPlugin(app: FastifyInstance): Promise<void> {
  await app.register(jwt, {
    secret: env.JWT_ACCESS_SECRET,
    sign: { expiresIn: env.JWT_ACCESS_TTL },
  });

  app.decorate("authenticate", authenticate);
  app.decorate("authenticateSegundoFator", authenticateSegundoFator);
}

export default fp(authPlugin, { name: "auth" });
