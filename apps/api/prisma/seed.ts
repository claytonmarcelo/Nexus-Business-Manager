import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";
import { JOBS } from "../src/modules/cron/cron.handlers";

const prisma = new PrismaClient();

// Regra definitiva de acesso do projeto (ver CREDENCIAIS.md na raiz):
// este administrador global é OWNER de todas as empresas e não pode ser removido.
const SUPER_EMAIL = "nexusbussiness.admin@gmail.com";
// A senha nao vai para o repositorio: vem de SEED_ADMIN_PASSWORD no .env local
// (apps/api/.env, ignorado pelo git). Sem ela o seed para com aviso, em vez de
// criar o administrador com uma senha que ninguem anotou.
const SUPER_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "";
if (!SUPER_PASSWORD) {
  // eslint-disable-next-line no-console
  console.error("[seed] defina SEED_ADMIN_PASSWORD em apps/api/.env com a senha do administrador global (CREDENCIAIS.md).");
  process.exit(1);
}

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

  // Rotinas-padrão do passo de Operações: o seed garante que a tela existe com
  // as rotinas do código. Enabled e histórico do operador são preservados.
  for (const j of JOBS) {
    await prisma.cronJob.upsert({
      where: { slug: j.slug },
      update: { name: j.nome, description: j.descricao, schedule: j.agenda },
      create: { slug: j.slug, name: j.nome, description: j.descricao, schedule: j.agenda, enabled: true },
    });
  }

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
