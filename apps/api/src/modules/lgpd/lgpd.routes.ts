import type { FastifyInstance } from "fastify";
import { resolveCompanyContext } from "../../lib/company-context";
import { audit } from "../../lib/audit";
import { exportarDadosDoTitular } from "./lgpd.service";

// F7 (LGPD) — a porta de acesso do titular.
//
// `GET /api/lgpd/meus-dados` responde pela PESSOA, não pela empresa: quem autentica
// recebe o que a casa guarda sobre ela, na empresa ativa do token. A empresa vem do
// token assinado, nunca da requisição (ADR-0002). A matriz de rotas
// (`isolamento-rotas.test.ts`) classifica a rota como de empresa justamente pelo
// `resolveCompanyContext` abaixo.
//
// O rate-limit próprio existe porque a resposta é cara e sensível: cinco pedidos por
// minuto por endereço é o mesmo teto das rotas de segundo fator da F4.
//
// E cada pedido fica na trilha. Um direito exercido sem registro não é provável de
// ter acontecido — a linha de `lgpd.export` é o que a empresa mostra para o titular
// seguinte, para a ANPD e para quem quer que pergunte quando foi que alguém levou os
// dados de alguém embora daqui.
export async function lgpdRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/lgpd/meus-dados",
    { preHandler: [app.authenticate], config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (req) => {
      const ctx = await resolveCompanyContext(req);
      const corpo = await exportarDadosDoTitular(ctx);
      await audit({
        userId: ctx.userId,
        companyId: ctx.companyId,
        action: "lgpd.export",
        entity: "user",
        entityId: ctx.userId,
        ip: req.ip,
      });
      return corpo;
    },
  );
}
