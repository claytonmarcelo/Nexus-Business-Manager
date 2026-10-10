import type { FastifyRequest } from "fastify";
import { prisma } from "./prisma";
import { forbidden, unauthorized } from "./errors";
import type { Role } from "@prisma/client";

export interface CompanyContext {
  userId: string;
  companyId: string;
  role: Role;
}

// Deriva o contexto da empresa SEMPRE do token + vínculo no banco.
// Ignora qualquer company_id vindo do corpo/query do cliente (ADR-0002, seção 35).
export async function resolveCompanyContext(
  req: FastifyRequest,
): Promise<CompanyContext> {
  const auth = req.user as { sub?: string; cid?: string } | undefined;
  if (!auth?.sub) throw unauthorized();

  const cid = auth.cid;
  if (!cid) throw forbidden("Sessão sem empresa ativa");

  const membership = await prisma.companyUser.findUnique({
    where: { userId_companyId: { userId: auth.sub, companyId: cid } },
  });
  if (!membership) {
    throw forbidden("Usuário não pertence à empresa do token");
  }

  return { userId: auth.sub, companyId: cid, role: membership.role };
}
