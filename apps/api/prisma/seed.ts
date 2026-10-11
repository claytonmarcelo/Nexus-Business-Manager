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
// Fase 2 da auditoria: ela NÃO nasce em produção. Em NODE_ENV=production só
// aparece se alguém escrever SEED_DEV_ACCOUNT=1 de propósito; fora produção
// (dev, CI, testes) ela é criada como sempre foi.
const DEV_EMAIL = "admin@nexus.local";
const DEV_PASSWORD = "Nexus@2026";
const CRIA_DEV = process.env.NODE_ENV !== "production" || process.env.SEED_DEV_ACCOUNT === "1";

async function ensureUser(email: string, name: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.upsert({
    where: { email },
    // O update também confirma o papel de plataforma: empresas criadas antes da
    // Fase 1b ganham o vínculo na volta do administrador, e a bandeira nunca
    // fica desatualizada em quem já existe.
    update: { platformRole: "SUPER_ADMIN" },
    create: { email, name, passwordHash, platformRole: "SUPER_ADMIN" },
  });
}

async function main(): Promise<void> {
  const superAdmin = await ensureUser(SUPER_EMAIL, "Administrador Nexus", SUPER_PASSWORD);
  const devAdmin = CRIA_DEV ? await ensureUser(DEV_EMAIL, "Administrador Nexus", DEV_PASSWORD) : null;

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

  if (devAdmin) {
    await prisma.companyUser.upsert({
      where: { userId_companyId: { userId: devAdmin.id, companyId: company.id } },
      update: { role: "OWNER" },
      create: { userId: devAdmin.id, companyId: company.id, role: "OWNER" },
    });
  }

  // Rotinas-padrão do passo de Operações: o seed garante que a tela existe com
  // as rotinas do código. Enabled e histórico do operador são preservados.
  for (const j of JOBS) {
    await prisma.cronJob.upsert({
      where: { slug: j.slug },
      update: { name: j.nome, description: j.descricao, schedule: j.agenda },
      create: { slug: j.slug, name: j.nome, description: j.descricao, schedule: j.agenda, enabled: true },
    });
  }

  // Fase 2 da auditoria: o log confirma o seed sem imprimir senha nenhuma —
  // o valor nunca foi para o terminal antes com o administrador, e a conta
  // dev só aparece aqui quando foi criada de fato.
  // eslint-disable-next-line no-console
  console.log("Seed concluído:", {
    adminDefinitivo: SUPER_EMAIL,
    contaDev: devAdmin ? `${DEV_EMAIL} (senha: Nexus@2026, só para desenvolvimento)` : "não criada (produção)",
    empresasComOwner: companies.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
