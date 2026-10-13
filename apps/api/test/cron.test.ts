import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app, login, cleanup, makeAccount, origemDaSessao, type Fixture } from "./helpers";
import { prisma } from "../src/lib/prisma";
import { parseCron, cronCombina, proximaExecucao, agendaLegivel } from "../src/modules/cron/cron.parse";
import { registrarJobsPadrao } from "../src/modules/cron/cron.service";
import { AppError } from "../src/lib/errors";

// Rotinas agendadas (seção 37, Operações). Duas camadas de prova:
//  1. o leitor de cron é matemática pura — o que ele aceita, rejeita, quando
//     dispara e como traduz para a tela, tudo sem banco;
//  2. as rotas /ops/jobs seguem o RBAC (só quem configura vê e mexe), o botão
//     "executar agora" grava estado no banco e os três handlers geram avisos
//     reais (nada de rotina de fachada: o aviso nasce, a preferência manda).
describe("Cron: leitor de expressão (puro)", () => {
  it("aceita as formas clássicas e expande listas, faixas e passos", () => {
    expect(parseCron("0 7 * * *").hour).toEqual([7]);
    expect(parseCron("*/15 * * * *").minute).toEqual([0, 15, 30, 45]);
    expect(parseCron("0,30 8-10 * * 1-5").minute).toEqual([0, 30]);
    expect(parseCron("0,30 8-10 * * 1-5").hour).toEqual([8, 9, 10]);
    expect(parseCron("0,30 8-10 * * 1-5").dow).toEqual([1, 2, 3, 4, 5]);
    expect(parseCron("10-40/10 * * * *").minute).toEqual([10, 20, 30, 40]);
    expect(parseCron("0 0 * * 7").dow).toEqual([0]); // 7 e 0 são domingo
  });

  it("rejeita expressão malformada ou fora da faixa (400 na entrada)", () => {
    const ruins = ["* * *", "0 7 * * * 2026", "60 7 * * *", "0 24 * * *", "0 7 32 * *", "0 7 * 13 *", "0 7 * * 8", "*/0 7 * * *", "abc 7 * * *", "5-1 * * * *"];
    for (const r of ruins) {
      expect(() => parseCron(r), r).toThrowError(AppError);
      try {
        parseCron(r);
      } catch (err) {
        expect((err as AppError).statusCode, r).toBe(400);
      }
    }
  });

  it("casa minuto a minuto no relógio local", () => {
    const spec = parseCron("5 7 * * 1-5");
    expect(cronCombina(spec, new Date(2026, 9, 12, 7, 5))).toBe(true); // seg 12/10 07:05
    expect(cronCombina(spec, new Date(2026, 9, 12, 7, 6))).toBe(false);
    expect(cronCombina(spec, new Date(2026, 9, 11, 7, 5))).toBe(false); // domingo
  });

  it("calcula a próxima execução sem voltar no tempo", () => {
    const diaria = parseCron("0 7 * * *");
    const p = proximaExecucao(diaria, new Date(2026, 9, 11, 7, 30));
    expect(p).not.toBeNull();
    expect(p!.getDate()).toBe(12);
    expect(p!.getHours()).toBe(7);
    expect(p!.getMinutes()).toBe(0);
    const mensal = parseCron("0 8 15 * *");
    const q = proximaExecucao(mensal, new Date(2026, 9, 20, 9, 0));
    expect(q!.getMonth()).toBe(10); // 15/11
    expect(q!.getDate()).toBe(15);
  });

  it("traduz a agenda para a tela em português", () => {
    expect(agendaLegivel("0 7 * * *")).toBe("todos os dias às 07:00");
    expect(agendaLegivel("*/15 * * * *")).toBe("a cada 15 minutos");
    expect(agendaLegivel("30 */2 * * *")).toBe("a cada 2 horas, no minuto 30");
    expect(agendaLegivel("0 8 15 * *")).toBe("no dia 15 de cada mês, às 08:00");
    expect(agendaLegivel("x")).toBe("agenda x");
  });
});

describe("Cron: rotas /ops/jobs e executor", () => {
  const created: { userIds: string[]; companyIds: string[] } = { userIds: [], companyIds: [] };
  let admin: { f: Fixture; token: string };
  let staffToken = "";

  const auth = (token: string) => ({ authorization: `Bearer ${token}` });

  beforeAll(async () => {
    await registrarJobsPadrao();
    // Desde a Fase 1b a área é da plataforma: a conta que gerir precisa do
    // papel de plataforma no banco, não só do papel dentro da empresa.
    const fa = await makeAccount("ADMIN", { plataforma: true });
    created.userIds.push(fa.userId);
    created.companyIds.push(fa.companyId);
    admin = { f: fa, token: await login(fa.email, fa.password) };
    const fs2 = await makeAccount("STAFF");
    created.userIds.push(fs2.userId);
    created.companyIds.push(fs2.companyId);
    staffToken = await login(fs2.email, fs2.password);
  });

  afterAll(async () => {
    await cleanup(created);
    await app.close();
  });

  it("RBAC: só o administrador da plataforma vê a lista; papel de empresa não abre", async () => {
    const ok = await app.inject({ method: "GET", url: "/api/ops/jobs", headers: auth(admin.token) });
    expect(ok.statusCode).toBe(200);
    const corpo = ok.json();
    expect(Array.isArray(corpo.data)).toBe(true);
    const slugs = corpo.data.map((j: { slug: string }) => j.slug);
    expect(slugs).toContain("contas-vencidas");
    expect(slugs).toContain("estoque-baixo");
    expect(slugs).toContain("relatorio-diario");

    const staff = await app.inject({ method: "GET", url: "/api/ops/jobs", headers: auth(staffToken) });
    expect(staff.statusCode).toBe(403);
    const anonimo = await app.inject({ method: "GET", url: "/api/ops/jobs" });
    expect(anonimo.statusCode).toBe(401);
    // Fase 1b: até o OWNER de empresa fica de fora — rotina varre todas, é da plataforma.
    const dono = await makeAccount("OWNER");
    created.userIds.push(dono.userId);
    created.companyIds.push(dono.companyId);
    const donoToken = await login(dono.email, dono.password);
    const fora = await app.inject({ method: "GET", url: "/api/ops/jobs", headers: auth(donoToken) });
    expect(fora.statusCode).toBe(403);
  });

  it("cada job vem com agenda traduzida, próxima execução e estado da última corrida", async () => {
    const res = await app.inject({ method: "GET", url: "/api/ops/jobs", headers: auth(admin.token) });
    const job = res.json().data.find((j: { slug: string }) => j.slug === "contas-vencidas");
    expect(job.agenda).toBe("0 7 * * *");
    expect(job.agendaLegivel).toBe("todos os dias às 07:00");
    expect(job.agendaValida).toBe(true);
    expect(job.executorConhecido).toBe(true);
    expect(typeof job.habilitada).toBe("boolean");
    if (job.habilitada) expect(job.proximaExecucao).not.toBeNull();
    else expect(job.proximaExecucao).toBeNull();
  });

  it("liga e desliga persistindo, com 400 no corpo errado e 404 no slug inventado", async () => {
    const desliga = await app.inject({
      method: "PATCH", url: "/api/ops/jobs/estoque-baixo",
      headers: auth(admin.token), payload: { habilitada: false },
    });
    expect(desliga.statusCode).toBe(200);
    expect(desliga.json().habilitada).toBe(false);
    const re = await app.inject({
      method: "PATCH", url: "/api/ops/jobs/estoque-baixo",
      headers: auth(admin.token), payload: { habilitada: true },
    });
    expect(re.json().habilitada).toBe(true);

    const corpoRuim = await app.inject({
      method: "PATCH", url: "/api/ops/jobs/estoque-baixo",
      headers: auth(admin.token), payload: { habilitada: "sim" },
    });
    expect(corpoRuim.statusCode).toBe(400);
    const fantasma = await app.inject({
      method: "PATCH", url: "/api/ops/jobs/rotina-inventada",
      headers: auth(admin.token), payload: { habilitada: true },
    });
    expect(fantasma.statusCode).toBe(404);
    const staff = await app.inject({
      method: "PATCH", url: "/api/ops/jobs/estoque-baixo",
      headers: auth(staffToken), payload: { habilitada: false },
    });
    expect(staff.statusCode).toBe(403);
  });

  it("executar agora roda a varredura de contas vencidas e grava estado no banco", async () => {
    // Uma conta vencida de verdade na empresa do teste: a rotina tem que achar
    // e avisar o OWNER dela. (O scan é global por desenho — empresas alheias
    // podem receber o aviso mensal do mesmo jeito que receberiam às 07:00.)
    const ontem = new Date();
    ontem.setHours(0, 0, 0, 0);
    ontem.setDate(ontem.getDate() - 3);
    await prisma.financeEntry.create({
      data: {
        companyId: admin.f.companyId, type: "INCOME", status: "PENDING",
        description: "Conta vencida do teste de cron", amount: "150.00", dueDate: ontem,
      },
    });

    const res = await app.inject({
      method: "POST", url: "/api/ops/jobs/contas-vencidas/run", headers: auth(admin.token),
    });
    expect(res.statusCode).toBe(200);
    const corpo = res.json();
    expect(corpo.status).toBe("ok");
    expect(typeof corpo.mensagem).toBe("string");
    expect(corpo.job.ultimaExecucao).not.toBeNull();
    expect(corpo.job.ultimoStatus).toBe("ok");
    expect(corpo.job.duracaoMs).toBeGreaterThanOrEqual(0);

    const aviso = await prisma.notification.findFirst({
      where: { companyId: admin.f.companyId, userId: admin.f.userId, kind: "billing", dedupeKey: { startsWith: "vencida:" } },
    });
    expect(aviso).not.toBeNull();
  });

  it("estoque abaixo do mínimo gera um resumo por empresa, e o relatório diário respeita a preferência", async () => {
    await prisma.product.create({
      data: {
        companyId: admin.f.companyId, name: "Produto crítico do teste de cron",
        sku: "cron-test-1", salePrice: "10.00", stockQuantity: "2", minStock: "5",
      },
    });
    const estoque = await app.inject({
      method: "POST", url: "/api/ops/jobs/estoque-baixo/run", headers: auth(admin.token),
    });
    expect(estoque.statusCode).toBe(200);
    expect(estoque.json().status).toBe("ok");
    const avisoEstoque = await prisma.notification.findFirst({
      where: { companyId: admin.f.companyId, userId: admin.f.userId, kind: "stock", dedupeKey: { startsWith: "estoque-baixo:" } },
    });
    expect(avisoEstoque).not.toBeNull();

    // Relatório diário: sem preferência salva, dailyReport é DESLIGADA por
    // padrão — quem não pediu não recebe. Vendendo ontem, mesmo assim nada.
    const ontemMeio = new Date();
    ontemMeio.setHours(12, 0, 0, 0);
    ontemMeio.setDate(ontemMeio.getDate() - 1);
    await prisma.sale.create({
      data: { companyId: admin.f.companyId, userId: admin.f.userId, status: "CONFIRMED", total: "90.00", createdAt: ontemMeio },
    });
    const semPedir = await app.inject({
      method: "POST", url: "/api/ops/jobs/relatorio-diario/run", headers: auth(admin.token),
    });
    expect(semPedir.statusCode).toBe(200);
    const semAviso = await prisma.notification.findFirst({
      where: { companyId: admin.f.companyId, userId: admin.f.userId, kind: "report", dedupeKey: { startsWith: "relatorio-diario:" } },
    });
    expect(semAviso).toBeNull();

    // Agora a pessoa liga o relatório nas preferências e a rotina passa a entregar.
    await app.inject({
      method: "PUT", url: "/api/notifications/preferences", headers: auth(admin.token),
      payload: {
        saleAlerts: true, lowStock: true, dailyReport: true, overdueBills: true,
        newLead: true, emailChannel: false, inAppChannel: true,
      },
    });
    const comPedido = await app.inject({
      method: "POST", url: "/api/ops/jobs/relatorio-diario/run", headers: auth(admin.token),
    });
    expect(comPedido.statusCode).toBe(200);
    const comAviso = await prisma.notification.findFirst({
      where: { companyId: admin.f.companyId, userId: admin.f.userId, kind: "report", dedupeKey: { startsWith: "relatorio-diario:" } },
    });
    expect(comAviso).not.toBeNull();
    expect(comAviso!.title).toMatch(/^Relatório de \d{2}\/\d{2}\/\d{4}$/);
    expect(comAviso!.body).toContain("1 venda confirmada");
  });

  it("rotina fantasma não roda (404) e a trilha da plataforma viu as corridas manuais", async () => {
    const fantasma = await app.inject({
      method: "POST", url: "/api/ops/jobs/nao-existe/run", headers: auth(admin.token),
    });
    expect(fantasma.statusCode).toBe(404);
    // Rotina é da plataforma: a varredura atravessa todas as empresas, então o
    // evento não pode pertencer a nenhuma. A empresa do token fica como origem.
    const auditados = await prisma.auditLog.findMany({
      where: {
        userId: admin.f.userId,
        action: { in: ["cron.job.run", "cron.job.updated"] },
        scope: "platform",
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    expect(auditados.some((a) => a.action === "cron.job.run")).toBe(true);
    expect(auditados.some((a) => a.action === "cron.job.updated")).toBe(true);
    expect(auditados.length).toBeGreaterThan(1);
    expect(auditados.every((a) => a.companyId === null)).toBe(true);
    expect(auditados.every((a) => origemDaSessao(a.metadata) === admin.f.companyId)).toBe(true);
  });
});
