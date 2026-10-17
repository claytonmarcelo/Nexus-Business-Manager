import { afterAll, describe, expect, it } from "vitest";
import { app, cleanup, login, makeAccount, uid, type Fixture } from "./helpers";
import { prisma } from "../src/lib/prisma";

// T6.3 (F7), item 2 do PROMPT MESTRE: "exportacao dos dados do titular".
//
// O direito de acesso (LGPD art. 18, II) e o de nao ter que pedir de bandeja em
// pedacos: a pessoa pede, o sistema devolve JSON com o que ele guarda sobre ela.
// O que este arquivo amarra, na ordem:
//  1. a porta e autenticada — sem token nao ha resposta;
//  2. a saida e o cadastro da PROPRIA pessoa, com os campos que a lei pede
//     (identificacao, contatos, aceite, sessoes, avisos, trilha de acoes);
//  3. credencial nenhuma sai — hash de senha, segredo do segundo fator e hash de
//     token de sessao ficam de fora por construcao, nao por sorte;
//  4. a trilha de auditoria e dos avisos sao so da pessoa que pediu: o colega da
//     mesma empresa, que tambem agiu e tambem recebeu aviso, nao aparece;
//  5. o pedido na empresa A nao traz nada da empresa B, e a resposta diz em que
//     empresa foi montada;
//  6. o que nao pode ser entregue esta declarado no proprio corpo, com o motivo.

const auth = (token: string) => ({ authorization: `Bearer ${token}` });
const URL = "/api/lgpd/meus-dados";

type Resposta = Record<string, unknown> & {
  geradoEm: string;
  aviso: string;
  titular: Record<string, unknown>;
  empresaAtiva: { id: string; nome: string; papel: string };
  vinculos: Array<{ empresa: string; papel: string }>;
  aceites: Array<{ tipo: string; versao: number; aceitoEm: string; ip: string | null }>;
  sessoes: Array<Record<string, unknown>>;
  notificacoes: Array<{ titulo: string }>;
  preferenciasDeAviso: Record<string, unknown> | null;
  trilhaDeAuditoria: { total: number; eventos: Array<{ id: string; acao: string }> };
  tentativasDeLogin: Array<{ email: string; falhas: number }>;
  naoIncluidos: Array<{ campo: string; motivo: string }>;
};

const trilha = { userIds: [] as string[], companyIds: [] as string[], emails: [] as string[] };

function rastrear(f: Fixture) {
  trilha.userIds.push(f.userId);
  trilha.companyIds.push(f.companyId);
  trilha.emails.push(f.email);
  return f;
}

async function exportar(token: string) {
  return app.inject({ method: "GET", url: URL, headers: auth(token) });
}

describe("Exportacao dos dados do titular (F7, LGPD art. 18)", () => {
  it("sem token nao ha resposta", async () => {
    const res = await app.inject({ method: "GET", url: URL });
    expect(res.statusCode).toBe(401);
  });

  it("o titular recebe o proprio cadastro, e credencial nenhuma sai junto", async () => {
    const f = rastrear(await makeAccount("OWNER"));
    await prisma.user.update({
      where: { id: f.userId },
      data: { name: "Marcelo Titular", phone: "11 90000-0001", avatarUrl: "https://exemplo.test/a.png" },
    });
    // A contagem de tentativas e chaveada pelo endereco, nao pela conta (e assim
    // desde a F4, para bloquear quem testa e-mail inexistente sem denunciar quais
    // existem). Para a pessoa que pede, e dado dela: o endereco e o historico.
    // Escrita DEPOIS do login: a rota de autenticacao limpa a linha de quem
    // conseguiu entrar, e um fixture criado antes dela seria apagado pelo proprio
    // setup — a prova sairia vazia por motivo de teste, não de código.
    const token = await login(f.email, f.password);
    await prisma.loginAttempt.create({
      data: { email: f.email.toLowerCase(), failures: 2, firstFailedAt: new Date(), lastFailedAt: new Date() },
    });

    const res = await exportar(token);
    expect(res.statusCode).toBe(200);
    const corpo = res.json() as Resposta;

    expect(corpo.titular).toMatchObject({
      id: f.userId,
      nome: "Marcelo Titular",
      email: f.email,
      telefone: "11 90000-0001",
      avatarUrl: "https://exemplo.test/a.png",
      contaAtiva: true,
    });
    expect(corpo.empresaAtiva).toMatchObject({ id: f.companyId, papel: "OWNER" });
    expect(corpo.geradoEm).toBeTypeOf("string");
    expect(Date.parse(corpo.geradoEm)).not.toBeNaN();
    expect(corpo.aviso).toBeTypeOf("string");
    expect(corpo.tentativasDeLogin).toMatchObject([{ email: f.email.toLowerCase(), falhas: 2 }]);

    // O que NAO pode sair, medido no texto da resposta inteira: hash de senha,
    // segredo do segundo fator (mesmo cifrado), hash de refresh token e os
    // codigos de recuperacao. A coluna existe no banco; a saida e que nao mostra.
    const corpoBruto = JSON.stringify(corpo);
    for (const proibido of ["passwordHash", "totpSecret", "tokenHash", "recoveryCode"]) {
      expect(corpoBruto, `o campo ${proibido} apareceu na saida`).not.toContain(proibido);
    }
    const hashReal = await prisma.user.findUniqueOrThrow({
      where: { id: f.userId },
      select: { passwordHash: true },
    });
    expect(corpoBruto).not.toContain(hashReal.passwordHash.slice(0, 12));
  });

  it("os aceites de cadastro saem com tipo, versao, data e o endereco de origem", async () => {
    const f = rastrear(await makeAccount("STAFF"));
    await prisma.consentRecord.createMany({
      data: [
        { userId: f.userId, kind: "TERMS", version: 3, ip: "198.51.100.7" },
        { userId: f.userId, kind: "PRIVACY", version: 2, ip: null },
      ],
    });
    const token = await login(f.email, f.password);

    const corpo = (await exportar(token)).json() as Resposta;
    const porTipo = new Map(corpo.aceites.map((a) => [a.tipo, a]));
    expect([...porTipo.keys()].sort()).toEqual(["PRIVACY", "TERMS"]);
    expect(porTipo.get("TERMS")).toMatchObject({ versao: 3, ip: "198.51.100.7" });
    expect(Date.parse(porTipo.get("TERMS")!.aceitoEm)).not.toBeNaN();
    expect(porTipo.get("PRIVACY")).toMatchObject({ versao: 2, ip: null });
  });

  it("as sessoes da pessoa aparecem para ela, sem o hash do token", async () => {
    const f = rastrear(await makeAccount("ADMIN"));
    const token = await login(f.email, f.password);
    const linha = await prisma.refreshToken.findFirstOrThrow({ where: { userId: f.userId } });

    const corpo = (await exportar(token)).json() as Resposta;
    expect(corpo.sessoes.length).toBeGreaterThan(0);
    expect(corpo.sessoes[0]).toMatchObject({
      criadaEm: expect.any(String),
      expiraEm: expect.any(String),
      ipOrigem: expect.anything(),
    });
    expect(corpo.sessoes.some((s) => Object.values(s).includes(linha.tokenHash))).toBe(false);
  });

  it("a trilha de auditoria e os avisos sao da pessoa que pediu, nunca do colega", async () => {
    const dono = rastrear(await makeAccount("OWNER"));
    const colega = rastrear(await makeAccount("STAFF"));
    // O colega entra na MESMA empresa do dono: é o vizinho de corredor, o caso que
    // separa "meus dados" de "dados de quem trabalha comigo".
    await prisma.companyUser.create({
      data: { userId: colega.userId, companyId: dono.companyId, role: "STAFF" },
    });

    for (const [userId, etiqueta] of [
      [dono.userId, "dono"],
      [colega.userId, "colega"],
    ] as const) {
      await prisma.auditLog.create({
        data: { userId, companyId: dono.companyId, action: `teste.${etiqueta}`, entity: "user", entityId: userId },
      });
      await prisma.notification.create({
        data: { userId, companyId: dono.companyId, kind: "teste", title: `Aviso do ${etiqueta}`, priority: "LOW" },
      });
    }

    const token = await login(dono.email, dono.password);

    // O total vem do banco, não do recorte: o teto de eventos é declarado no corpo.
    // Medido ANTES do pedido, porque o próprio pedido escreve um evento na trilha
    // que se conta — a resposta não pode prometer um total que já era velho quando
    // foi montada.
    const eventosNoBanco = await prisma.auditLog.count({ where: { userId: dono.userId } });
    const corpo = (await exportar(token)).json() as Resposta;

    expect(corpo.trilhaDeAuditoria.total).toBe(eventosNoBanco);
    expect(corpo.trilhaDeAuditoria.eventos.map((e) => e.acao)).toContain("teste.dono");
    expect(corpo.trilhaDeAuditoria.eventos.map((e) => e.acao)).not.toContain("teste.colega");
    expect(corpo.notificacoes.map((n) => n.titulo)).toContain("Aviso do dono");
    expect(corpo.notificacoes.map((n) => n.titulo)).not.toContain("Aviso do colega");
  });

  it("o pedido na empresa A não traz nada da empresa B", async () => {
    const a = rastrear(await makeAccount("OWNER"));
    const b = rastrear(await makeAccount("OWNER"));
    await prisma.notification.create({
      data: { userId: b.userId, companyId: b.companyId, kind: "teste", title: "Aviso da empresa B", priority: "LOW" },
    });
    await prisma.auditLog.create({
      data: { userId: b.userId, companyId: b.companyId, action: "teste.empresa-b", entity: "user" },
    });

    const tokenA = await login(a.email, a.password, a.companyId);
    const corpo = (await exportar(tokenA)).json() as Resposta;

    expect(corpo.empresaAtiva.id).toBe(a.companyId);
    expect(corpo.notificacoes.map((n) => n.titulo)).not.toContain("Aviso da empresa B");
    expect(corpo.trilhaDeAuditoria.eventos.map((e) => e.acao)).not.toContain("teste.empresa-b");
    // Os vinculos dizem em que casas a pessoa está, e param ai: nem um registro de
    // negocio da outra casa acompanha a lista.
    expect(corpo.vinculos.map((v) => v.empresa)).not.toContain(
      (await prisma.company.findUniqueOrThrow({ where: { id: b.companyId } })).name,
    );
    expect(corpo.vinculos.length).toBe(1);
  });

  it("as preferencias de aviso da empresa ativa vem junto", async () => {
    const f = rastrear(await makeAccount("MANAGER"));
    await prisma.notificationPreference.create({
      data: { userId: f.userId, companyId: f.companyId, saleAlerts: false, dailyReport: true },
    });
    const token = await login(f.email, f.password);

    const corpo = (await exportar(token)).json() as Resposta;
    expect(corpo.preferenciasDeAviso).toMatchObject({ alertasDeVenda: false, relatorioDiario: true });

    // Sem linha de preferencia, a resposta diz "nenhuma", em vez de inventar padrão.
    const sem = rastrear(await makeAccount("STAFF"));
    const tokenSem = await login(sem.email, sem.password);
    expect(((await exportar(tokenSem)).json() as Resposta).preferenciasDeAviso).toBeNull();
  });

  it("o que nao pode ser entregue esta declarado no corpo, com o motivo", async () => {
    const f = rastrear(await makeAccount("OWNER"));
    const token = await login(f.email, f.password);
    const corpo = (await exportar(token)).json() as Resposta;

    expect(corpo.naoIncluidos.length).toBeGreaterThan(0);
    const campos = corpo.naoIncluidos.map((n) => n.campo);
    expect(campos).toContain("senha e segundo fator");
    for (const item of corpo.naoIncluidos) {
      expect(item.motivo.length).toBeGreaterThan(10);
    }
  });

  it("a exportacao fica na trilha de auditoria como o que foi", async () => {
    const f = rastrear(await makeAccount("OWNER"));
    const token = await login(f.email, f.password);
    const antes = await prisma.auditLog.count({ where: { userId: f.userId, action: "lgpd.export" } });

    expect((await exportar(token)).statusCode).toBe(200);
    const depois = await prisma.auditLog.count({ where: { userId: f.userId, action: "lgpd.export" } });
    expect(depois).toBe(antes + 1);
    const linha = await prisma.auditLog.findFirstOrThrow({
      where: { userId: f.userId, action: "lgpd.export" },
      orderBy: { createdAt: "desc" },
    });
    expect(linha.companyId).toBe(f.companyId);
    expect(linha.scope).toBe("tenant");
    expect(linha.entity).toBe("user");
  });
});

afterAll(async () => {
  await prisma.consentRecord.deleteMany({ where: { userId: { in: trilha.userIds } } });
  await cleanup(trilha);
});
