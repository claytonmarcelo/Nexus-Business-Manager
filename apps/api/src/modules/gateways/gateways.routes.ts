import type { FastifyInstance } from "fastify";
import { configGatewayManualSchema } from "./gateways.schemas";
import * as service from "./gateways.service";
import { badRequest, notFound } from "../../lib/errors";
import { resolveCompanyContext } from "../../lib/company-context";
import { assertPermission } from "../../lib/rbac";
import { exigirProvedorDisponivel, provedorPorSlug } from "../charges/charge-adapters";

// F3.2 Parte 2 — as duas portas dos gateways.
//
// O portão é o de Configurações (`settings:read` para ver, `settings:write` para
// escrever) e não o de cobrança: dizer por onde o dinheiro da empresa entra é
// decisão de dono, do mesmo nível de trocar o nome ou o fuso do cadastro. Um
// gerente opera as cobranças sem conseguir reescrever a chave PIX que o cliente
// vai usar.
//
// O `PUT /gateways/:provider` tem uma ordem que importa, e ela é de honestidade:
// o provedor é julgado ANTES do corpo ser parseado. Uma requisição pedindo a
// integração do Mercado Pago recebe "Integração ainda não disponível" — e não
// "campo obrigatório" de um formulário que não existe neste produto. Quem ouve a
// segunda resposta acha que o problema é ele; o problema é a porta fechada.
//
// Não existe rota de webhook aqui, e a ausência é uma decisão declarada: nada
// externo marca pagamento neste produto. Quem registra o recebimento é uma pessoa,
// dentro da empresa, com nome e auditoria.
export async function gatewaysRoutes(app: FastifyInstance): Promise<void> {
  app.get("/gateways", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "settings:read");
    return service.listGateways(ctx.companyId);
  });

  app.put("/gateways/:provider", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "settings:write");
    const { provider } = req.params as { provider: string };

    const perfil = provedorPorSlug(provider);
    if (!perfil) throw notFound("Provedor de pagamento desconhecido");
    // Os três provedores de mercado morrem aqui, com o motivo dito e sem linha no
    // banco. O adaptador devolvido só serve ao MANUAL hoje.
    exigirProvedorDisponivel(perfil);
    if (perfil.provider !== "MANUAL") {
      throw badRequest(`${perfil.rotulo}: Integração ainda não disponível.`);
    }

    const input = configGatewayManualSchema.parse(req.body);
    return service.salvarConfiguracaoManual(ctx.companyId, input, { userId: ctx.userId }, req.ip);
  });
}
