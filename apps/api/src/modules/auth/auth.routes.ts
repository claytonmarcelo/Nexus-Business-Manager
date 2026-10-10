import type { FastifyInstance } from "fastify";
import { loginSchema, refreshSchema, switchCompanySchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from "./schemas";
import * as authService from "./auth.service";
import { resolveCompanyContext } from "../../lib/company-context";
import { audit } from "../../lib/audit";
import { authPayload } from "../../lib/auth";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/login", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    const body = loginSchema.parse(req.body);
    const { tokens, user } = await authService.login(app, body.email, body.password, body.companyId, req.ip);
    return reply.send({ user, ...tokens });
  });

  // Cadastro self-service (rate-limit apertado: 5/min).
  app.post("/register", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (req, reply) => {
    const body = registerSchema.parse(req.body);
    const { tokens, user } = await authService.register(app, body, req.ip);
    return reply.status(201).send({ user, ...tokens });
  });

  // Recuperação: sempre 202 genérico; dev retorna o token para validar o fluxo sem SMTP.
  app.post("/forgot-password", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (req) => {
    const { email } = forgotPasswordSchema.parse(req.body);
    const result = await authService.forgotPassword(email, req.ip);
    return { ...result, ...(result.devToken ? { message: "Código gerado (modo desenvolvimento): " + result.devToken } : {}) };
  });

  app.post("/reset-password", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (req) => {
    const body = resetPasswordSchema.parse(req.body);
    return authService.resetPassword(body.email, body.token, body.password, req.ip);
  });

  app.post("/refresh", async (req, reply) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokens = await authService.refresh(app, refreshToken, req.ip);
    return reply.send(tokens);
  });

  app.post("/logout", async (req, reply) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (parsed.success) await authService.logout(parsed.data.refreshToken, req.ip);
    return reply.status(204).send();
  });

  app.get("/me", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    return authService.getMe(ctx.userId, ctx.companyId);
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
