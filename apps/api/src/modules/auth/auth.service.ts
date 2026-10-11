import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { hashPassword, verifyPassword } from "../../lib/password";
import { hashToken, msUntil } from "../../lib/tokens";
import { env, isProd } from "../../config/env";
import { badRequest, conflict, forbidden, notFound, unauthorized } from "../../lib/errors";
import { audit } from "../../lib/audit";
import type { AccessTokenPayload } from "../../plugins/auth";
import { rolePermissions } from "../../lib/rbac";
import { somenteDigitos } from "../../lib/brFields";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  companyId: string;
  companyName: string;
  role: string;
  permissions: string[];
  // Moeda, fuso e idioma da empresa ativa: as telas formatam com eles.
  currency: string;
  timezone: string;
  language: string;
  // Administrador da plataforma (Fase 1b): true quando platformRole = SUPER_ADMIN.
  platform: boolean;
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
  memberships: {
    companyId: string;
    role: string;
    // A empresa inteira vem no include: a sessão carrega moeda, fuso e idioma.
    company: { active: boolean; name: string; currency: string; timezone: string; language: string };
  }[],
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
  if (!record || record.expiresAt < new Date()) {
    throw unauthorized("Sessão expirada");
  }
  // Fase 2 da auditoria: um refresh token rotacionado que volta a aparecer é
  // a assinatura clássica de roubo — o dono legítimo nunca reapresenta o código
  // que já trocou. Aqui a família inteira cai (todas as sessões vivas desta
  // pessoa) e o evento fica na auditoria. Revogação por decisão — logout,
  // encerrar sessão, troca de senha, recuperação — marca só revokedAt, sem
  // usedAt, e por isso não dispara a reação em cadeia.
  if (record.usedAt && record.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await audit({
      userId: record.userId,
      action: "auth.refresh_reuse",
      entity: "user",
      entityId: record.userId,
      ip,
      metadata: { sessoesRevogadas: "todas", motivo: "token rotacionado reapresentado" },
    });
    throw unauthorized("Sessão expirada");
  }
  if (record.revokedAt) throw unauthorized("Sessão expirada");
  if (!record.user.active) throw forbidden("Usuário inativo");
  const membership = pickMembership(record.user.memberships);

  // Rotação: revoga o token usado antes de emitir um novo — usado E revogado,
  // para que a reapresentação dele seja reconhecível como reuso.
  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date(), usedAt: new Date() },
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
  user: {
    id: string; email: string; name: string; phone: string | null;
    platformRole?: string | null;
  },
  membership: {
    companyId: string;
    role: string;
    company: { name: string; currency: string; timezone: string; language: string };
  },
): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    companyId: membership.companyId,
    companyName: membership.company.name,
    role: membership.role,
    permissions: rolePermissions(membership.role as never),
    currency: membership.company.currency,
    timezone: membership.company.timezone,
    language: membership.company.language,
    // O papel de plataforma nunca sai do banco: a sessão apenas informa o que
    // já foi conferido por assertPlatformAdmin em cada requisição reservada.
    platform: user.platformRole === "SUPER_ADMIN",
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
  const firstName = input.name.trim().split(/\s+/)[0] ?? "Empresa";
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
    // Fase 1b: o administrador da plataforma entra em toda empresa nova como
    // OWNER (regra definitiva de acesso), agora identificado pelo platformRole
    // no banco — não mais pelo e-mail fixo no código.
    const admins = await tx.user.findMany({
      where: { platformRole: "SUPER_ADMIN", active: true },
      select: { id: true },
    });
    for (const admin of admins) {
      if (admin.id === novo.id) continue;
      await tx.companyUser.upsert({
        where: { userId_companyId: { userId: admin.id, companyId: empresa.id } },
        update: { role: "OWNER" },
        create: { userId: admin.id, companyId: empresa.id, role: "OWNER" },
      });
    }
    return { user: novo, membership: vinculo };
  });

  const tokens = await issueTokens(app, user.id, membership.companyId, membership.role, ip);
  await audit({ userId: user.id, companyId: membership.companyId, action: "auth.register", entity: "user", entityId: user.id, ip });
  return {
    tokens,
    user: toSessionUser(user, membership),
  };
}

// Solicitação de recuperação: SEMPRE responde ok genérico (não revela se o
// e-mail existe). O código só volta no HTTP quando o .env local pede
// explicitamente (AUTH_EXPOSE_RESET_TOKEN=1) E o ambiente não é produção. O flag
// sozinho já bastava para o dev, mas a fase A7 quis o par: NODE_ENV=production
// não entrega reset de ninguém, mesmo com o flag aceso por engano num deploy.
export async function forgotPassword(email: string, ip?: string): Promise<{ ok: true; devToken?: string }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    await audit({ userId: user?.id ?? null, action: "auth.forgot_password", entity: "user", ip, metadata: { email } });
    return { ok: true };
  }
  // Regra definitiva (Fase 2): a recuperação não toca o administrador da
  // plataforma. Nem token, nem revogação de sessões — a resposta continua o
  // mesmo ok genérico. A senha dessa conta se troca de dentro (troca de senha
  // autenticada) ou pelo seed local; um link de recuperação jamais pode ser
  // porta para assumir a conta que protege a plataforma inteira.
  if (user.platformRole === "SUPER_ADMIN") {
    await audit({
      userId: user.id,
      action: "auth.forgot_password_bloqueado",
      entity: "user",
      entityId: user.id,
      ip,
      metadata: { motivo: "administrador da plataforma não passa pela recuperação" },
    });
    return { ok: true };
  }
  const token = crypto.randomBytes(24).toString("hex");
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
  });
  // A7 do prompt de mercado: pedir recuperação NÃO derruba mais as sessões da
  // pessoa. Antes, qualquer um que soubesse o e-mail deslogava a vítima todas as
  // vezes que apertasse "esqueci a senha" — uma porta de negação de serviço
  // escancarada, sem nenhum roubo envolvido. A queda de sessões acontece no
  // momento em que a senha realmente muda (`resetPassword`), que é onde ela
  // protege alguém de verdade.
  await audit({ userId: user.id, action: "auth.forgot_password", entity: "user", entityId: user.id, ip });
  // A7 do prompt de mercado: além do flag explícito do .env, o código de
  // recuperação nunca sai pelo HTTP quando o ambiente é produção. O zod de
  // `env.ts` já recusa a subida com AUTH_EXPOSE_RESET_TOKEN=1 em produção (A9);
  // esta é a segunda trava, para o caminho nunca depender só da configuração.
  return env.AUTH_EXPOSE_RESET_TOKEN === "1" && !isProd ? { ok: true, devToken: token } : { ok: true };
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
  // Cinto extra do gate da recuperação: um token perdido de código antigo
  // também não redefine senha de administrador de plataforma.
  if (record.user.platformRole === "SUPER_ADMIN") {
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

// ---- Conta: perfil e troca de senha ----

// Nome e telefone da própria conta. Compara antes de gravar: sem diferença real,
// não escreve no banco nem polui a auditoria.
export async function updateProfile(
  userId: string,
  companyId: string,
  input: { name?: string; phone?: string | null },
  ip?: string,
): Promise<{ user: SessionUser; alterados: string[] }> {
  const atual = await prisma.user.findUnique({ where: { id: userId } });
  if (!atual) throw notFound("Usuário não encontrado");

  const dados: { name?: string; phone?: string | null } = {};
  if (input.name !== undefined) dados.name = input.name.trim();
  if (input.phone !== undefined) {
    const digitos = somenteDigitos(input.phone ?? "");
    dados.phone = digitos === "" ? null : digitos;
  }

  const alterados: string[] = [];
  const antes: Record<string, string | null> = {};
  const depois: Record<string, string | null> = {};
  for (const campo of ["name", "phone"] as const) {
    const novo = dados[campo];
    if (novo === undefined) continue;
    const anterior = atual[campo] ?? null;
    if (anterior === novo) continue;
    alterados.push(campo);
    antes[campo] = anterior;
    depois[campo] = novo;
  }
  if (alterados.length === 0) {
    return { user: await getMe(userId, companyId), alterados };
  }

  await prisma.user.update({ where: { id: userId }, data: dados });
  await audit({
    userId,
    companyId,
    action: "auth.profile_updated",
    entity: "user",
    entityId: userId,
    ip,
    metadata: { campos: alterados, antes, depois },
  });
  return { user: await getMe(userId, companyId), alterados };
}

// Trocar a senha pela própria conta: confere a atual, adota a nova e derruba todas as
// sessões ativas. Responder 400 (e não 401) evita que o app saia tentando renovar um
// token que ainda é válido.
export async function changePassword(
  userId: string,
  companyId: string,
  currentPassword: string,
  newPassword: string,
  ip?: string,
): Promise<{ ok: true; sessionsRevoked: number }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) throw notFound("Usuário não encontrado");

  const confere = await verifyPassword(currentPassword, user.passwordHash);
  if (!confere) {
    await audit({
      userId,
      companyId,
      action: "auth.password_change.failed",
      entity: "user",
      entityId: userId,
      ip,
    });
    throw badRequest("A senha atual não confere");
  }
  if (await verifyPassword(newPassword, user.passwordHash)) {
    throw conflict("A nova senha é igual à atual");
  }

  const passwordHash = await hashPassword(newPassword);
  const sessionsRevoked = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { passwordHash } });
    const derrubadas = await tx.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return derrubadas.count;
  });

  await audit({
    userId,
    companyId,
    action: "auth.password_changed",
    entity: "user",
    entityId: userId,
    ip,
    metadata: { sessionsRevoked },
  });
  return { ok: true, sessionsRevoked };
}
