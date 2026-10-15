import { describe, it, expect, afterAll } from "vitest";
import crypto from "node:crypto";
import { app, makeAccount, login, cleanup, uid } from "./helpers";
import { prisma } from "../src/lib/prisma";
import { hashToken } from "../src/lib/tokens";

// Fluxos de cadastro e recuperação de senha (regra: 8+, maiúscula, especial).
describe("Cadastro e recuperação de senha", () => {
  const created: { userIds: string[]; companyIds: string[] } = { userIds: [], companyIds: [] };
  afterAll(async () => {
    await cleanup(created);
    await app.close();
  });

  it("cadastro cria usuário + empresa própria como OWNER e já autentica", async () => {
    const email = `${uid("novo")}@nexus.test`;
    const res = await app.inject({
      method: "POST", url: "/api/auth/register",
      payload: { name: "Novo Empregado", email, password: "Forte@2026x", aceitaTermos: true, aceitaPrivacidade: true },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    created.userIds.push(body.user.id);
    created.companyIds.push(body.user.companyId);
    expect(body.user.role).toBe("OWNER");
    expect(body.accessToken).toBeTypeOf("string");

    // login com as credenciais cadastradas funciona
    const token = await login(email, "Forte@2026x");
    expect(token).toBeTypeOf("string");

    // e-mail duplicado -> 409
    const dup = await app.inject({
      method: "POST", url: "/api/auth/register",
      payload: { name: "Duplicado", email, password: "Forte@2026x", aceitaTermos: true, aceitaPrivacidade: true },
    });
    expect(dup.statusCode).toBe(409);
  });

  it("cadastro rejeita senha fraca (sem maiúscula/especial) com mensagem da regra", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/auth/register",
      payload: { name: "Senha Fraca", email: `${uid("fraco")}@nexus.test`, password: "abcdef12", aceitaTermos: true, aceitaPrivacidade: true },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json() as { issues: Array<{ path: string; message: string }> };
    expect(body.issues.some((i) => i.path === "password" && /maiúscula/.test(i.message))).toBe(true);
  });

  // A10 da auditoria: o nome era partido com /s+/ (sem a barra invertida), que
  // só casa com a letra "s" — "Marcos Silva" viraria empresa com o nome todo.
  // Com /\s+/ a empresa fica no primeiro nome, e o slug junto.
  it('cadastro de "Marcos Silva" cria a empresa "Marcos (minha empresa)"', async () => {
    const email = `${uid("marcos")}@nexus.test`;
    const res = await app.inject({
      method: "POST", url: "/api/auth/register",
      payload: { name: "  Marcos Silva  ", email, password: "Forte@2026x", aceitaTermos: true, aceitaPrivacidade: true },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    created.userIds.push(body.user.id);
    created.companyIds.push(body.user.companyId);

    const empresa = await prisma.company.findUnique({ where: { id: body.user.companyId } });
    expect(empresa?.name).toBe("Marcos (minha empresa)");
    expect(empresa?.slug).toBe("marcos");

    const usuario = await prisma.user.findUnique({ where: { id: body.user.id } });
    expect(usuario?.name).toBe("Marcos Silva");
  });

  it("esqueci a senha: 200 genérico e o código não vaza na resposta", async () => {
    const f = await makeAccount("ADMIN");
    created.userIds.push(f.userId);
    created.companyIds.push(f.companyId);

    const inexistente = await app.inject({
      method: "POST", url: "/api/auth/forgot-password",
      payload: { email: "nao.existe@nexus.test" },
    });
    expect(inexistente.statusCode).toBe(200);
    expect(inexistente.json().ok).toBe(true);

    const res = await app.inject({
      method: "POST", url: "/api/auth/forgot-password",
      payload: { email: f.email },
    });
    expect(res.statusCode).toBe(200);
    // Fase 2 da auditoria: sem SMTP o código só sai da API quando o ambiente
    // declara AUTH_EXPOSE_RESET_TOKEN=1 (dev local). O default é fechar a
    // porta — a resposta fica o mesmo ok genérico de antes.
    const body = res.json() as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.devToken).toBeUndefined();
    expect(body.message).toBeUndefined();

    // O token de recuperação é criado no banco, escondido atrás do hash.
    const pend = await prisma.passwordResetToken.count({ where: { userId: f.userId, usedAt: null } });
    expect(pend).toBe(1);
  });

  it("pedir recuperação não derruba as sessões de quem tem o e-mail", async () => {
    const f = await makeAccount("STAFF");
    created.userIds.push(f.userId);
    created.companyIds.push(f.companyId);

    const entrada = await app.inject({
      method: "POST", url: "/api/auth/login",
      payload: { email: f.email, password: f.password },
    });
    const refreshToken = (entrada.json() as { refreshToken: string }).refreshToken;
    const antes = await prisma.refreshToken.count({ where: { userId: f.userId, revokedAt: null } });
    expect(antes).toBe(1);

    // A7: a solicitação é apenas uma solicitação. Antes dela, qualquer pessoa que
    // soubesse o e-mail deslogava a vítima toda vez que apertasse "esqueci a
    // senha" — negação de serviço sem nenhum roubo envolvido.
    const pediu = await app.inject({
      method: "POST", url: "/api/auth/forgot-password",
      payload: { email: f.email },
    });
    expect(pediu.statusCode).toBe(200);

    const depois = await prisma.refreshToken.count({ where: { userId: f.userId, revokedAt: null } });
    expect(depois).toBe(1);
    const renovado = await app.inject({
      method: "POST", url: "/api/auth/refresh",
      payload: { refreshToken },
    });
    expect(renovado.statusCode).toBe(200);

    // e a sessão continua viva depois de todas as solicitações seguintes
    for (let i = 0; i < 3; i += 1) {
      await app.inject({ method: "POST", url: "/api/auth/forgot-password", payload: { email: f.email } });
    }
    const vivas = await prisma.refreshToken.count({ where: { userId: f.userId, revokedAt: null } });
    expect(vivas).toBeGreaterThan(0);

    // a queda de sessão acontece onde ela protege de fato: na troca de senha
    const token = await prisma.passwordResetToken.findFirst({
      where: { userId: f.userId, usedAt: null },
      orderBy: { createdAt: "desc" },
    });
    expect(token).not.toBeNull();
    // o banco guarda só o hash, então o código em si vem do caminho de
    // desenvolvimento: aqui o teste escreve um token novo, exatamente como o
    // serviço faria, e usa o hash correspondente.
    const codigo = crypto.randomBytes(24).toString("hex");
    await prisma.passwordResetToken.update({
      where: { id: token!.id },
      data: { tokenHash: hashToken(codigo) },
    });
    const redefine = await app.inject({
      method: "POST", url: "/api/auth/reset-password",
      payload: { email: f.email, token: codigo, password: "Nova@2026x" },
    });
    expect(redefine.statusCode).toBe(200);
    const sobras = await prisma.refreshToken.count({ where: { userId: f.userId, revokedAt: null } });
    expect(sobras).toBe(0);
  });

  it("e-mail inexistente e e-mail existente recebem a mesma resposta", async () => {
    const f = await makeAccount("STAFF");
    created.userIds.push(f.userId);
    created.companyIds.push(f.companyId);

    const inexistente = await app.inject({
      method: "POST", url: "/api/auth/forgot-password",
      payload: { email: `${uid("some")}@nexus.test` },
    });
    const existente = await app.inject({
      method: "POST", url: "/api/auth/forgot-password",
      payload: { email: f.email },
    });
    expect(inexistente.statusCode).toBe(200);
    expect(existente.statusCode).toBe(200);
    expect(existente.json()).toEqual(inexistente.json());
    // quem não existe no sistema não ganha token de recuperação nenhum
    const orphan = await prisma.passwordResetToken.count({ where: { user: { email: `${uid("x")}@nexus.test` } } });
    expect(orphan).toBe(0);
  });

  it("redefinição troca a senha, invalida reuso e derruba sessões", async () => {
    const f = await makeAccount("STAFF");
    created.userIds.push(f.userId);
    created.companyIds.push(f.companyId);

    const antigoRefresh = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: f.email, password: f.password } });
    const refreshToken = (antigoRefresh.json() as { refreshToken: string }).refreshToken;

    // Fase 2: a resposta do forgot não devolve mais o código. O teste gera um
    // exatamente como o serviço faz (48 hex aleatórios; o banco guarda o hash),
    // provando o fluxo de redefinição sem depender da porta de desenvolvimento.
    const devToken = crypto.randomBytes(24).toString("hex");
    await prisma.passwordResetToken.create({
      data: { userId: f.userId, tokenHash: hashToken(devToken), expiresAt: new Date(Date.now() + 15 * 60_000) },
    });

    // token inválido -> 401
    const ruim = await app.inject({
      method: "POST", url: "/api/auth/reset-password",
      payload: { email: f.email, token: "x".repeat(48), password: "Nova@2026x" },
    });
    expect(ruim.statusCode).toBe(401);

    // senha nova fraca -> 400 (não consome o token)
    const fraca = await app.inject({
      method: "POST", url: "/api/auth/reset-password",
      payload: { email: f.email, token: devToken, password: "semregra" },
    });
    expect(fraca.statusCode).toBe(400);

    // redefinição válida
    const ok = await app.inject({
      method: "POST", url: "/api/auth/reset-password",
      payload: { email: f.email, token: devToken, password: "Nova@2026x" },
    });
    expect(ok.statusCode).toBe(200);

    // senha antiga não funciona mais; nova funciona
    const velho = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: f.email, password: f.password } });
    expect(velho.statusCode).toBe(401);
    const novo = await login(f.email, "Nova@2026x");
    expect(novo).toBeTypeOf("string");

    // reuso do mesmo código -> 401
    const reuso = await app.inject({
      method: "POST", url: "/api/auth/reset-password",
      payload: { email: f.email, token: devToken, password: "Outra@2026x" },
    });
    expect(reuso.statusCode).toBe(401);

    // refresh token anterior foi revogado
    const rev = await app.inject({ method: "POST", url: "/api/auth/refresh", payload: { refreshToken } });
    expect(rev.statusCode).toBe(401);

    const pend = await prisma.passwordResetToken.count({ where: { userId: f.userId, usedAt: null } });
    expect(pend).toBe(0);
  });
});
