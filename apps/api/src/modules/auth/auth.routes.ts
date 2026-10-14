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
  verifyEmailSchema,
  resendVerificationSchema,
  segundoFatorDesafioSchema,
  segundoFatorAtivarSchema,
  segundoFatorDesativarSchema,
} from "./schemas";
import * as authService from "./auth.service";
import { confirmarEmail, reenviarVerificacao } from "./verificacao.service";
import {
  ativarSegundoFator,
  configurarSegundoFator,
  desativarSegundoFator,
  entrarComSegundoFator,
  statusSegundoFator,
} from "./segundo-fator.service";
import { resolveCompanyContext } from "../../lib/company-context";
import { audit } from "../../lib/audit";
import { authPayload } from "../../lib/auth";
import type { EscopoPayload } from "../../plugins/auth";
import { unauthorized } from "../../lib/errors";

// F4 (D3): o decorador de etapa aceita os dois tokens de escopo, porque as duas
// etapas assinam com o mesmo segredo e o mesmo tempo curto. Cada rota diz qual
// dos dois ela admite — e a recusa acontece aqui, na borda, antes de qualquer
// leitura de banco.
function exigeEscopo(payload: EscopoPayload, aceito: "2fa-configuracao" | "2fa-desafio"): void {
  if (payload.escopo !== aceito) {
    throw unauthorized("Este token não vale para esta etapa. Faça login novamente.");
  }
}

// Fase 2 da auditoria: as rotas abertas abaixo são as ÚNICAS que nascem sem
// app.authenticate. O gate (plugins/gate.ts) exige config.public = true em
// toda rota sem autenticação, então nenhuma rota de negócio pode ser aberta
// por esquecimento — o servidor nem sobe.
export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/login", { config: { public: true, rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    const body = loginSchema.parse(req.body);
    const resultado = await authService.login(app, body.email, body.password, body.companyId, req.ip);
    // F4: a senha certa deixou de ser o único desfecho de um login. Os dois estados
    // de etapa respondem 200 SEM sessão nenhuma — o que volta é um token curto e
    // com escopo, que não abre rota de negócio (ver `authenticate` em
    // plugins/auth.ts) e só serve para a rota da própria etapa.
    if ("twoFactorRequired" in resultado) {
      return reply.send({ twoFactorRequired: true, challengeToken: resultado.challengeToken });
    }
    if ("twoFactorSetupRequired" in resultado) {
      return reply.send({
        twoFactorSetupRequired: true,
        setupToken: resultado.setupToken,
        // "é obrigatório" e "ligue quando quiser" são mensagens diferentes na tela,
        // e o front_end não tem como saber disso sem este aviso.
        mensagem: "O segundo fator é obrigatório para o seu papel. Ligue-o para entrar.",
      });
    }
    return reply.send({ user: resultado.user, ...resultado.tokens });
  });

  // Cadastro self-service (rate-limit apertado: 5/min).
  app.post("/register", { config: { public: true, rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (req, reply) => {
    const body = registerSchema.parse(req.body);
    const resultado = await authService.register(app, body, req.ip);
    // D2: com a verificação ligada, o cadastro não entrega sessão — entrega a
    // mensagem para a caixa postal e a tela de "confirme seu e-mail".
    if ("verificationRequired" in resultado) {
      return reply.status(201).send({ verificationRequired: true });
    }
    return reply.status(201).send({ user: resultado.user, ...resultado.tokens });
  });

  // Confirmação de e-mail: rota pública, porque quem clica no link ainda não tem
  // sessão nenhuma. O token é a credencial, e a resposta de um token velho não diz
  // se ele era de uma conta que existe — só que não vale mais.
  app.post("/verify-email", { config: { public: true, rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req) => {
    const { token } = verifyEmailSchema.parse(req.body);
    return confirmarEmail(token, req.ip);
  });

  // Reenvio: sempre 200 genérico, nunca denuncia endereço cadastrado ou não.
  app.post("/resend-verification", { config: { public: true, rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (req) => {
    const { email } = resendVerificationSchema.parse(req.body);
    return reenviarVerificacao(email, req.ip);
  });

  // Segunda etapa do login (D3): pública de propósito — quem chega aqui ainda não
  // tem sessão, e o que apresenta é o token de desafio que o login devolveu. Cinco
  // pedidos por minuto por endereço é o que fecha a conta de tentativas sobre um
  // código de seis dígitos dentro dos cinco minutos de vida do desafio.
  app.post("/2fa/challenge", { config: { public: true, rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (req, reply) => {
    const body = segundoFatorDesafioSchema.parse(req.body);
    const resultado = await entrarComSegundoFator(app, body.challengeToken, body.codigo, req.ip);
    return reply.send({ user: resultado.user, ...resultado.tokens });
  });

  // ---- Ligação do segundo fator no caminho do login obrigatório: só atravessa o
  // token de configuração, e cada rota abaixo confere o escopo antes de ler banco ----

  app.post("/2fa/setup", {
    preHandler: [app.authenticateSegundoFator],
    config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
  }, async (req) => {
    const payload = req.user as unknown as EscopoPayload;
    exigeEscopo(payload, "2fa-configuracao");
    return configurarSegundoFator(payload.sub);
  });

  app.post("/2fa/activate", {
    preHandler: [app.authenticateSegundoFator],
    config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
  }, async (req, reply) => {
    const payload = req.user as unknown as EscopoPayload;
    exigeEscopo(payload, "2fa-configuracao");
    const body = segundoFatorAtivarSchema.parse(req.body);
    const resultado = await ativarSegundoFator({
      app,
      userId: payload.sub,
      codigo: body.codigo,
      // A casa vem do token, não do pedido: quem está nesta etapa ainda não tem
      // sessão para escolher empresa, e a escolha já foi feita na senha.
      empresa: payload.cid && payload.role ? { companyId: payload.cid, role: payload.role } : undefined,
      ip: req.ip,
    });
    if (!resultado.tokens || !resultado.user) return reply.send(resultado);
    return reply.send({ ...resultado, user: resultado.user, ...resultado.tokens });
  });

  // ---- Conta: as mesmas operações para quem já tem sessão e o segundo fator é
  // escolha, não exigência. Rotas separadas das de etapa porque o gate estrutural
  // confere decorador por identidade, não por semelhança. ----

  app.get("/2fa/status", { preHandler: [app.authenticate] }, async (req) => {
    return statusSegundoFator(authPayload(req).sub);
  });

  app.post("/2fa/preparar", {
    preHandler: [app.authenticate],
    config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
  }, async (req) => {
    return configurarSegundoFator(authPayload(req).sub);
  });

  app.post("/2fa/ativar", {
    preHandler: [app.authenticate],
    config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
  }, async (req) => {
    const body = segundoFatorAtivarSchema.parse(req.body);
    return ativarSegundoFator({ app, userId: authPayload(req).sub, codigo: body.codigo, ip: req.ip });
  });

  app.post("/2fa/desativar", {
    preHandler: [app.authenticate],
    config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
  }, async (req) => {
    const body = segundoFatorDesativarSchema.parse(req.body);
    return desativarSegundoFator(authPayload(req).sub, body.codigo, req.ip);
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
