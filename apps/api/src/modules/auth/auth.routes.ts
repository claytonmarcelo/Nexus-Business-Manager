import type { FastifyInstance } from "fastify";
import {
  loginSchema,
  refreshSchema,
  switchCompanySchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "./schemas";
import * as authService from "./auth.service";
import { resolveCompanyContext } from "../../lib/company-context";
import { audit } from "../../lib/audit";
import { authPayload } from "../../lib/auth";

// Fase 2 da auditoria: as rotas abertas abaixo são as ÚNICAS que nascem sem
// app.authenticate. O gate (plugins/gate.ts) exige config.public = true em
// toda rota sem autenticação, então nenhuma rota de negócio pode ser aberta
// por esquecimento — o servidor nem sobe.
export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/login", { config: { public: true, rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    const body = loginSchema.parse(req.body);
    const { tokens, user } = await authService.login(app, body.email, body.password, body.companyId, req.ip);
    return reply.send({ user, ...tokens });
  });

  // Cadastro self-service (rate-limit apertado: 5/min).
  app.post("/register", { config: { public: true, rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (req, reply) => {
    const body = registerSchema.parse(req.body);
    const { tokens, user } = await authService.register(app, body, req.ip);
    return reply.status(201).send({ user, ...tokens });
  });

  // Recuperação: sempre 200 genérico. O código só aparece na resposta quando
  // AUTH_EXPOSE_RESET_TOKEN=1 (ambiente de desenvolvimento declarado no .env);
  // em produção a entrega seria por SMTP e nada vaza daqui.
  app.post("/forgot-password", { config: { public: true, rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (req) => {
    const { email } = forgotPasswordSchema.parse(req.body);
    const result = await authService.forgotPassword(email, req.ip);
    return { ...result, ...(result.devToken ? { message: "Código gerado (modo desenvolvimento): " + result.devToken } : {}) };
  });

  app.post("/reset-password", { config: { public: true, rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (req) => {
    const body = resetPasswordSchema.parse(req.body);
    return authService.resetPassword(body.email, body.token, body.password, req.ip);
  });

  app.post("/refresh", { config: { public: true } }, async (req, reply) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokens = await authService.refresh(app, refreshToken, req.ip);
    return reply.send(tokens);
  });

  app.post("/logout", { config: { public: true } }, async (req, reply) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (parsed.success) await authService.logout(parsed.data.refreshToken, req.ip);
    return reply.status(204).send();
  });

  app.get("/me", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    return authService.getMe(ctx.userId, ctx.companyId);
  });

  // Perfil da própria conta: basta a sessão, não pede permissão de módulo.
  app.patch("/me", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    const input = updateProfileSchema.parse(req.body);
    return authService.updateProfile(ctx.userId, ctx.companyId, input, req.ip);
  });

  // Troca de senha autenticada: derruba todas as sessões e o app pede novo login.
  app.post("/change-password", {
    preHandler: [app.authenticate],
    config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
  }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    const body = changePasswordSchema.parse(req.body);
    return authService.changePassword(
      ctx.userId,
      ctx.companyId,
      body.currentPassword,
      body.newPassword,
      req.ip,
    );
  });

  // Troca de empresa ativa: valida vínculo no backend e emite novo token (ADR-0002).
  app.post("/switch-company", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { companyId } = switchCompanySchema.parse(req.body);
    const userId = authPayload(req).sub;
    const tokens = await authService.switchCompany(app, userId, companyId, req.ip);
    await audit({ userId, companyId, action: "auth.switch_company", entity: "user", entityId: userId, ip: req.ip });
    const user = await authService.getMe(userId, companyId);
    return reply.send({ user, ...tokens });
  });
}
