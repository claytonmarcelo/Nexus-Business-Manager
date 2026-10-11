import type { FastifyRequest } from "fastify";
import { prisma } from "./prisma";
import { forbidden } from "./errors";

// Fase 1b da auditoria comercial: separar o administrador da PLATAFORMA do
// admin de uma EMPRESA. Vitrine, textos legais e rotinas de sistema são coisas
// que não pertencem a nenhum tenant — quem responde por eles é a plataforma.
// A fonte da verdade é a coluna `users.platform_role`, conferida no banco a
// cada requisição (sem depender do que o token carrega), então revogar o
// alcance de plataforma vale na hora, sem esperar token expirar.
export async function assertPlatformAdmin(req: FastifyRequest): Promise<void> {
  const auth = req.user as { sub?: string } | undefined;
  if (!auth?.sub) throw forbidden("Área reservada da plataforma");
  const dono = await prisma.user.findFirst({
    where: { id: auth.sub, active: true, platformRole: "SUPER_ADMIN" },
    select: { id: true },
  });
  if (!dono) {
    throw forbidden("Esta área responde pela plataforma inteira — acesso reservado ao administrador da plataforma");
  }
}
