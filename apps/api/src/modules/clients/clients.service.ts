import { prisma } from "../../lib/prisma";
import { notFound } from "../../lib/errors";
import { paginate, skipTake, type PaginationInput } from "../../lib/pagination";
import { audit } from "../../lib/audit";
import type { CreateClientInput, UpdateClientInput } from "./clients.schemas";

// Listagem paginada sempre restrita à empresa do token (ADR-0002).
export async function listClients(companyId: string, p: PaginationInput, search?: string) {
  const where = {
    companyId,
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { document: { contains: search } },
          ],
        }
      : {}),
  };
  const [data, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...skipTake(p),
      select: { id: true, name: true, email: true, phone: true, document: true, active: true, createdAt: true, updatedAt: true },
    }),
    prisma.client.count({ where }),
  ]);
  return paginate(data, total, p);
}

export async function createClient(companyId: string, input: CreateClientInput, userId: string, ip: string) {
  const client = await prisma.client.create({ data: { ...input, companyId } });
  await audit({ userId, companyId, action: "client.create", entity: "client", entityId: client.id, ip });
  return client;
}

export async function getClient(companyId: string, id: string) {
  const client = await prisma.client.findFirst({ where: { id, companyId } });
  if (!client) throw notFound("Cliente não encontrado");
  return client;
}

// Fase 1c da auditoria: toda escrita carrega o companyId no where. A leitura de
// confirmação continua dando a mensagem amigável de 404, mas agora a própria
// gravação falha (P2025 → 404) se a linha pertencer a outra empresa — não
// depende mais de quem lembrar de chamar o getClient antes.
export async function updateClient(companyId: string, id: string, input: UpdateClientInput, userId: string, ip: string) {
  await getClient(companyId, id);
  const client = await prisma.client.update({ where: { id, companyId }, data: input });
  await audit({ userId, companyId, action: "client.update", entity: "client", entityId: id, ip });
  return client;
}

// Exclusão lógica: preserva histórico de vendas/auditoria (sem apagar dados).
export async function deactivateClient(companyId: string, id: string, userId: string, ip: string) {
  await getClient(companyId, id);
  await prisma.client.update({ where: { id, companyId }, data: { active: false } });
  await audit({ userId, companyId, action: "client.delete", entity: "client", entityId: id, ip });
  return { ok: true };
}
