import type { FastifyRequest } from "fastify";
import type { AccessTokenPayload } from "../plugins/auth";
import { unauthorized } from "./errors";

// req.user vem de @fastify/jwt como union; centralizamos o cast seguro.
export function authPayload(req: FastifyRequest): AccessTokenPayload {
  const user = req.user as unknown;
  if (!user || typeof user !== "object" || !("sub" in user)) throw unauthorized();
  return user as AccessTokenPayload;
}
