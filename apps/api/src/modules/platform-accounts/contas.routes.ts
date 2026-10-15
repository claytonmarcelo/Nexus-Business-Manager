import type { FastifyInstance } from "fastify";
import { assertPlatformAdmin } from "../../lib/platform";
import { resolveCompanyContext } from "../../lib/company-context";
import { confirmarEmailSchema, listarContasQuery } from "./contas.schemas";
import * as service from "./contas.service";

// T5.5 (N61): a área de plataforma que cuida de contas sem confirmação.
//
// Duas portas, nenhuma permissão de módulo: `assertPlatformAdmin` é o cadeado, e a
// matriz de rotas (`test/isolamento-rotas.test.ts`) exige que uma rota que se diga
// de plataforma não apareça com RBAC de tenant. O endereço confirmado é identidade,
// não dado da empresa em que o administrador está sentado — por isso a escrita é
// auditada com `scope: ESCOPO_PLATAFORMA` (N14) e a empresa da sessão vai só no
// metadata, como origem.
export async function platformAccountsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/plataforma/contas/sem-confirmacao", { preHandler: [app.authenticate] }, async (req) => {
    await assertPlatformAdmin(req);
    const q = listarContasQuery.parse(req.query);
    return service.contasSemConfirmacao({ page: q.page, pageSize: q.pageSize }, q.search);
  });

  app.post(
    "/plataforma/contas/:userId/confirmar-email",
    { preHandler: [app.authenticate] },
    async (req) => {
      await assertPlatformAdmin(req);
      const ctx = await resolveCompanyContext(req);
      const { userId } = req.params as { userId: string };
      const { motivo } = confirmarEmailSchema.parse(req.body ?? {});
      return service.confirmarEmailPelaPlataforma(
        userId,
        { userId: ctx.userId, companyId: ctx.companyId, ip: req.ip },
        motivo,
      );
    },
  );
}
