import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import { env } from "../config/env";
import { unauthorized } from "../lib/errors";

export interface AccessTokenPayload {
  sub: string; // userId
  cid: string; // empresa ativa
  role: string;
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

// Função nomeada de propósito: o gate estrutural (plugins/gate.ts) reconhece a
// proteção de rota por identidade desta função, não por string solta.
export async function authenticate(req: FastifyRequest): Promise<void> {
  try {
    await req.jwtVerify();
  } catch {
    throw unauthorized("Token inválido ou expirado");
  }
}

async function authPlugin(app: FastifyInstance): Promise<void> {
  await app.register(jwt, {
    secret: env.JWT_ACCESS_SECRET,
    sign: { expiresIn: env.JWT_ACCESS_TTL },
  });

  app.decorate("authenticate", authenticate);
}

export default fp(authPlugin, { name: "auth" });
