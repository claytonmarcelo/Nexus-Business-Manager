import { buildApp } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";

export const app = buildApp();

let counter = 0;
export function uid(prefix = "t"): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}-${Math.floor(Math.random() * 1e6)}`;
}

export interface Fixture {
  userId: string;
  companyId: string;
  email: string;
  password: string;
}

// Cria usuário + empresa + vínculo com papel direto no banco (setup de teste).
export async function makeAccount(role: "OWNER" | "ADMIN" | "MANAGER" | "STAFF", opts?: { email?: string }): Promise<Fixture> {
  const email = opts?.email ?? `${uid("user")}@nexus.test`;
  const password = "SenhaForte123!";
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { email, name: "Teste", passwordHash } });
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

export async function cleanup(ids: { userIds?: string[]; companyIds?: string[] }): Promise<void> {
  if (ids.userIds?.length) await prisma.user.deleteMany({ where: { id: { in: ids.userIds } } });
  if (ids.companyIds?.length) await prisma.company.deleteMany({ where: { id: { in: ids.companyIds } } });
}
