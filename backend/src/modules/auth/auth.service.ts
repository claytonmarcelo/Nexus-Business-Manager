import bcrypt from 'bcryptjs';
import { prisma } from '../../shared/database/prisma';
import { AppError } from '../../shared/errors/app-error';
import { LoginInput, RegisterInput } from './auth.schema';

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
      avatarUrl: true,
      themePreference: true,
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
    avatarUrl: user.avatarUrl,
    themePreference: user.themePreference,
  };
}

export async function registerUser(data: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new AppError('Este email ja esta cadastrado', 409);
  }

  const company = await prisma.company.create({
    data: { name: data.name, email: data.email },
  });

  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      companyId: company.id,
      name: data.name,
      email: data.email,
      passwordHash,
      role: 'ADMIN',
      active: true,
    },
    select: {
      id: true, companyId: true, name: true, email: true,
      role: true, avatarUrl: true, themePreference: true,
    },
  });

  return user;
}