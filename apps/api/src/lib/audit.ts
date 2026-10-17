import { prisma } from "./prisma";

// Escopo do evento de auditoria (F2, N14).
//
// `tenant` é a regra de sempre: a linha pertence à auditoria daquela empresa e
// só quem tem `audit:read` nela consegue ler.
//
// `platform` é o evento que não pertence a empresa nenhuma — vitrine, textos
// legais e rotinas de sistema respondem pela plataforma inteira. Antes da F2 essa
// diferença não existia no registro: a rota de plataforma carimbava a empresa
// ativa da sessão, e uma ação que alcança todos os tenants aparecia como se fosse
// do tenant onde o administrador estava sentado. Um evento a menos no lugar certo
// e um a mais no lugar errado.
export type EscopoDaAuditoria = "tenant" | "platform";
export const ESCOPO_TENANT: EscopoDaAuditoria = "tenant";
export const ESCOPO_PLATAFORMA: EscopoDaAuditoria = "platform";

export interface AuditInput {
  userId?: string | null;
  companyId?: string | null;
  // Ausente vale `tenant`. Com `platform`, o `companyId` deixa de ser o dono do
  // registro e passa a ser só a origem da sessão, gravada no metadata.
  scope?: EscopoDaAuditoria;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
}

// Registra auditoria sem vazar segredos (seção 36). Nunca lançar na API pública.
export async function audit(input: AuditInput): Promise<void> {
  const plataforma = input.scope === ESCOPO_PLATAFORMA;
  // Por construção, não por convenção: um evento de plataforma não consegue
  // nascer com dono-tenant, mesmo que quem escreveu a rota esqueça. A empresa em
  // que o administrador estava continua registrada, mas no metadata — nunca na
  // coluna que decide em qual auditoria o evento aparece.
  const companyId = plataforma ? null : (input.companyId ?? null);
  const metadata: Record<string, unknown> | null = plataforma
    ? { ...(input.metadata ?? {}), empresaDaSessao: input.companyId ?? null }
    : (input.metadata ?? null);

  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        companyId,
        scope: plataforma ? ESCOPO_PLATAFORMA : ESCOPO_TENANT,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        ip: input.ip ?? null,
        metadata: (metadata ?? undefined) as object | undefined,
      },
    });
  } catch {
    // Falha de auditoria não deve derrubar a operação principal, mas deve ser visível.
    // eslint-disable-next-line no-console
    console.error("[audit] falha ao registrar evento", input.action, input.entity);
  }
}

// Acoes que mexem no resultado do negocio, no dinheiro, no estoque ou no
// acesso. A aba "Alteracoes Sensiveis" da Auditoria filtra por elas.
// Mantida no servidor porque a mesma lista vale para qualquer tela futura
// (alarmes, exportacoes) e para nao paginar um recorte errado no cliente.
export function sensivelWhere() {
  return {
    OR: [
      { action: { endsWith: ".delete" } },
      {
        action: {
          in: [
            "sale.cancelled",
            "service_order.cancelled",
            "purchase.cancelled",
            "finance.cancelled",
            "finance.paid",
            // F3.2 Parte 2: receber uma cobrança mexe no caixa, e cancelar mexe
            // na expectativa de receita. A configuração do gateway decide por
            // onde o dinheiro entra — trocar a chave PIX é alteração sensível.
            "charge.paid",
            "charge.cancelled",
            "gateway.update",
            "lead.lost",
            "lead.won",
            "agenda.cancelled",
            "stock.move",
            "user.add",
            "user.update_role",
            "company.create",
            "auth.reset_password",
            "auth.forgot_password",
            "auth.login.failed",
            "auth.password_changed",
            "company.settings.updated",
            // T6.3 (F7): levar os próprios dados embora é acesso em larga escala e
            // sai do comum. A aba "Alterações Sensíveis" passa a mostrar cada
            // exportação de titular, com data, empresa e endereço de origem.
            "lgpd.export",
          ],
        },
      },
    ],
  };
}
