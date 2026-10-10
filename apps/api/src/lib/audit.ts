import { prisma } from "./prisma";

export interface AuditInput {
  userId?: string | null;
  companyId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
}

// Registra auditoria sem vazar segredos (seção 36). Nunca lançar na API pública.
export async function audit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        companyId: input.companyId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        ip: input.ip ?? null,
        metadata: (input.metadata ?? undefined) as object | undefined,
      },
    });
  } catch {
    // Falha de auditoria não deve derrubar a operação principal, mas deve ser visível.
    // eslint-disable-next-line no-console
    console.error("[audit] falha ao registrar evento", input.action, input.entity);
  }
}
