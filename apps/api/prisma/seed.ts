import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";
import { JOBS } from "../src/modules/cron/cron.handlers";

// A8 do prompt de mercado: o seed deixou de ser um script que decide sozinho.
// Tudo que ele precisa saber vem de um mapa de variáveis (por default,
// `process.env`), as decisões foram abertas em funções puras (`errosDoSeed`,
// `emailDoAdministradorGlobal`, `criaContaDev`) e o que escreve no banco está
// em `semear()`. Assim dá para provar em teste que, em produção sem
// `ALLOW_DEV_SEED`, ele se recusa antes da primeira consulta — e nenhuma senha
// volta a aparecer no console.

const prisma = new PrismaClient();

export type FonteDeSemente = Record<string, string | undefined>;

// Regra definitiva de acesso do projeto (ver CREDENCIAIS.md na raiz): o
// administrador global é OWNER de todas as empresas e não pode ser removido.
// Desde a R2 o endereço real mora só no `.env` da máquina, em SUPER_ADMIN_EMAIL;
// o padrão fora de produção é a conta fictícia abaixo, que não casa com ninguém.
// Em produção a ausência da variável derruba o seed — e a API, no validador de
// produção — porque valor fixo no código é uma porta conhecida.
const ADMINISTRADOR_GLOBAL_FICTICIO = "admin@exemplo.test";

export function emailDoAdministradorGlobal(ambiente: FonteDeSemente): string {
  const declarado = (ambiente.SUPER_ADMIN_EMAIL ?? "").trim();
  if (declarado) return declarado.toLowerCase();
  return ambiente.NODE_ENV === "production" ? "" : ADMINISTRADOR_GLOBAL_FICTICIO;
}

// As duas peças de demonstração têm nome fixo e exportado: o teste da F1.3
// procura exatamente estes valores, e o seed não escreve casa de demonstração em
// banco de cliente sem uma declaração própria para isso.
export const CONTA_DE_DESENVOLVIMENTO = "admin@nexus.local";
export const EMPRESA_DE_DEMONSTRACAO = "nexus-demo";

// A conta de desenvolvimento não nasce em produção (Fase 2). `SEED_DEV_ACCOUNT=1`
// é a exceção escrita de propósito, para um ambiente de teste que quer a conta.
export function criaContaDev(ambiente: FonteDeSemente): boolean {
  return ambiente.NODE_ENV !== "production" || ambiente.SEED_DEV_ACCOUNT === "1";
}

// F1.3: a casa de demonstração obedece à mesma lógica. `ALLOW_DEV_SEED=1` libera o
// seed subir em produção — administrador da plataforma e rotinas —, mas empresa de
// demonstração só entra num banco com a escrita `SEED_DEMO_COMPANY=1`, porque
// "posso semear" não significa "quero dado de vitrine no banco do cliente".
export function empresaDeDemonstracao(ambiente: FonteDeSemente): boolean {
  return ambiente.NODE_ENV !== "production" || ambiente.SEED_DEMO_COMPANY === "1";
}

// Lista de motivos para recusar (vazia = pode semear). Nada aqui toca o banco.
export function errosDoSeed(ambiente: FonteDeSemente): string[] {
  const problemas: string[] = [];
  if (ambiente.NODE_ENV === "production" && !ambiente.ALLOW_DEV_SEED) {
    problemas.push(
      "este seed cria contas e uma empresa de demonstração — em NODE_ENV=production ele só roda com ALLOW_DEV_SEED=1 declarado no ambiente",
    );
  }
  if (!emailDoAdministradorGlobal(ambiente)) {
    problemas.push("SUPER_ADMIN_EMAIL não está definido — em produção o endereço do administrador global vem do ambiente");
  }
  if (!ambiente.SEED_ADMIN_PASSWORD) {
    problemas.push(
      "SEED_ADMIN_PASSWORD não está definida — sem ela o administrador global não é criado (o valor real fica no CREDENCIAIS.md da máquina, nunca no repositório)",
    );
  }
  if (criaContaDev(ambiente) && !ambiente.SEED_DEV_PASSWORD) {
    problemas.push("SEED_DEV_PASSWORD não está definida — a senha da conta de desenvolvimento não mora mais no código");
  }
  if (criaContaDev(ambiente) && !empresaDeDemonstracao(ambiente)) {
    problemas.push(
      "SEED_DEV_ACCOUNT=1 sem SEED_DEMO_COMPANY=1 — a conta de desenvolvimento é dona da empresa de demonstração; declare as duas escritas ou nenhuma",
    );
  }
  return problemas;
}

async function ensureUser(
  cliente: PrismaClient,
  email: string,
  name: string,
  password: string,
): Promise<{ id: string }> {
  const passwordHash = await bcrypt.hash(password, 12);
  return cliente.user.upsert({
    where: { email },
    // O update também confirma o papel de plataforma: empresas criadas antes da
    // Fase 1b ganham o vínculo na volta do administrador, e a bandeira nunca
    // fica desatualizada em quem já existe.
    update: { platformRole: "SUPER_ADMIN" },
    create: { email, name, passwordHash, platformRole: "SUPER_ADMIN" },
  });
}

export interface ResumoDoSeed {
  adminDefinitivo: string;
  contaDev: string;
  empresaDemo: string;
  empresasComOwner: number;
  rotinas: number;
}

// Executa o seed. Recusa antes de tocar o banco quando `errosDoSeed` encontra
// qualquer motivo — é o que o teste de produção confirma.
export async function semear(
  ambiente: FonteDeSemente = process.env,
  cliente: PrismaClient = prisma,
): Promise<ResumoDoSeed> {
  const problemas = errosDoSeed(ambiente);
  if (problemas.length > 0) {
    throw new Error(`Seed recusado — ${problemas.join("; ")}`);
  }

  const superEmail = emailDoAdministradorGlobal(ambiente);
  const superAdmin = await ensureUser(cliente, superEmail, "Administrador Nexus", ambiente.SEED_ADMIN_PASSWORD ?? "");
  const devAdmin = criaContaDev(ambiente)
    ? await ensureUser(cliente, CONTA_DE_DESENVOLVIMENTO, "Administrador Nexus", ambiente.SEED_DEV_PASSWORD ?? "")
    : null;

  const casa = empresaDeDemonstracao(ambiente)
    ? await cliente.company.upsert({
        where: { slug: EMPRESA_DE_DEMONSTRACAO },
        update: {},
        create: { name: "Nexus Demo", slug: EMPRESA_DE_DEMONSTRACAO },
      })
    : null;

  // O administrador definitivo recebe OWNER em TODAS as empresas do banco.
  const companies = await cliente.company.findMany({ select: { id: true } });
  for (const c of companies) {
    await cliente.companyUser.upsert({
      where: { userId_companyId: { userId: superAdmin.id, companyId: c.id } },
      update: { role: "OWNER" },
      create: { userId: superAdmin.id, companyId: c.id, role: "OWNER" },
    });
  }

  if (devAdmin && casa) {
    await cliente.companyUser.upsert({
      where: { userId_companyId: { userId: devAdmin.id, companyId: casa.id } },
      update: { role: "OWNER" },
      create: { userId: devAdmin.id, companyId: casa.id, role: "OWNER" },
    });
  }

  // Rotinas-padrão do passo de Operações: o seed garante que a tela existe com
  // as rotinas do código. Enabled e histórico do operador são preservados.
  for (const j of JOBS) {
    await cliente.cronJob.upsert({
      where: { slug: j.slug },
      update: { name: j.nome, description: j.descricao, schedule: j.agenda },
      create: { slug: j.slug, name: j.nome, description: j.descricao, schedule: j.agenda, enabled: true },
    });
  }

  // Nada de senha no log: quem precisa saber o valor lê a variável de ambiente
  // (ou o CREDENCIAIS.md da máquina), não o terminal nem o histórico do git.
  const resumo: ResumoDoSeed = {
    adminDefinitivo: superEmail,
    contaDev: devAdmin
      ? `${CONTA_DE_DESENVOLVIMENTO} (senha definida via SEED_DEV_PASSWORD, só para desenvolvimento)`
      : "não criada (produção)",
    empresaDemo: casa ? EMPRESA_DE_DEMONSTRACAO : "não criada (produção)",
    empresasComOwner: companies.length,
    rotinas: JOBS.length,
  };
  // eslint-disable-next-line no-console
  console.log("Seed concluído:", resumo);
  return resumo;
}

// Rode apenas quando o arquivo é o programa (`npm run db:seed` → tsx
// prisma/seed.ts). Importar este módulo num teste não pode mais chamar
// `process.exit` nem escrever no banco por conta própria.
const ehExecucaoDireta = /prisma\/seed\.ts$/.test((process.argv[1] ?? "").replace(/\\/g, "/"));
if (ehExecucaoDireta) {
  semear()
    .catch((e: unknown) => {
      // eslint-disable-next-line no-console
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    })
    .finally(() => void prisma.$disconnect());
}
