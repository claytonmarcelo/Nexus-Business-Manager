import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

const FIXED_ADMIN_EMAIL = 'marcelolimadez@gmail.com';

async function seed(): Promise<void> {
  const company = await prisma.company.upsert({
    where: { id: 1 },
    update: { name: 'Nexus Business Manager Demo' },
    create: {
      name: 'Nexus Business Manager Demo',
      email: 'marcelolimadez@gmail.com',
    },
  });

  const hashedPassword = await bcrypt.hash('12345678', 10);

  await prisma.user.upsert({
    where: { email: FIXED_ADMIN_EMAIL },
    update: {
      role: 'ADMIN',
      active: true,
      companyId: company.id,
      passwordHash: hashedPassword,
      name: 'Administrador',
    },
    create: {
      companyId: company.id,
      name: 'Administrador',
      email: FIXED_ADMIN_EMAIL,
      passwordHash: hashedPassword,
      role: 'ADMIN',
      active: true,
    },
  });

  console.log('Administrador fixo criado/atualizado com sucesso');
  console.log(`Email: ${FIXED_ADMIN_EMAIL}`);
  console.log('Senha: 12345678');
  console.log('Perfil: ADMIN');
  console.log(`Empresa: ${company.name}`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
