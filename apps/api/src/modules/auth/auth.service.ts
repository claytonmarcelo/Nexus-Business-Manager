import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { verifyPassword } from "../../lib/password";
import { hashToken, msUntil } from "../../lib/tokens";
import { env } from "../../config/env";
import { conflict, forbidden, unauthorized } from "../../lib/errors";
import { audit } from "../../lib/audit";
import type { AccessTokenPayload } from "../../plugins/auth";
import { rolePermissions } from "../../lib/rbac";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  companyId: string;
  companyName: string;
  role: string;
  permissions: string[];
}

async function issueTokens(
  app: FastifyInstance,
  userId: string,
  companyId: string,
  role: string,
  ip?: string,
): Promise<AuthTokens> {
  const payload: AccessTokenPayload = { sub: userId, cid: companyId, role };
  const accessToken = await app.jwt.sign(payload);

  const refreshToken = crypto.randomBytes(48).toString("hex");
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + msUntil(env.JWT_REFRESH_TTL)),
      createdByIp: ip ?? null,
    },
  });

  return { accessToken, refreshToken, expiresIn: env.JWT_ACCESS_TTL };
}

function pickMembership(
  memberships: { companyId: string; role: string; company: { active: boolean; name: string } }[],
  requestedCompanyId?: string,
) {
  if (requestedCompanyId) {
    const found = memberships.find((m) => m.companyId === requestedCompanyId);
    if (!found) throw forbidden("Você não pertence a esta empresa");
    if (!found.company.active) throw conflict("Empresa inativa");
    return found;
  }
  const active = memberships.find((m) => m.company.active);
  if (!active) throw forbidden("Nenhuma empresa ativa vinculada ao usuário");
  return active;
}

export async function login(
  app: FastifyInstance,
  email: string,
  password: string,
  requestedCompanyId: string | undefined,
  ip?: string,
): Promise<{ tokens: AuthTokens; user: SessionUser }> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { include: { company: true } } },
  });

  // Mensagem genérica: não revelar se o e-mail existe (seção 33).
  if (!user || !user.active) {
    await audit({ userId: user?.id ?? null, action: "auth.login.failed", entity: "user", ip, metadata: { email } });
    throw unauthorized("Credenciais inválidas");
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    await audit({ userId: user.id, action: "auth.login.failed", entity: "user", ip, metadata: { email } });
    throw unauthorized("Credenciais inválidas");
  }
  if (user.memberships.length === 0) {
    throw forbidden("Usuário sem vínculo com empresa");
  }

  const membership = pickMembership(user.memberships, requestedCompanyId);
  const tokens = await issueTokens(app, user.id, membership.companyId, membership.role, ip);
  await audit({ userId: user.id, companyId: membership.companyId, action: "auth.login", entity: "user", entityId: user.id, ip });

  return { tokens, user: toSessionUser(user, membership) };
}

export async function refresh(
  app: FastifyInstance,
  refreshToken: string,
  ip?: string,
): Promise<AuthTokens> {
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    include: { user: { include: { memberships: { include: { company: true } } } } },
  });
  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    throw unauthorized("Sessão expirada");
  }
  if (!record.user.active) throw forbidden("Usuário inativo");
  const membership = pickMembership(record.user.memberships);

  // Rotação: revoga o token usado antes de emitir um novo.
  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });
  return issueTokens(app, record.userId, membership.companyId, membership.role, ip);
}

export async function logout(refreshToken: string, ip?: string): Promise<void> {
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(refreshToken) } });
  if (record && !record.revokedAt) {
    await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
    await audit({ userId: record.userId, action: "auth.logout", entity: "user", entityId: record.userId, ip });
  }
}

export async function getMe(userId: string, companyId: string): Promise<SessionUser> {
  const membership = await prisma.companyUser.findUnique({
    where: { userId_companyId: { userId, companyId } },
    include: { user: { include: { memberships: { include: { company: true } } } }, company: true },
  });
  if (!membership) throw forbidden("Acesso não autorizado a esta empresa");
  return toSessionUser(membership.user, membership);
}

export async function switchCompany(
  app: FastifyInstance,
  userId: string,
  companyId: string,
  ip?: string,
): Promise<AuthTokens> {
  const membership = await prisma.companyUser.findUnique({
    where: { userId_companyId: { userId, companyId } },
    include: { company: true },
  });
  if (!membership) throw forbidden("Você não pertence a esta empresa");
  if (!membership.company.active) throw conflict("Empresa inativa");
  return issueTokens(app, userId, companyId, membership.role, ip);
}

function toSessionUser(
  user: { id: string; email: string; name: string },
  membership: { companyId: string; role: string; company: { name: string } },
): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    companyId: membership.companyId,
    companyName: membership.company.name,
    role: membership.role,
    permissions: rolePermissions(membership.role as never),
  };
}
