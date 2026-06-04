import bcrypt from 'bcryptjs';
import { prisma } from '../../shared/database/prisma';
import { AppError } from '../../shared/errors/app-error';
import { LoginInput } from './auth.schema';

export async function authenticateUser(data: LoginInput) {
  const user = await prisma.user.findFirst({
    where: {
      email: data.email,
      active: true,
    },
    select: {
      id: true,
      companyId: true,
      name: true,
      email: true,
      passwordHash: true,
      role: true,
    },
  });

  if (!user) {
    throw new AppError('Email ou senha incorretos', 401);
  }

  const passwordMatch = await bcrypt.compare(data.password, user.passwordHash);

  if (!passwordMatch) {
    throw new AppError('Email ou senha incorretos', 401);
  }

  return {
    id: user.id,
    companyId: user.companyId,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}