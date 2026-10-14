import { buildApp } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";
import { env } from "../src/config/env";

export const app = buildApp();

let counter = 0;
export function uid(prefix = "t"): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}-${Math.floor(Math.random() * 1e6)}`;
}

// Liga uma chave de ambiente só dentro de um trecho de teste e devolve o valor
// anterior no caminho de volta, inclusive quando o trecho lança. `env` é o objeto
// validado pelo zod de `config/env.ts`, e os serviços o leem na hora da chamada —
// foi assim que a F4 pôde provar os dois lados de REQUIRE_EMAIL_VERIFICATION sem
// subir um segundo processo da API. O `vitest` roda os arquivos em série num único
// processo (pool forks + singleFork), então não há corrida com outra suíte.
export async function comFlag<T>(
  nome: keyof typeof env,
  valor: string,
  trecho: () => Promise<T>,
): Promise<T> {
  const anterior = env[nome];
  (env as Record<string, unknown>)[nome] = valor;
  try {
    return await trecho();
  } finally {
    (env as Record<string, unknown>)[nome] = anterior;
  }
}

export interface Fixture {
  userId: string;
  companyId: string;
  email: string;
  password: string;
}

// Cria usuário + empresa + vínculo com papel direto no banco (setup de teste).
// opts.plataforma = true marca o usuário como administrador da plataforma
// (Fase 1b): necessário para as áreas globais (CMS, rotinas), que não são de
// nenhuma empresa.
export async function makeAccount(
  role: "OWNER" | "ADMIN" | "MANAGER" | "STAFF",
  opts?: { email?: string; plataforma?: boolean },
): Promise<Fixture> {
  const email = opts?.email ?? `${uid("user")}@nexus.test`;
  const password = "SenhaForte123!";
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      name: "Teste",
      passwordHash,
      ...(opts?.plataforma ? { platformRole: "SUPER_ADMIN" as const } : {}),
    },
  });
  const company = await prisma.company.create({ data: { name: uid("Empresa"), slug: uid("slug") } });
  await prisma.companyUser.create({ data: { userId: user.id, companyId: company.id, role } });
  return { userId: user.id, companyId: company.id, email, password };
}

export async function login(email: string, password: string, companyId?: string): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email, password, companyId },
  });
  if (res.statusCode !== 200) throw new Error(`login falhou: ${res.statusCode} ${res.body}`);
  return (res.json() as { accessToken: string }).accessToken;
}

// Leitura do metadata da auditoria: evento de plataforma guarda a empresa da
// sessão como origem, nunca como dona da linha.
export function origemDaSessao(metadata: unknown): string | null {
  if (metadata && typeof metadata === "object" && "empresaDaSessao" in metadata) {
    const valor = (metadata as { empresaDaSessao?: unknown }).empresaDaSessao;
    if (typeof valor === "string") return valor;
  }
  return null;
}

// Apaga o fixture na ordem filho -> pai. Com o banco finalmente em InnoDB
// (reparo da Fase 1, tools/para-innodb.cjs) as chaves estrangeiras valem de
// verdade, e os RESTRICT de negócio — item de venda/compra aponta produto,
// compra aponta fornecedor — barram o deleteMany direto da empresa se a
// limpeza tentar contar só com as cascatas. ids vêm dos próprios testes (uuid),
// nunca de usuário, então a interpolação na lista IN é segura aqui.
export async function cleanup(ids: {
  userIds?: string[];
  companyIds?: string[];
  emails?: string[];
}): Promise<void> {
  const empresaIds = (ids.companyIds ?? []).map((i) => `'${i.replace(/'/g, "")}'`).join(",");
  if (empresaIds) {
    const viaPai: Array<[child: string, parent: string]> = [
      ["sale_items", "sales"],
      ["purchase_items", "purchases"],
    ];
    for (const [child, parent] of viaPai) {
      await prisma.$executeRawUnsafe(
        `DELETE c FROM \`${child}\` c JOIN \`${parent}\` p ON p.id = c.${child === "sale_items" ? "sale_id" : "purchase_id"} WHERE p.company_id IN (${empresaIds})`,
      );
    }
    const proprias = [
      // `charges` abre a lista: cobrança aponta cliente, venda, OS e lançamento,
      // e os três primeiros têm RESTRICT — ela sai antes de todos eles.
      "charges", "service_orders", "stock_movements", "finance_entries", "agenda_events", "leads", "sales", "purchases",
      "clients", "products", "product_categories", "suppliers", "finance_categories",
      "notifications", "notification_preferences", "payment_gateways", "company_users",
    ];
    for (const tabela of proprias) {
      await prisma.$executeRawUnsafe(`DELETE FROM \`${tabela}\` WHERE company_id IN (${empresaIds})`);
    }
    await prisma.company.deleteMany({ where: { id: { in: ids.companyIds } } });
  }
  if (ids.userIds?.length) await prisma.user.deleteMany({ where: { id: { in: ids.userIds } } });
  // F4: a contagem de tentativas é chaveada pelo endereço, não pelo id da conta
  // (é o que permite bloquear quem testa e-mail inexistente sem denunciar quais
  // existem). Sem foreign key, ela não cai junto do `deleteMany` de `users`, então
  // o fixture apaga por aqui — senão o próximo teste da mesma suíte herdaria o
  // bloqueio da conta que acabou de ser removida.
  if (ids.emails?.length) {
    await prisma.loginAttempt.deleteMany({ where: { email: { in: ids.emails.map((e) => e.toLowerCase()) } } });
  }
}
