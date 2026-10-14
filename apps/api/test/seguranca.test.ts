import { describe, it, expect, afterAll } from "vitest";
import crypto from "node:crypto";
import Fastify from "fastify";
import { app, makeAccount, login, cleanup } from "./helpers";
import { prisma } from "../src/lib/prisma";
import { hashToken } from "../src/lib/tokens";
import { registerAuthGate } from "../src/plugins/gate";
import { authenticate } from "../src/plugins/auth";

// Fase 2 da auditoria — as três travas novas de produção:
//  1. gate estrutural: nenhuma rota de negócio nasce aberta; o servidor nem
//     sobe se alguém registrar uma rota sem app.authenticate e sem o carimbo
//     config.public;
//  2. reuso de refresh token: reapresentar um token já rotacionado derruba
//     todas as sessões da pessoa (assinatura clássica de roubo), enquanto a
//     revogação manual (logout) NÃO cai na reação em cadeia;
//  3. recuperação de senha: o administrador da plataforma é imune — nem token
//     de reset, nem queda de sessão — e um token forjado no banco também não
//     redefine a senha dele.
describe("Segurança de produção (Fase 2)", () => {
  const created: { userIds: string[]; companyIds: string[] } = { userIds: [], companyIds: [] };
  afterAll(async () => {
    await cleanup(created);
  });

  const sessoesVivas = (userId: string) =>
    prisma.refreshToken.count({ where: { userId, revokedAt: null } });

  // Janela de corrida de abas (T3.5): dez segundos. Repetida aqui de propósito —
  // este arquivo prova o ROUBO, e o roubo é o que acontece depois dela.
  const JANELA_DE_CORRIDA_MS = 10_000;

  /** Volta no tempo o consumo de um token rotacionado, sem dormir na suíte. */
  async function atrasarRotacao(refreshToken: string): Promise<void> {
    const registro = await prisma.refreshToken.findUniqueOrThrow({ where: { tokenHash: hashToken(refreshToken) } });
    if (!registro.usedAt) throw new Error("esperava token já rotacionado");
    await prisma.refreshToken.update({
      where: { id: registro.id },
      data: { usedAt: new Date(registro.usedAt.getTime() - (JANELA_DE_CORRIDA_MS + 5_000)) },
    });
  }

  // ---- 1. Gate estrutural ----

  it("o gate recusa o registro de uma rota sem autenticação", async () => {
    const solo = Fastify();
    solo.decorate("authenticate", authenticate);
    registerAuthGate(solo);
    // O gate é um gancho onRoute: ele grita na linha do registro, antes de
    // qualquer requisição existir — o programador não chega a subir o servidor
    // com a rota esquecida.
    expect(() => solo.get("/api/escapada", async () => ({ ok: true }))).toThrow(/\[gate\]/);
    // o grito acontece dentro do registro: a rota rejeitada não chegou ao mapa
    // de rotas — nada aberto ficou para trás nesta instância.
    await solo.ready();
    const escapada = await solo.inject({ method: "GET", url: "/api/escapada" });
    expect(escapada.statusCode).toBe(404);
    await solo.close();
  });

  it("o gate aceita a rota pública declarada e a rota autenticada", async () => {
    const solo = Fastify();
    solo.decorate("authenticate", authenticate);
    registerAuthGate(solo);
    solo.get("/api/aberta", { config: { public: true } }, async () => ({ ok: true }));
    solo.get("/api/protegida", { preHandler: [solo.authenticate] }, async () => ({ ok: true }));
    await solo.ready();
    const aberta = await solo.inject({ method: "GET", url: "/api/aberta" });
    expect(aberta.statusCode).toBe(200);
    // A protegida tem o authenticate nomeado no preHandler; sem token ele
    // responderia 401 — aqui basta o boot ter passado pelo gate.
    await solo.close();
  });

  it("a aplicação real passa no gate em todas as rotas", async () => {
    // Se qualquer rota de negócio tivesse nascido aberta, o import do helpers
    // já teria derrubado este arquivo inteiro. Aqui a prova é a superfície
    // pública funcionando: health e landing abertas, /me fechada.
    await app.ready();
    expect((await app.inject({ method: "GET", url: "/api/health" })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/api/public/landing" })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/api/auth/me" })).statusCode).toBe(401);
  });

  // ---- 2. Reuso de refresh token ----

  it("reapresentar um refresh rotacionado derruba todas as sessões e fica na auditoria", async () => {
    const f = await makeAccount("STAFF");
    created.userIds.push(f.userId);
    created.companyIds.push(f.companyId);

    const primeiro = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: f.email, password: f.password } });
    const antigo = (primeiro.json() as { refreshToken: string }).refreshToken;

    const rot = await app.inject({ method: "POST", url: "/api/auth/refresh", payload: { refreshToken: antigo } });
    expect(rot.statusCode).toBe(200);
    const novo = (rot.json() as { refreshToken: string }).refreshToken;
    expect(await sessoesVivas(f.userId)).toBe(1); // só a sessão nova está viva

    // O token velho reaparece — o dono legítimo nunca reapresenta o que já
    // trocou. A família inteira cai.
    //
    // T3.5 (F4) abriu uma janela de dez segundos para a segunda aba do mesmo
    // navegador, e `corrida-de-abas.test.ts` prova o que acontece dentro dela. Este
    // caso é o roubo, que por definição chega depois: aqui o consumo do token volta
    // no tempo, para que a reapresentação caia fora da janela sem que a suíte durma
    // dez segundos. A asserção não muda — 401, família no chão e trilha de reuso.
    await atrasarRotacao(antigo);
    const reuso = await app.inject({ method: "POST", url: "/api/auth/refresh", payload: { refreshToken: antigo } });
    expect(reuso.statusCode).toBe(401);
    expect(await sessoesVivas(f.userId)).toBe(0);

    // Nem o token legítimo recém-emitido escapa: a pessoa prova a senha de novo.
    const depois = await app.inject({ method: "POST", url: "/api/auth/refresh", payload: { refreshToken: novo } });
    expect(depois.statusCode).toBe(401);

    const trilha = await prisma.auditLog.count({ where: { userId: f.userId, action: "auth.refresh_reuse" } });
    expect(trilha).toBe(1);
  });

  it("logout normal revoga só a sessão que saiu — sem queda da família", async () => {
    const f = await makeAccount("STAFF");
    created.userIds.push(f.userId);
    created.companyIds.push(f.companyId);

    const a = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: f.email, password: f.password } });
    const b = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: f.email, password: f.password } });
    const tokenA = (a.json() as { refreshToken: string }).refreshToken;
    const tokenB = (b.json() as { refreshToken: string }).refreshToken;

    const saiu = await app.inject({ method: "POST", url: "/api/auth/logout", payload: { refreshToken: tokenA } });
    expect(saiu.statusCode).toBe(204);

    // Reapresentar o token do logout é 401 simples: revogação por decisão não
    // tem usedAt, então não confunde com roubo e não derruba a outra aba.
    const replay = await app.inject({ method: "POST", url: "/api/auth/refresh", payload: { refreshToken: tokenA } });
    expect(replay.statusCode).toBe(401);
    expect(await sessoesVivas(f.userId)).toBe(1);

    // A segunda sessão continua viva e gira normalmente.
    const gira = await app.inject({ method: "POST", url: "/api/auth/refresh", payload: { refreshToken: tokenB } });
    expect(gira.statusCode).toBe(200);
  });

  // ---- 3. Administrador da plataforma imune à recuperação ----

  it("forgot-password não cria token nem derruba sessão do admin da plataforma", async () => {
    const f = await makeAccount("OWNER", { plataforma: true });
    created.userIds.push(f.userId);
    created.companyIds.push(f.companyId);

    await login(f.email, f.password); // uma sessão viva, que não pode ser tocada
    expect(await sessoesVivas(f.userId)).toBe(1);

    const res = await app.inject({ method: "POST", url: "/api/auth/forgot-password", payload: { email: f.email } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true }); // o mesmo genérico de qualquer e-mail

    expect(await prisma.passwordResetToken.count({ where: { userId: f.userId } })).toBe(0);
    expect(await sessoesVivas(f.userId)).toBe(1);
    const trilha = await prisma.auditLog.count({ where: { userId: f.userId, action: "auth.forgot_password_bloqueado" } });
    expect(trilha).toBe(1);
  });

  it("um token de reset forjado no banco não redefine a senha do admin da plataforma", async () => {
    const f = await makeAccount("OWNER", { plataforma: true });
    created.userIds.push(f.userId);
    created.companyIds.push(f.companyId);

    // O cinto-extra é testado na porta de serviço: um código que só existiria
    // por um bug (ou token antigo de quando a conta ainda não era plataforma)
    // continua sem poder redefinir a senha.
    const forjado = crypto.randomBytes(24).toString("hex");
    const registro = await prisma.passwordResetToken.create({
      data: { userId: f.userId, tokenHash: hashToken(forjado), expiresAt: new Date(Date.now() + 15 * 60_000) },
    });

    const tenta = await app.inject({
      method: "POST", url: "/api/auth/reset-password",
      payload: { email: f.email, token: forjado, password: "Trocada@2026" },
    });
    expect(tenta.statusCode).toBe(401);

    // A senha original continua valendo e o token forjado não foi consumido em vão.
    const token = await login(f.email, f.password);
    expect(token).toBeTypeOf("string");
    await prisma.passwordResetToken.delete({ where: { id: registro.id } });
  });

  // ---- 4. devToken fechado por default ----
  it("sem AUTH_EXPOSE_RESET_TOKEN a resposta de recuperação não carrega código", async () => {
    const f = await makeAccount("ADMIN");
    created.userIds.push(f.userId);
    created.companyIds.push(f.companyId);
    const res = await app.inject({ method: "POST", url: "/api/auth/forgot-password", payload: { email: f.email } });
    const body = res.json() as Record<string, unknown>;
    // Se este teste quebrar, foi porque o ambiente da suíte ligou a porta de
    // desenvolvimento (AUTH_EXPOSE_RESET_TOKEN=1) — o que é proibido no .env
    // compartilhado dos testes; ligue apenas no .env local de quem precisa.
    expect(body.devToken).toBeUndefined();
    expect(body.message).toBeUndefined();
  });
});
