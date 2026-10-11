import { prisma } from "../../lib/prisma";
import { conflict, forbidden, notFound } from "../../lib/errors";
import { hashPassword } from "../../lib/password";
import { audit } from "../../lib/audit";
import { paginate, skipTake, type PaginationInput } from "../../lib/pagination";
import type { AddMemberInput } from "./users.schemas";
import type { Role } from "@prisma/client";
import { SUPER_ADMIN_EMAIL } from "../../lib/passwordPolicy";
import { podeAtribuirPapel, type DecisaoPapel } from "../../lib/rbac";

// Traduz o veredito da regra central (`podeAtribuirPapel`) para o erro HTTP
// correspondente: 409 quando o que está em jogo é a empresa ficar sem dono,
// 403 quando é hierarquia. Nenhuma rota de papel decide sozinha.
function erroDePapel(decisao: Extract<DecisaoPapel, { ok: false }>) {
  return decisao.status === 409 ? conflict(decisao.mensagem) : forbidden(decisao.mensagem);
}

// Listagem SEMPRE filtrada por companyId (isolamento multiempresa, seção 35).
export async function listMembers(companyId: string, p: PaginationInput, search?: string) {
  const where = {
    company: { id: companyId },
    ...(search
      ? {
          OR: [
            { user: { name: { contains: search } } },
            { user: { email: { contains: search } } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.companyUser.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, active: true } } },
      orderBy: { createdAt: "asc" },
      ...skipTake(p),
    }),
    prisma.companyUser.count({ where }),
  ]);
  const data = rows.map((m) => ({ ...m.user, role: m.role, membershipId: m.id }));
  return paginate(data, total, p);
}

export async function addMember(
  companyId: string,
  input: AddMemberInput,
  actorId: string,
  ip: string | undefined,
  actorRole: Role,
) {
  // A1 do prompt de mercado: o convite passa pela mesma função que a troca de
  // papel. Antes havia só "OWNER não nasce de ADMIN", e o ADMIN continuava
  // podendo criar outro ADMIN, se promover e montar a própria equipe.
  const convite = podeAtribuirPapel({ ator: actorRole, novoPapel: input.role });
  if (!convite.ok) throw erroDePapel(convite);
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw notFound("Empresa não encontrada");

  const passwordHash = await hashPassword(input.password);
  return prisma.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { email: input.email } });
    if (user) {
      const already = await tx.companyUser.findUnique({
        where: { userId_companyId: { userId: user.id, companyId } },
      });
      if (already) throw conflict("Usuário já é membro desta empresa");
    } else {
      user = await tx.user.create({
        data: { email: input.email, name: input.name, passwordHash },
      });
    }
    const membership = await tx.companyUser.create({
      data: { userId: user.id, companyId, role: input.role },
    });
    await audit({ userId: actorId, companyId, action: "user.add", entity: "user", entityId: user.id, ip: ip ?? null, metadata: { role: input.role } });
    return { id: user.id, name: user.name, email: user.email, role: membership.role };
  });
}

export async function updateRole(
  companyId: string,
  userId: string,
  role: Role,
  actorId: string,
  ip: string | undefined,
  actorRole: Role,
) {
  const membership = await prisma.companyUser.findUnique({
    where: { userId_companyId: { userId, companyId } },
    include: { user: { select: { email: true, platformRole: true } } },
  });
  if (!membership) throw notFound("Membro não encontrado nesta empresa");

  // A1: o veredito vem todo da regra central. O serviço só entrega os fatos que
  // o banco conhece — o papel atual do alvo, se é a própria pessoa e quantos
  // proprietários continuariam na empresa depois do movimento. Contar só quando
  // o alvo é OWNER e está saindo do papel: é a única forma de a empresa ficar
  // sem dono, e é por isso que essa recusa vem em 409.
  const saindoDeOwner = membership.role === "OWNER" && role !== "OWNER";
  const donosRestantes = saindoDeOwner
    ? await prisma.companyUser.count({
        where: { companyId, role: "OWNER", userId: { not: userId } },
      })
    : undefined;

  const decisao = podeAtribuirPapel({
    ator: actorRole,
    alvoAtual: membership.role,
    novoPapel: role,
    alvoEhOProprioAtor: userId === actorId,
    donosRestantes,
  });
  if (!decisao.ok) throw erroDePapel(decisao);

  // Regra definitiva: o administrador do sistema jamais perde o papel de OWNER.
  // Fase 1b: o cadeado segue a bandeira de plataforma (platformRole) e mantém o
  // e-mail histórico como cinto extra — enquanto for SUPER_ADMIN no banco, é
  // intocável em qualquer empresa, não só na conta antiga do seed.
  const ehAdminPlataforma =
    membership.user.platformRole === "SUPER_ADMIN" ||
    membership.user.email.toLowerCase() === SUPER_ADMIN_EMAIL;
  if (ehAdminPlataforma && role !== "OWNER") {
    throw conflict("O administrador definitivo do sistema não pode ser rebaixado de OWNER");
  }
  const updated = await prisma.companyUser.update({
    where: { id: membership.id, companyId },
    data: { role },
  });
  await audit({ userId: actorId, companyId, action: "user.update_role", entity: "user", entityId: userId, ip: ip ?? null, metadata: { role } });
  return { id: userId, role: updated.role };
}

// ---- Sessoes ativas (aba Sessoes da tela de Usuarios) ----
// O refresh token e rotacionado e revogado no servidor, entao a unica lista
// honesta de "onde estou logado" e o que ainda nao foi revogado nem expirou.
export async function listSessions(companyId: string) {
  const rows = await prisma.refreshToken.findMany({
    where: {
      revokedAt: null,
      expiresAt: { gt: new Date() },
      user: { memberships: { some: { companyId } } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          memberships: { where: { companyId }, select: { role: true } },
        },
      },
    },
  });
  return {
    data: rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      usuario: r.user.name,
      email: r.user.email,
      papel: r.user.memberships[0]?.role ?? "STAFF",
      origem: r.createdByIp,
      criadaEm: r.createdAt,
      expiraEm: r.expiresAt,
    })),
    meta: { total: rows.length },
  };
}

// Encerra uma sessao: revoga o refresh token daquele dispositivo. O proximo
// request daquela aba falha no refresh e derruba para o login.
// Fase 1 da auditoria: sessao pertence à pessoa, não à empresa — o refresh
// token não tem companyId, e um ADMIN de A com um usuário em comum podia
// derrubar a sessão de B. Agora cada pessoa encerra as próprias sessões pela
// rota de tenant; para restringir outra pessoa, o caminho é o papel.
export async function revokeSession(
  companyId: string,
  sessionId: string,
  actorId: string,
  ip: string | undefined,
) {
  const registro = await prisma.refreshToken.findFirst({ where: { id: sessionId } });
  if (!registro) throw notFound("Sessão não encontrada");
  if (registro.userId !== actorId) {
    throw forbidden("Você encerra apenas as suas sessões; para restringir outra pessoa, altere o papel dela");
  }
  if (registro.revokedAt) return { ok: true, ja: true };
  await prisma.refreshToken.update({ where: { id: sessionId, userId: actorId }, data: { revokedAt: new Date() } });
  await audit({
    userId: actorId,
    companyId,
    action: "user.revoke_session",
    entity: "user",
    entityId: registro.userId,
    ip,
    metadata: { sessionId },
  });
  return { ok: true };
}
