import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app, login, cleanup, makeAccount, comFlag, type Fixture } from "./helpers";
import { prisma } from "../src/lib/prisma";
import { registrarJobsPadrao } from "../src/modules/cron/cron.service";
import { jobPorSlug } from "../src/modules/cron/cron.handlers";

// T6.5 (F7, LGPD art. 16, II): a trilha de auditoria é dado pessoal também — o
// evento carrega quem praticou a ação, de onde veio e o que mudou. Conservá-la
// para sempre é guarda sem fim; a retenção precisa ser **configurável** e o
// padrão precisa ser reversível.
//
// O que esta suíte mede, na ordem:
//  1. a rotina existe no catálogo, com agenda e executor conhecido;
//  2. com a janela desligada (0) NADA é apagado e a trilha nem ganha registro
//     — o padrão seguro não deixa pegada;
//  3. com a janela de 30 dias, só as linhas mais velhas caem, e o expurgo se
//     registra na trilha da plataforma com a contagem exata;
//  4. a contagem fala no singular quando apaga uma linha e no plural quando
//     apaga mais de uma;
//  5. o expurgo só mexe na trilha: conta, aviso e demais tabelas ficam.
const SLUG = "expurgo-de-auditoria";
const ACAO_DO_EXPURGO = "ops.audit_purge";
const JANELA = 30;

function diasAtras(dias: number): Date {
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
}

// O expurgo apaga TODA linha mais velha que o corte, e o banco de prova é
// compartilhado. Sem esta limpeza, o número de linhas apagadas depende do
// lixo das rodadas anteriores — medido: 1 linha numa rodada, 8 na outra,
// 12.131 na terceira — e o portão de cobertura passava a reprovar conforme o
// dia do relógio, sem que nada no produto tivesse mudado. Era o suficiente
// para a contagem no singular ("1 linha apagada") aparecer por acaso e
// sumir na rodada seguinte.
//
// A folga de um dia é o que fecha a conta: o corte do expurgo fica uma hora
// (na verdade um dia) antes do corte desta limpeza, então tudo que ele
// alcançaria já saiu do banco quando a corrida começa. Depois da limpeza, o
// único expurgável é o que o próprio teste criou.
async function limpaPassadoExpirado(diasDaJanela: number): Promise<void> {
  const corte = new Date(Date.now() - (diasDaJanela - 1) * 24 * 60 * 60 * 1000);
  await prisma.auditLog.deleteMany({ where: { createdAt: { lt: corte } } });
}

describe("Retenção configurável da trilha de auditoria (T6.5)", () => {
  const created: { userIds: string[]; companyIds: string[] } = { userIds: [], companyIds: [] };
  let admin: { f: Fixture; token: string };

  const auth = (token: string) => ({ authorization: `Bearer ${token}` });

  beforeAll(async () => {
    await registrarJobsPadrao();
    const fa = await makeAccount("ADMIN", { plataforma: true });
    created.userIds.push(fa.userId);
    created.companyIds.push(fa.companyId);
    admin = { f: fa, token: await login(fa.email, fa.password) };
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: { action: { startsWith: "teste.retencao" } },
    });
    await cleanup(created);
  });

  it("a rotina nasce no catálogo, com agenda legível e executor conhecido", async () => {
    const definicao = jobPorSlug(SLUG);
    expect(definicao).toBeDefined();
    expect(definicao!.agenda).toBe("0 3 * * *");

    const res = await app.inject({ method: "GET", url: "/api/ops/jobs", headers: auth(admin.token) });
    expect(res.statusCode).toBe(200);
    const job = res.json().data.find((j: { slug: string }) => j.slug === SLUG);
    expect(job).toBeDefined();
    expect(job.executorConhecido).toBe(true);
    expect(job.agendaValida).toBe(true);
    expect(job.agendaLegivel).toBe("todos os dias às 03:00");
  });

  it("com a janela desligada (0) nenhuma linha é apagada e a trilha não ganha registro", async () => {
    const antiga = await prisma.auditLog.create({
      data: { action: "teste.retencao.velha", entity: "teste", createdAt: diasAtras(400) },
    });
    const antes = await prisma.auditLog.count({ where: { action: ACAO_DO_EXPURGO } });

    const res = await comFlag("AUDIT_RETENTION_DIAS", 0, async () =>
      app.inject({ method: "POST", url: `/api/ops/jobs/${SLUG}/run`, headers: auth(admin.token) }),
    );
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("ok");
    expect(res.json().mensagem).toMatch(/desligada/i);

    const sobrou = await prisma.auditLog.findUnique({ where: { id: antiga.id } });
    expect(sobrou).not.toBeNull();
    const depois = await prisma.auditLog.count({ where: { action: ACAO_DO_EXPURGO } });
    expect(depois).toBe(antes);

    await prisma.auditLog.deleteMany({ where: { id: antiga.id } });
  });

  it("com a janela de 30 dias apaga só as linhas mais velhas e conta o que apagou", async () => {
    await limpaPassadoExpirado(JANELA);
    const velha = await prisma.auditLog.create({
      data: { action: "teste.retencao.velha", entity: "teste", createdAt: diasAtras(400) },
    });
    const dentro = await prisma.auditLog.create({
      data: { action: "teste.retencao.dentro", entity: "teste", createdAt: diasAtras(29) },
    });
    const agora = await prisma.auditLog.create({
      data: { action: "teste.retencao.agora", entity: "teste" },
    });

    const res = await comFlag("AUDIT_RETENTION_DIAS", JANELA, async () =>
      app.inject({ method: "POST", url: `/api/ops/jobs/${SLUG}/run`, headers: auth(admin.token) }),
    );
    expect(res.statusCode).toBe(200);
    const corpo = res.json();
    expect(corpo.status).toBe("ok");
    expect(corpo.job.ultimoStatus).toBe("ok");
    expect(corpo.mensagem).toMatch(/apagada/i);

    expect(await prisma.auditLog.findUnique({ where: { id: velha.id } })).toBeNull();
    expect(await prisma.auditLog.findUnique({ where: { id: dentro.id } })).not.toBeNull();
    expect(await prisma.auditLog.findUnique({ where: { id: agora.id } })).not.toBeNull();

    // O expurgo é evento de plataforma: ele atravessa todas as empresas, então
    // não pertence a nenhuma e não pode ser visto na trilha de um tenant.
    const linha = await prisma.auditLog.findFirst({
      where: { action: ACAO_DO_EXPURGO },
      orderBy: { createdAt: "desc" },
    });
    expect(linha).not.toBeNull();
    expect(linha!.scope).toBe("platform");
    expect(linha!.companyId).toBeNull();
    const meta = linha!.metadata as { dias?: number; apagadas?: number; corte?: string };
    expect(meta.dias).toBe(JANELA);
    // A contagem é exata: com o passado expirado limpo, a única linha que
    // cabe no corte é a que o teste criou.
    expect(meta.apagadas).toBe(1);
    expect(typeof meta.corte).toBe("string");
    // E ela fala no singular — a frase que o operador lê na tela de Rotinas.
    expect(corpo.mensagem).toContain("1 linha apagada");
  });

  it("quando apaga mais de uma linha, a contagem fala no plural", async () => {
    await limpaPassadoExpirado(JANELA);
    await prisma.auditLog.create({
      data: { action: "teste.retencao.velha-1", entity: "teste", createdAt: diasAtras(400) },
    });
    await prisma.auditLog.create({
      data: { action: "teste.retencao.velha-2", entity: "teste", createdAt: diasAtras(401) },
    });

    const res = await comFlag("AUDIT_RETENTION_DIAS", JANELA, async () =>
      app.inject({ method: "POST", url: `/api/ops/jobs/${SLUG}/run`, headers: auth(admin.token) }),
    );
    expect(res.statusCode).toBe(200);
    const corpo = res.json();
    expect(corpo.mensagem).toContain("2 linhas apagadas");

    const linha = await prisma.auditLog.findFirst({
      where: { action: ACAO_DO_EXPURGO },
      orderBy: { createdAt: "desc" },
    });
    const meta = linha!.metadata as { apagadas?: number };
    expect(meta.apagadas).toBe(2);
  });

  it("o expurgo só mexe na trilha: conta, aviso e as outras tabelas ficam", async () => {
    const conta = await makeAccount("STAFF");
    await prisma.user.update({
      where: { id: conta.userId },
      data: { createdAt: diasAtras(400) },
    });
    await prisma.notification.create({
      data: {
        companyId: conta.companyId,
        userId: conta.userId,
        kind: "system",
        title: "Aviso antigo do teste de retenção",
        body: "Este aviso tem data antiga e não pode ser apagado pelo expurgo.",
        createdAt: diasAtras(400),
      },
    });

    await comFlag("AUDIT_RETENTION_DIAS", JANELA, async () =>
      app.inject({ method: "POST", url: `/api/ops/jobs/${SLUG}/run`, headers: auth(admin.token) }),
    );

    expect(await prisma.user.findUnique({ where: { id: conta.userId } })).not.toBeNull();
    expect(
      await prisma.notification.count({ where: { companyId: conta.companyId, userId: conta.userId } }),
    ).toBe(1);

    await cleanup({ userIds: [conta.userId], companyIds: [conta.companyId] });
  });
});
