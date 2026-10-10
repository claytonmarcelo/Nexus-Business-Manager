import { prisma } from "../../lib/prisma";
import { conflict } from "../../lib/errors";
import { audit } from "../../lib/audit";
import type { CreateCompanyInput } from "./companies.schemas";
import { SUPER_ADMIN_EMAIL } from "../../lib/passwordPolicy";

export interface CreatedCompany {
  id: string;
  name: string;
  slug: string;
}

// Cria empresa e vincula o usuário autenticado como OWNER (transação única, seção 8.3).
export async function createCompany(
  input: CreateCompanyInput,
  ownerId: string,
  ip?: string,
): Promise<CreatedCompany> {
  const exists = await prisma.company.findUnique({ where: { slug: input.slug } });
  if (exists) throw conflict("Já existe uma empresa com este slug");

  const owner = await prisma.user.findUnique({ where: { id: ownerId } });
  if (!owner) throw conflict("Usuário proprietário não encontrado");

  return prisma.$transaction(async (tx) => {
    const company = await tx.company.create({ data: { name: input.name, slug: input.slug } });
    await tx.companyUser.create({
      data: { userId: ownerId, companyId: company.id, role: "OWNER" },
    });
    // Regra definitiva: o administrador global é OWNER de toda empresa criada.
    const superAdmin = await tx.user.findUnique({ where: { email: SUPER_ADMIN_EMAIL } });
    if (superAdmin && superAdmin.id !== ownerId) {
      await tx.companyUser.upsert({
        where: { userId_companyId: { userId: superAdmin.id, companyId: company.id } },
        update: { role: "OWNER" },
        create: { userId: superAdmin.id, companyId: company.id, role: "OWNER" },
      });
    }
    await audit({
      userId: ownerId,
      companyId: company.id,
      action: "company.create",
      entity: "company",
      entityId: company.id,
      ip: ip ?? null,
    });
    return { id: company.id, name: company.name, slug: company.slug };
  });
}

export async function listCompaniesForUser(userId: string) {
  const memberships = await prisma.companyUser.findMany({
    where: { userId },
    include: { company: true },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => ({
    id: m.company.id,
    name: m.company.name,
    slug: m.company.slug,
    role: m.role,
    active: m.company.active,
  }));
}
