import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import {
  calendarioDaEmpresa,
  diaNoFuso,
  isValidoFuso,
  meiaNoiteNoFuso,
  mesNoFuso,
  ontemNoFuso,
} from "../src/lib/time";
import { app, makeAccount, login, cleanup, uid } from "./helpers";
import { jobPorSlug } from "../src/modules/cron/cron.handlers";
import {
  obterPreferencias,
  salvarPreferencias,
  varreduraEmpresa,
} from "../src/modules/notifications/notifications.service";

// Fase 3c da auditoria: a meia-noite passou a ser da empresa, não do servidor.
// Antes, "hoje" e "deste mês" eram lidos do relógio do datacenter — para uma
// empresa em America/Sao_Paulo isso quer dizer que, depois das 21h UTC, o
// movimento do dia corrente já tinha caído fora do mês agregado do relatório, a
// conta que vence hoje acordava avisada como vencida e o fechamento "de ontem"
// da rotina era o ontem de Greenwich.
//
// Duas bordas, porque duas espécies de coluna: meia-noite DO FUSO para as de
// instante (createdAt, startAt) e dia de CALENDÁRIO para as `@db.Date`
// (dueDate), que o banco guarda à meia-noite UTC.
//
// Os instantes abaixo são datados a partir de hoje e as etiquetas esperadas são
// calculadas À MÃO (offset -3 para São Paulo, +9 para Tóquio, +5:30 para
// Calcutá — constantes nesses dias do ano) em vez de chamadas no próprio
// helper, senão a regra estaria conferindo a si mesma.

const DIA = 86_400_000;
const HORA = 3_600_000;
const agora = new Date();

/** AAAA-MM-DD do instante visto com um offset fixo de fuso (conta à mão). */
function rotulo(utc: Date, offsetHoras: number): string {
  const d = new Date(utc.getTime() + offsetHoras * HORA);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** O dia de calendário `dias` antes de um rótulo AAAA-MM-DD (conta à mão). */
function rotuloAntes(iso: string, dias: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) - dias * DIA).toISOString().slice(0, 10);
}

/** O instante UTC em que o dia do rótulo começa naquele fuso (conta à mão). */
function meiaNoiteDe(iso: string, offsetHoras: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) - offsetHoras * HORA).toISOString();
}

const br = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

const hojeSp = rotulo(agora, -3);
const ontemSp = rotuloAntes(hojeSp, 1);
const SP = -3;
// Ontem à noite do fuso: 21:30UTC de ontem local — em São Paulo já é o dia
// seguinte, em Greenwich ainda é ontem, e é exatamente essa a janela que a
// regra tinha que passar a respeitar.
const noiteDeOntem = new Date(`${ontemSp}T21:30:00Z`);
const meioDaManhaSp = new Date(`${hojeSp}T12:00:00Z`); // 09:00 de hoje em São Paulo
const auth = (token: string) => ({ authorization: `Bearer ${token}` });

describe("Meia-noite no fuso da empresa (Fase 3c)", () => {
  const created: { userIds: string[]; companyIds: string[] } = { userIds: [], companyIds: [] };
  afterAll(async () => {
    await cleanup(created);
    await app.close();
  });

  async function empresa(timezone: string) {
    const f = await makeAccount("OWNER");
    await prisma.company.update({ where: { id: f.companyId }, data: { timezone } });
    created.userIds.push(f.userId);
    created.companyIds.push(f.companyId);
    return { f, token: await login(f.email, f.password) };
  }

  async function relatorioSales(token: string, qs = "") {
    return (await (
      await app.inject({ method: "GET", url: `/api/reports/sales${qs}`, headers: auth(token) })
    ).json()) as {
      de: string; ate: string; receita: number; pedidos: number;
      porDia: { dia: string; receita: number; pedidos: number }[];
    };
  }

  describe("a regra, escrita uma vez", () => {
    it("a meia-noite de São Paulo são 03:00 UTC e o dia lá vira às 21:00 UTC", () => {
      // Naquela noite a empresa já está no dia de hoje, e a meia-noite desse dia
      // é 03:00UTC de hoje. O mesmo instante visto em UTC ainda é ontem; em
      // Tóquio, já era hoje desde as 15h do dia anterior.
      const diaSp = rotulo(noiteDeOntem, SP);
      expect(diaNoFuso("America/Sao_Paulo", noiteDeOntem)).toBe(diaSp);
      expect(diaNoFuso("UTC", noiteDeOntem)).toBe(rotulo(noiteDeOntem, 0));
      expect(diaNoFuso("Asia/Tokyo", noiteDeOntem)).toBe(rotulo(noiteDeOntem, 9));
      expect(meiaNoiteNoFuso("America/Sao_Paulo", noiteDeOntem).toISOString())
        .toBe(meiaNoiteDe(diaSp, SP));
      expect(meiaNoiteNoFuso("Asia/Tokyo", noiteDeOntem).toISOString())
        .toBe(meiaNoiteDe(rotulo(noiteDeOntem, 9), 9));
      // Fuso com meia hora de deslocamento: a regra não pode arredondar a hora.
      expect(meiaNoiteNoFuso("Asia/Kolkata", meioDaManhaSp).toISOString())
        .toBe(meiaNoiteDe(rotulo(meioDaManhaSp, 5.5), 5.5));
    });

    it("a hora do dia não muda o dia de calendário que a etiqueta devolve", () => {
      const manha = new Date(`${hojeSp}T10:00:00Z`); // 07:00 de hoje em SP
      const noite = new Date(`${hojeSp}T20:00:00Z`); // 17:00 de hoje em SP
      expect(diaNoFuso("America/Sao_Paulo", manha)).toBe(hojeSp);
      expect(diaNoFuso("America/Sao_Paulo", noite)).toBe(hojeSp);
      expect(mesNoFuso("America/Sao_Paulo", manha)).toBe(hojeSp.slice(0, 7));
      // As duas são a mesma meia-noite: o que importa é o dia, não a hora.
      expect(meiaNoiteNoFuso("America/Sao_Paulo", manha)).toEqual(
        meiaNoiteNoFuso("America/Sao_Paulo", noite),
      );
      // Uma manhã em São Paulo ainda é o dia anterior em Tóquio.
      expect(diaNoFuso("Asia/Tokyo", manha)).toBe(rotulo(manha, 9));
    });

    it("ontem é a virada anterior do fuso, e não 24 horas antes de uma meia-noite", () => {
      // Em São Paulo a meia-noite de ontem são 03:00UTC de ontem; em Tóquio,
      // 15:00UTC do dia antes do rótulo — lá o dia começa antes de Greenwich.
      // Andar por "meia-noite + 12h" em vez de subtrair 24h fixas é o que faz
      // as duas empresas fecharem o dia certo na rotina de relatório.
      expect(ontemNoFuso("America/Sao_Paulo", meioDaManhaSp).toISOString())
        .toBe(meiaNoiteDe(ontemSp, SP));
      const diaTokyo = rotulo(meioDaManhaSp, 9);
      expect(ontemNoFuso("Asia/Tokyo", meioDaManhaSp).toISOString())
        .toBe(meiaNoiteDe(rotuloAntes(diaTokyo, 1), 9));
      // A janela entre as duas é o dia fechado da empresa: 24h onde não há
      // horário de verão, e é essa largura que a rotina de relatório conta.
      expect(meiaNoiteNoFuso("America/Sao_Paulo", meioDaManhaSp).getTime()
        - ontemNoFuso("America/Sao_Paulo", meioDaManhaSp).getTime()).toBe(DIA);
    });

    it("a conta de calendário não é a conta de instante, e é dela que dueDate precisa", () => {
      // A meia-noite de São Paulo são 03:00UTC: se essa fosse a borda de uma
      // coluna @db.Date, o lançamento gravado como "hoje às 00:00UTC" cairia
      // antes dela e nasceria vencido três horas adiantado.
      const bordaInstante = meiaNoiteNoFuso("America/Sao_Paulo", meioDaManhaSp);
      const bordaCalendario = calendarioDaEmpresa("America/Sao_Paulo", meioDaManhaSp);
      expect(bordaCalendario.toISOString()).toBe(`${hojeSp}T00:00:00.000Z`);
      expect(bordaInstante.getTime() - bordaCalendario.getTime()).toBe(3 * HORA);
      expect(calendarioDaEmpresa("UTC", noiteDeOntem).toISOString())
        .toBe(`${rotulo(noiteDeOntem, 0)}T00:00:00.000Z`);
    });

    it("fuso quebrado no cadastro vira UTC em vez de derrubar o painel", () => {
      expect(isValidoFuso("Marte/Olympus_Mons")).toBe(false);
      const quebrado = new Date(`${hojeSp}T01:00:00Z`);
      expect(diaNoFuso("Marte/Olympus_Mons", quebrado)).toBe(rotulo(quebrado, 0));
      expect(() => meiaNoiteNoFuso("Marte/Olympus_Mons", quebrado)).not.toThrow();
      expect(calendarioDaEmpresa("Marte/Olympus_Mons", quebrado).toISOString())
        .toBe(`${rotulo(quebrado, 0)}T00:00:00.000Z`);
    });
  });

  it("a série diária agrupa o movimento no dia que a empresa vive", async () => {
    const paulo = await empresa("America/Sao_Paulo");
    const toquio = await empresa("Asia/Tokyo");
    // Uma venda de agora e outra da noite de ontem do fuso: para o servidor as
    // duas são dias seguidos, para cada empresa elas caem em dias próprios.
    const antiga = new Date(`${rotuloAntes(hojeSp, 2)}T21:30:00Z`);
    for (const c of [paulo, toquio]) {
      await prisma.sale.create({
        data: { companyId: c.f.companyId, status: "CONFIRMED", total: "40.00", createdAt: agora },
      });
      await prisma.sale.create({
        data: { companyId: c.f.companyId, status: "CONFIRMED", total: "10.00", createdAt: antiga },
      });
    }
    // Janela explícita de sete dias: o teste prova o balde do dia, não em que
    // dia do mês a gente acordou.
    const qs = `?de=${new Date(agora.getTime() - 3 * DIA).toISOString()}&ate=${new Date(agora.getTime() + DIA).toISOString()}`;

    // São Paulo: dois baldes — o de agora e o da noite de anteontem — com os
    // totais e a contagem de pedidos de cada um.
    const corpo = await relatorioSales(paulo.token, qs);
    expect(corpo.porDia).toEqual([
      { dia: rotulo(antiga, SP), receita: 10, pedidos: 1 },
      { dia: hojeSp, receita: 40, pedidos: 1 },
    ]);
    expect(corpo.receita).toBe(50);
    // A etiqueta dos extremos é lida no mesmo fuso dos baldes.
    expect(corpo.de).toBe(rotulo(new Date(agora.getTime() - 3 * DIA), SP));

    // Tóquio: o mesmo instante noturno pertence a outro dia de calendário dela.
    const tokyo = await relatorioSales(toquio.token, qs);
    expect(tokyo.porDia.map((d) => d.receita).sort()).toEqual([10, 40]);
    expect(tokyo.porDia.map((d) => d.dia)).toContain(rotulo(antiga, 9));

    // Sem janela pedida, o relatório abre no primeiro dia do MÊS da empresa e
    // fecha no último — antes abria e fechava no mês de Greenwich.
    const mes = await relatorioSales(paulo.token);
    // Dia 0 do mês seguinte no índice JS é o último dia do mês da empresa.
    const ultimoDiaDoMes = new Date(
      Date.UTC(Number(hojeSp.slice(0, 4)), Number(hojeSp.slice(5, 7)), 0),
    ).toISOString().slice(0, 10);
    expect(mes.de).toBe(`${hojeSp.slice(0, 7)}-01`);
    expect(mes.ate).toBe(ultimoDiaDoMes);
  });

  it("o painel fecha o mês da empresa com a venda do dia corrente", async () => {
    const paulo = await empresa("America/Sao_Paulo");
    await prisma.sale.create({
      data: { companyId: paulo.f.companyId, status: "CONFIRMED", total: "25.00", createdAt: agora },
    });
    const painel = (await (
      await app.inject({ method: "GET", url: "/api/reports/overview", headers: auth(paulo.token) })
    ).json()) as { periodo: string; vendas: { receita: number; pedidos: number } };
    expect(painel.periodo).toBe(hojeSp.slice(0, 7));
    expect(painel.vendas.pedidos).toBe(1);
    expect(painel.vendas.receita).toBe(25);
  });

  it("o resumo financeiro só chama de vencida a conta cujo dia na empresa passou", async () => {
    const paulo = await empresa("America/Sao_Paulo");
    const toquio = await empresa("Asia/Tokyo");
    // Cada empresa recebe duas contas no calendário DELA: uma que vence hoje e
    // uma que venceu ontem. Nas duas a de hoje tem que ficar fora do atraso —
    // com a meia-noite local como borda, a de hoje de São Paulo entrava.
    const corpo = async (token: string) => (await (
      await app.inject({ method: "GET", url: "/api/finance/summary", headers: auth(token) })
    ).json()) as { overdueCount: number; overdueAmount: number; month: string };

    for (const c of [paulo, toquio]) {
      const fuso = c === paulo ? SP : 9;
      const hoje = rotulo(agora, fuso);
      for (const [descricao, valor, dia] of [
        ["Vence hoje", "20.00", hoje],
        ["Vencida", "80.00", rotuloAntes(hoje, 1)],
      ] as const) {
        await prisma.financeEntry.create({
          data: { companyId: c.f.companyId, type: "INCOME", status: "PENDING",
            description: `${descricao} ${uid("e")}`, amount: valor,
            dueDate: new Date(`${dia}T00:00:00Z`) },
        });
      }
      const r = await corpo(c.token);
      expect(r.overdueCount).toBe(1);
      expect(r.overdueAmount).toBe(80);
      expect(r.month).toBe(hoje.slice(0, 7));
    }
  });

  it("o fluxo de caixa numera os baldes no calendário da empresa, sem repetir dia", async () => {
    const paulo = await empresa("America/Sao_Paulo");
    await prisma.financeEntry.create({
      data: { companyId: paulo.f.companyId, type: "INCOME", status: "PAID",
        description: "Venda de hoje " + uid("e"), amount: "12.00",
        dueDate: new Date(`${hojeSp}T00:00:00Z`), paidAt: agora },
    });
    await prisma.financeEntry.create({
      data: { companyId: paulo.f.companyId, type: "EXPENSE", status: "PAID",
        description: "Aluguel " + uid("e"), amount: "5.00",
        dueDate: new Date(`${ontemSp}T00:00:00Z`) },
    });
    const corpo = (await (
      await app.inject({ method: "GET", url: "/api/reports/finance?dias=7", headers: auth(paulo.token) })
    ).json()) as { fluxo: { dia: string; entradas: number; saidas: number; saldo: number }[] };

    const baldes = corpo.fluxo;
    expect(baldes).toHaveLength(7);
    // Sete dias corridos, o último sendo hoje da empresa, cada um uma vez só.
    const baldeDeHoje = baldes[6];
    const baldeDeOntem = baldes[5];
    expect(baldeDeHoje?.dia).toBe(hojeSp);
    expect(baldes.map((d) => d.dia)).toEqual(
      Array.from({ length: 7 }, (_, i) => rotuloAntes(hojeSp, 6 - i)),
    );
    expect(new Set(baldes.map((d) => d.dia)).size).toBe(7);
    expect(baldeDeHoje?.entradas).toBe(12);
    expect(baldeDeOntem?.saidas).toBe(5);
    expect(baldeDeHoje?.saldo).toBe(7);
  });

  it("a varredura de avisos respeita o fuso e não repete o aviso dentro do mês da empresa", async () => {
    const { f } = await empresa("America/Sao_Paulo");
    const dueDate = new Date(`${ontemSp}T00:00:00Z`); // venceu ontem NO CALENDÁRIO dela
    await prisma.financeEntry.create({
      data: { companyId: f.companyId, type: "EXPENSE", status: "PENDING",
        description: "Luz do mês " + uid("e"), amount: "30.00", dueDate },
    });

    // Varrida na manhã de HOJE da empresa: um dia de atraso, nem zero nem dois.
    expect(await varreduraEmpresa(f.companyId, new Date(`${hojeSp}T12:00:00Z`))).toBe(1);
    const aviso = await prisma.notification.findFirst({
      where: { companyId: f.companyId, kind: "billing" },
      orderBy: { createdAt: "desc" },
    });
    expect(aviso?.title).toMatch(/vencido há 1 dia$/);
    // A data do vencimento é a da coluna DATE, não a do relógio de Brasília.
    expect(aviso?.body).toContain(`venceu em ${br(ontemSp)}`);

    // No mesmo dia da empresa o aviso não se repete. No começo do mês a chave de
    // antiduplicação vira outro mês e o reaviso é o comportamento documentado —
    // nesse caso a contagem não prova nada sobre fuso, então não cobramos.
    const primeiraVarrida = new Date(`${hojeSp}T12:00:00Z`);
    const segundaVarrida = new Date(`${hojeSp}T15:00:00Z`);
    const segunda = await varreduraEmpresa(f.companyId, segundaVarrida);
    const varridasNoMesmoMes =
      mesNoFuso("America/Sao_Paulo", primeiraVarrida) === mesNoFuso("America/Sao_Paulo", segundaVarrida);
    if (varridasNoMesmoMes) expect(segunda).toBe(0);
    expect(segunda === 0 || segunda === 1).toBe(true);

    // Uma conta que vence HOJE não é atraso nenhum: foi exatamente esse o
    // regressivo que a borda antiga deixava passar às 21h de Brasília.
    await prisma.financeEntry.create({
      data: { companyId: f.companyId, type: "EXPENSE", status: "PENDING",
        description: "Água de hoje " + uid("e"), amount: "40.00",
        dueDate: new Date(`${hojeSp}T00:00:00Z`) },
    });
    const terceira = new Date(`${hojeSp}T23:30:00Z`); // 20:30 do MESMO dia em SP
    expect(await varreduraEmpresa(f.companyId, terceira)).toBe(0);
  });

  it("a rotina de relatório diário fecha o ontem do fuso de cada empresa", async () => {
    const job = jobPorSlug("relatorio-diario");
    expect(job).toBeDefined();
    if (!job) return;

    const { f } = await empresa("America/Sao_Paulo");
    await salvarPreferencias(f.userId, f.companyId, {
      ...(await obterPreferencias(f.userId, f.companyId)),
      dailyReport: true,
    });

    // Duas vendas do dia que a empresa já fechou (ontem, entre a virada de
    // 03:00UTC de ontem e a de hoje) e uma do dia corrente dela.
    for (const [total, criado] of [["10.00", `${ontemSp}T04:00:00Z`], ["15.00", `${ontemSp}T22:00:00Z`], ["99.00", `${hojeSp}T11:00:00Z`]] as const) {
      await prisma.sale.create({
        data: { companyId: f.companyId, status: "CONFIRMED", total, createdAt: new Date(criado) },
      });
    }

    const r = await job.handler(new Date(`${hojeSp}T12:00:00Z`));
    expect(r.detalhes.criadas).toBeGreaterThanOrEqual(1);

    const aviso = await prisma.notification.findFirst({
      where: { companyId: f.companyId, kind: "report" },
      orderBy: { createdAt: "desc" },
    });
    expect(aviso?.title).toBe(`Relatório de ${br(ontemSp)}`);
    expect(aviso?.body).toMatch(/^2 vendas confirmadas · R\$/);
    expect(aviso?.body).toMatch(/R\$ 25,00/);
    expect(aviso?.body).not.toMatch(/99/);
  });
});
