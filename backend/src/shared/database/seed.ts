import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

async function seed(): Promise<void> {
  const company = await prisma.company.upsert({
    where: {
      id: 1,
    },
    update: {},
    create: {
      name: 'Nexus Business Manager',
      email: 'admin@nexus.com',
    },
  });

  const hashedPassword = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: {
      email: 'admin@nexus.com',
    },
    update: {},
    create: {
      companyId: company.id,
      name: 'Administrador',
      email: 'admin@nexus.com',
      passwordHash: hashedPassword,
      role: 'ADMIN',
      active: true,
    },
  });

  console.log('Admin criado com sucesso');
  console.log('Email: admin@nexus.com');
  console.log('Senha: admin123');
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });