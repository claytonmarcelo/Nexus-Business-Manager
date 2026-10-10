import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = "admin@nexus.local";
  const passwordHash = await bcrypt.hash("Nexus@2026", 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Administrador Nexus", passwordHash },
  });

  const company = await prisma.company.upsert({
    where: { slug: "nexus-demo" },
    update: {},
    create: { name: "Nexus Demo", slug: "nexus-demo" },
  });

  await prisma.companyUser.upsert({
    where: { userId_companyId: { userId: user.id, companyId: company.id } },
    update: { role: "OWNER" },
    create: { userId: user.id, companyId: company.id, role: "OWNER" },
  });

  // eslint-disable-next-line no-console
  console.log("Seed concluído:", { email, senha: "Nexus@2026 (troque em produção)", company: company.slug });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
