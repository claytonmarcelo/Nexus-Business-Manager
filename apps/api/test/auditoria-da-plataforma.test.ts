import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app, cleanup, login, makeAccount, origemDaSessao, uid, type Fixture } from "./helpers";
import { prisma } from "../src/lib/prisma";
import { audit, ESCOPO_PLATAFORMA } from "../src/lib/audit";
import { registrarJobsPadrao } from "../src/modules/cron/cron.service";

// F2 (N14 + decisão G8, opção D) — as duas trilhas de auditoria, medidas pelo
// caminho do usuário e não pela boa vontade de quem escreveu a rota.
//
// O achado tinha uma cara concreta: o administrador da plataforma ligava uma
// rotina ou editava a vitrine — ação que alcança TODAS as empresas — e o evento
// nascia carimbado com a empresa em que ele estava sentado. O registro sobrava na
// trilha que deveria atravessar tenants e faltava no lugar certo: um tenant
// passava a mostrar, na própria aba de Auditoria, uma ação que não é dele.
//
// As seis promessas abaixo são medidas com dados reais no banco de desenvolvimento:
//  1. evento de plataforma nasce sem empresa dona, com a sessão no metadata;
//  2. a Auditoria do tenant não mostra esse evento — e mostra, sim, o que é dele
//     (guarda que não acha nada passa em branco, e passar em branco não é provar);
//  3. a trilha da plataforma mostra o evento e nomeia a empresa de origem;
//  4. quem não é administrador da plataforma recebe 403, e sem token 401;
//  5. escrita de tenant continua com escopo e empresa de sempre, e não entra na
//     trilha da plataforma;
//  6. a coluna que decide a trilha é preenchida por construção: insistir num
//     companyId na escrita de plataforma não dá dona ao evento.

const auth = (token: string) => ({ authorization: `Bearer ${token}` });
const ACAO_DO_TESTE = "teste.auditoria.da.plataforma";

interface LinhaDoTenant {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
}
interface LinhaDaPlataforma extends LinhaDoTenant {
  userEmail: string | null;
  origemSessao: string | null;
}
interface Paged<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

const created: { userIds: string[]; companyIds: string[] } = { userIds: [], companyIds: [] };
let admin: { f: Fixture; token: string; nome: string; nomeDaEmpresa: string };
let tenant: { f: Fixture; token: string };

// Rotina usada como escrita de plataforma: ligar e desligar devolve o estado
// anterior no mesmo teste, então a rodada não deixa a tela de rotinas diferente
// do que encontrou.
const SLUG_DA_ROTINA = "estoque-baixo";
let habilitadaAntes = true;

beforeAll(async () => {
  await registrarJobsPadrao();
  const fa = await makeAccount("OWNER", { plataforma: true });
  created.userIds.push(fa.userId);
  created.companyIds.push(fa.companyId);

  // Nome único, declarado antes das escritas: a trilha da plataforma tem busca
  // por nome de usuário, e é assim que este teste acha as próprias linhas sem
  // depender de qual foi a última rodada a mexer na mesma rotina.
  const nomeDoAdmin = uid("AdministradorDaPlataforma");
  admin = {
    f: fa,
    token: await login(fa.email, fa.password),
    nome: nomeDoAdmin,
    nomeDaEmpresa:
      (await prisma.company.findUnique({ where: { id: fa.companyId }, select: { name: true } }))?.name ?? "",
  };
  expect(
    (
      await app.inject({
        method: "PATCH",
        url: "/api/auth/me",
        headers: auth(admin.token),
        payload: { name: nomeDoAdmin },
      })
    ).statusCode,
  ).toBe(200);

  // Segunda conta na MESMA empresa, sem papel de plataforma: é ela que lê a
  // Auditoria do tenant e tenta abrir a trilha da plataforma.
  const fb = await makeAccount("ADMIN");
  created.userIds.push(fb.userId);
  created.companyIds.push(fb.companyId);
  await prisma.companyUser.create({ data: { userId: fb.userId, companyId: fa.companyId, role: "ADMIN" } });
  tenant = { f: fb, token: await login(fb.email, fb.password, fa.companyId) };

  const job = await prisma.cronJob.findFirst({ where: { slug: SLUG_DA_ROTINA }, select: { enabled: true } });
  habilitadaAntes = job?.enabled ?? true;
});

afterAll(async () => {
  // Os três eventos escritos direto pelo audit() são do teste, não do produto.
  await prisma.auditLog.deleteMany({ where: { action: ACAO_DO_TESTE } });
  await cleanup(created);
  await app.close();
});

describe("Auditoria da plataforma e do tenant (F2 / N14)", () => {
  it("evento de plataforma nasce sem empresa dona e com a origem da sessão no metadata", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/ops/jobs/${SLUG_DA_ROTINA}`,
      headers: auth(admin.token),
      payload: { habilitada: !habilitadaAntes },
    });
    expect(res.statusCode).toBe(200);

    const linha = await prisma.auditLog.findFirst({
      where: { userId: admin.f.userId, action: "cron.job.updated", entityId: SLUG_DA_ROTINA },
      orderBy: { createdAt: "desc" },
    });
    expect(linha).not.toBeNull();
    expect(linha!.scope).toBe("platform");
    expect(linha!.companyId).toBeNull();
    expect(origemDaSessao(linha!.metadata)).toBe(admin.f.companyId);

    // Devolver a rotina ao estado anterior é outra escrita de plataforma, e o
    // metadata continua sendo o único lugar onde a empresa aparece.
    const volta = await app.inject({
      method: "PATCH",
      url: `/api/ops/jobs/${SLUG_DA_ROTINA}`,
      headers: auth(admin.token),
      payload: { habilitada: habilitadaAntes },
    });
    expect(volta.statusCode).toBe(200);
    expect((volta.json() as { habilitada: boolean }).habilitada).toBe(habilitadaAntes);
  });

  it("a Auditoria do tenant não mostra a ação da plataforma, e mostra a do próprio tenant", async () => {
    // Recorte da ação de plataforma: a empresa onde o administrador estava sentado
    // não pode ver nada disso na própria aba.
    const daRotina = await app.inject({
      method: "GET",
      url: "/api/audit?entity=cron_job&pageSize=100",
      headers: auth(tenant.token),
    });
    expect(daRotina.statusCode).toBe(200);
    expect((daRotina.json() as Paged<LinhaDoTenant>).meta.total).toBe(0);

    // Controle positivo: o guarda acima não está passando em branco. Uma escrita
    // do tenant aparece na trilha do tenant na hora.
    const escrita = await app.inject({
      method: "PATCH",
      url: "/api/auth/me",
      headers: auth(tenant.token),
      payload: { name: uid("Membro da empresa") },
    });
    expect(escrita.statusCode).toBe(200);
    const doTenant = await app.inject({
      method: "GET",
      url: "/api/audit?entity=user&pageSize=100",
      headers: auth(tenant.token),
    });
    expect(
      (doTenant.json() as Paged<LinhaDoTenant>).data.some((l) => l.action === "auth.profile_updated"),
    ).toBe(true);
  });

  it("a trilha da plataforma mostra o evento e nomeia a empresa de origem", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/audit/plataforma?entity=cron_job&search=${encodeURIComponent(admin.nome)}&pageSize=100`,
      headers: auth(admin.token),
    });
    expect(res.statusCode).toBe(200);
    const corpo = res.json() as Paged<LinhaDaPlataforma>;
    expect(corpo.data.length).toBeGreaterThan(0);
    expect(corpo.data.every((l) => l.userEmail === admin.f.email)).toBe(true);
    expect(corpo.data.every((l) => l.origemSessao === admin.nomeDaEmpresa)).toBe(true);
    expect(corpo.data.every((l) => l.entityId === SLUG_DA_ROTINA)).toBe(true);

    // A superfície da trilha da plataforma não finge posse: nenhuma linha devolve
    // companyId, porque nenhuma empresa é dona delas.
    const bruto = JSON.parse(res.body) as { data: Array<Record<string, unknown>> };
    expect(bruto.data.some((l) => "companyId" in l)).toBe(false);
  });

  it("a trilha da plataforma é só do administrador da plataforma", async () => {
    const fora = await app.inject({
      method: "GET",
      url: "/api/audit/plataforma",
      headers: auth(tenant.token),
    });
    expect(fora.statusCode).toBe(403);
    expect((fora.json() as { message?: string }).message).toContain("administrador da plataforma");

    const anonimo = await app.inject({ method: "GET", url: "/api/audit/plataforma" });
    expect(anonimo.statusCode).toBe(401);
  });

  it("escrita de tenant fica no escopo do tenant e não entra na trilha da plataforma", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/api/auth/me",
      headers: auth(tenant.token),
      payload: { name: uid("Assinante do teste") },
    });
    expect(res.statusCode).toBe(200);

    const linha = await prisma.auditLog.findFirst({
      where: { userId: tenant.f.userId, action: "auth.profile_updated" },
      orderBy: { createdAt: "desc" },
    });
    expect(linha).not.toBeNull();
    expect(linha!.scope).toBe("tenant");
    // A empresa dona é a da sessão escolhida no login, não a empresa que o
    // fixture criou para a conta — a mesma onde o administrador está sentado.
    expect(linha!.companyId).toBe(admin.f.companyId);

    const naPlataforma = await app.inject({
      method: "GET",
      url: "/api/audit/plataforma?entity=user&pageSize=100",
      headers: auth(admin.token),
    });
    expect(naPlataforma.statusCode).toBe(200);
    expect((naPlataforma.json() as Paged<LinhaDaPlataforma>).meta.total).toBe(0);
  });

  it("a coluna que decide a trilha é preenchida por construção", async () => {
    // Insistindo numa empresa: o audit() não repassa o companyId para a coluna
    // quando o escopo é de plataforma, então a linha nasce sem dona de qualquer
    // jeito — mesmo se quem escrever a rota esquecer a regra.
    await audit({
      userId: admin.f.userId,
      companyId: admin.f.companyId,
      scope: ESCOPO_PLATAFORMA,
      action: ACAO_DO_TESTE,
      entity: "teste_com_empresa",
      metadata: { origem: "teste" },
    });
    const comEmpresa = await prisma.auditLog.findFirst({
      where: { action: ACAO_DO_TESTE, entity: "teste_com_empresa" },
      orderBy: { createdAt: "desc" },
    });
    expect(comEmpresa).not.toBeNull();
    expect(comEmpresa!.scope).toBe("platform");
    expect(comEmpresa!.companyId).toBeNull();
    expect(origemDaSessao(comEmpresa!.metadata)).toBe(admin.f.companyId);

    // Sem empresa na sessão a origem fica nula; nada é inventado para preencher.
    await audit({ scope: ESCOPO_PLATAFORMA, action: ACAO_DO_TESTE, entity: "teste_sem_sessao" });
    const semEmpresa = await prisma.auditLog.findFirst({
      where: { action: ACAO_DO_TESTE, entity: "teste_sem_sessao" },
      orderBy: { createdAt: "desc" },
    });
    expect(semEmpresa).not.toBeNull();
    expect(semEmpresa!.companyId).toBeNull();
    expect(origemDaSessao(semEmpresa!.metadata)).toBeNull();

    // E o caminho de sempre continua sendo o do tenant: sem escopo declarado, a
    // linha nasce com a empresa dona e sem origem no metadata.
    await audit({ companyId: admin.f.companyId, action: ACAO_DO_TESTE, entity: "teste_tenant" });
    const doTenant = await prisma.auditLog.findFirst({
      where: { action: ACAO_DO_TESTE, entity: "teste_tenant" },
      orderBy: { createdAt: "desc" },
    });
    expect(doTenant).not.toBeNull();
    expect(doTenant!.scope).toBe("tenant");
    expect(doTenant!.companyId).toBe(admin.f.companyId);
    expect(origemDaSessao(doTenant!.metadata)).toBeNull();
  });
});
