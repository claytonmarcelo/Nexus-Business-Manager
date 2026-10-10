import { describe, it, expect, afterAll } from "vitest";
import { app, makeAccount, login, cleanup, uid } from "./helpers";
import { prisma } from "../src/lib/prisma";

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
      payload: { name: "Novo Empregado", email, password: "Forte@2026x" },
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
      payload: { name: "Duplicado", email, password: "Forte@2026x" },
    });
    expect(dup.statusCode).toBe(409);
  });

  it("cadastro rejeita senha fraca (sem maiúscula/especial) com mensagem da regra", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/auth/register",
      payload: { name: "Senha Fraca", email: `${uid("fraco")}@nexus.test`, password: "abcdef12" },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json() as { issues: Array<{ path: string; message: string }> };
    expect(body.issues.some((i) => i.path === "password" && /maiúscula/.test(i.message))).toBe(true);
  });

  it("esqueci a senha: sempre 200 genérico e devolve código em desenvolvimento", async () => {
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
    expect(res.json().devToken).toBeTypeOf("string");
  });

  it("redefinição troca a senha, invalida reuso e derruba sessões", async () => {
    const f = await makeAccount("STAFF");
    created.userIds.push(f.userId);
    created.companyIds.push(f.companyId);

    const antigoRefresh = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: f.email, password: f.password } });
    const refreshToken = (antigoRefresh.json() as { refreshToken: string }).refreshToken;

    const fp = await app.inject({ method: "POST", url: "/api/auth/forgot-password", payload: { email: f.email } });
    const devToken = (fp.json() as { devToken: string }).devToken;

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
