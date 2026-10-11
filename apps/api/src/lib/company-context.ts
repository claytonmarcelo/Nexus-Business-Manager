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
//
// A5 do prompt de mercado: conferir o vínculo não basta. "Desativar usuário" e
// "inativar empresa" são ações de venda e de incidente — até aqui o access token
// ainda valido continuava operando até vencer (15 minutos de escrita em uma
// conta que o dono já desligou). As duas bandeiras vêm na MESMA consulta do
// vínculo: uma ida ao banco por requisição, como antes.
export async function resolveCompanyContext(
  req: FastifyRequest,
): Promise<CompanyContext> {
  const auth = req.user as { sub?: string; cid?: string } | undefined;
  if (!auth?.sub) throw unauthorized();

  const cid = auth.cid;
  if (!cid) throw forbidden("Sessão sem empresa ativa");

  const membership = await prisma.companyUser.findUnique({
    where: { userId_companyId: { userId: auth.sub, companyId: cid } },
    include: {
      user: { select: { active: true } },
      company: { select: { active: true } },
    },
  });
  if (!membership) {
    throw forbidden("Usuário não pertence à empresa do token");
  }
  if (!membership.user.active) {
    throw forbidden("Conta desativada");
  }
  if (!membership.company.active) {
    throw forbidden("Empresa inativa");
  }

  return { userId: auth.sub, companyId: cid, role: membership.role };
}
