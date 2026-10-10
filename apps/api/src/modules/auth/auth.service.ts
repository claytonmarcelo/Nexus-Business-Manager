import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { hashPassword, verifyPassword } from "../../lib/password";
import { hashToken, msUntil } from "../../lib/tokens";
import { env, isProd } from "../../config/env";
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

// ---- Fluxos de cadastro e recuperação de senha ----

const RESET_TTL_MS = 30 * 60 * 1000; // código válido por 30 minutos

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "empresa";
}

// Cadastro self-service: cria usuário + empresa própria e já emite sessão.
export async function register(
  app: FastifyInstance,
  input: { name: string; email: string; password: string },
  ip?: string,
): Promise<{ tokens: AuthTokens; user: SessionUser }> {
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw conflict("Este e-mail já está cadastrado");

  const passwordHash = await hashPassword(input.password);
  const firstName = input.name.trim().split(/s+/)[0] ?? "Empresa";
  const baseSlug = slugify(firstName);

  const { user, membership } = await prisma.$transaction(async (tx) => {
    const novo = await tx.user.create({
      data: { email: input.email, name: input.name.trim(), passwordHash },
    });
    let slug = baseSlug;
    for (let i = 2; await tx.company.findUnique({ where: { slug } }); i++) {
      slug = baseSlug + "-" + i;
    }
    const empresa = await tx.company.create({
      data: { name: firstName + " (minha empresa)", slug },
    });
    const vinculo = await tx.companyUser.create({
      data: { userId: novo.id, companyId: empresa.id, role: "OWNER" },
      include: { company: true },
    });
    return { user: novo, membership: vinculo };
  });

  const tokens = await issueTokens(app, user.id, membership.companyId, membership.role, ip);
  await audit({ userId: user.id, companyId: membership.companyId, action: "auth.register", entity: "user", entityId: user.id, ip });
  return {
    tokens,
    user: toSessionUser({ id: user.id, email: user.email, name: user.name }, membership),
  };
}

// Solicitação de recuperação: SEMPRE responde ok (não revela se o e-mail existe).
// Em desenvolvimento (sem SMTP configurado) o token é devolvido para validar o fluxo.
export async function forgotPassword(email: string, ip?: string): Promise<{ ok: true; devToken?: string }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    await audit({ userId: user?.id ?? null, action: "auth.forgot_password", entity: "user", ip, metadata: { email } });
    return { ok: true };
  }
  const token = crypto.randomBytes(24).toString("hex");
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
  });
  await prisma.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  await audit({ userId: user.id, action: "auth.forgot_password", entity: "user", entityId: user.id, ip });
  return isProd ? { ok: true } : { ok: true, devToken: token };
}

// Redefinição com token: valida, troca a senha e derruba todas as sessões.
export async function resetPassword(
  email: string,
  token: string,
  password: string,
  ip?: string,
): Promise<{ ok: true }> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!record || record.usedAt || record.expiresAt < new Date() || record.user.email !== email) {
    throw unauthorized("Código de recuperação inválido ou expirado");
  }
  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.passwordResetToken.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.refreshToken.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  await audit({ userId: record.userId, action: "auth.reset_password", entity: "user", entityId: record.userId, ip });
  return { ok: true };
}
