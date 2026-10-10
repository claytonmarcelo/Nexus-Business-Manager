import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Regra definitiva de acesso do projeto (ver CREDENCIAIS.md na raiz):
// este administrador global é OWNER de todas as empresas e não pode ser removido.
const SUPER_EMAIL = "nexusbussiness.admin@gmail.com";
const SUPER_PASSWORD = "senha-removida-do-git";

// Conta de desenvolvimento usada pela suíte de testes automatizados.
const DEV_EMAIL = "admin@nexus.local";
const DEV_PASSWORD = "Nexus@2026";

async function ensureUser(email: string, name: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, passwordHash },
  });
}

async function main(): Promise<void> {
  const superAdmin = await ensureUser(SUPER_EMAIL, "Administrador Nexus", SUPER_PASSWORD);
  const devAdmin = await ensureUser(DEV_EMAIL, "Administrador Nexus", DEV_PASSWORD);

  const company = await prisma.company.upsert({
    where: { slug: "nexus-demo" },
    update: {},
    create: { name: "Nexus Demo", slug: "nexus-demo" },
  });

  // O administrador definitivo recebe OWNER em TODAS as empresas do banco.
  const companies = await prisma.company.findMany({ select: { id: true } });
  for (const c of companies) {
    await prisma.companyUser.upsert({
      where: { userId_companyId: { userId: superAdmin.id, companyId: c.id } },
      update: { role: "OWNER" },
      create: { userId: superAdmin.id, companyId: c.id, role: "OWNER" },
    });
  }

  await prisma.companyUser.upsert({
    where: { userId_companyId: { userId: devAdmin.id, companyId: company.id } },
    update: { role: "OWNER" },
    create: { userId: devAdmin.id, companyId: company.id, role: "OWNER" },
  });

  // eslint-disable-next-line no-console
  console.log("Seed concluído:", {
    adminDefinitivo: SUPER_EMAIL,
    senha: SUPER_PASSWORD + " (regra: 8+ chars, maiúscula e especial — ver CREDENCIAIS.md)",
    dev: `${DEV_EMAIL} / ${DEV_PASSWORD}`,
    empresasComOwner: companies.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
