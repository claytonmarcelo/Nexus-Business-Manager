import type { FastifyInstance } from "fastify";
import { resolveCompanyContext } from "../../lib/company-context";
import { assertPermission } from "../../lib/rbac";
import { audit } from "../../lib/audit";
import { estadoDoCanalDeEmail } from "../../lib/mail";
import { listaNotificacoesQuery, preferenciasSchema } from "./notifications.schemas";
import * as service from "./notifications.service";
import { TIPOS } from "./notifications.service";

// Notificações persistentes (seção 44). A lista, o contador e as preferências
// são sempre restritos ao usuário autenticado dentro da empresa ativa: o
// isolamento multiempresa vem do token + vínculo, nunca do corpo da requisição.
// A varredura periódica é a única rota administrativa (settings:write).
export async function notificationsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/notifications", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    const q = listaNotificacoesQuery.parse(req.query);
    return service.listar(ctx.userId, ctx.companyId, q, { status: q.status, kind: q.kind });
  });

  // O sino polling esta rota: devolve só contagens, sem despejar registros.
  app.get("/notifications/count", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    return service.resumo(ctx.userId, ctx.companyId);
  });

  app.patch("/notifications/:id/read", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    const { id } = req.params as { id: string };
    return service.marcarLida(ctx.userId, ctx.companyId, id);
  });

  app.post("/notifications/read-all", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    const marcadas = await service.marcarTodasLidas(ctx.userId, ctx.companyId);
    return { marcadas };
  });

  // A tela de preferências mostra o estado real do canal (N59): `email` diz se
  // esta instalação tem entregador de verdade, qual é o transporte, e por que não
  // entrega quando é o caso. A caixa da pessoa depende disso, não de um `disabled`
  // fixo no formulário.
  app.get("/notifications/preferences", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    const preferencias = await service.obterPreferencias(ctx.userId, ctx.companyId);
    return {
      ...preferencias,
      tipos: Object.entries(TIPOS).map(([kind, r]) => ({ kind, rotulo: r.rotulo })),
      email: estadoDoCanalDeEmail(),
    };
  });

  // A preferência é a intenção da pessoa, e ela continua gravada mesmo quando o
  // canal desta instalação não entrega (N59): quem decide se a mensagem sai é o
  // `notificarDetalhado`, na hora do aviso, consultando `estadoDoCanalDeEmail()`.
  // Configurar um SMTP depois não obriga ninguém a remarcar a caixa.
  app.put("/notifications/preferences", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    const input = preferenciasSchema.parse(req.body);
    return service.salvarPreferencias(ctx.userId, ctx.companyId, input);
  });

  // Rotina administrativa: gera os avisos que não nascem de uma ação da pessoa
  // (contas vencidas). O passo de Operações/agendador chama a mesma função.
  // Fase 1 da auditoria: a empresa varrida é SEMPRE a do token — nada de
  // companyId no corpo, que era porta para varrer e gravar aviso em terceiro.
  // N59: a resposta traz os dois contadores para quem opera ver se saiu mensagem
  // ou se o canal de e-mail está desligado nesta instalação.
  app.post("/notifications/scan", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "settings:write");
    const { criadas, emails } = await service.varreduraEmpresaDetalhada(ctx.companyId);
    await audit({
      userId: ctx.userId,
      companyId: ctx.companyId,
      action: "notification.scan",
      entity: "notification",
      ip: req.ip,
      metadata: { criadas, emails },
    });
    return { criadas, emails };
  });
}
