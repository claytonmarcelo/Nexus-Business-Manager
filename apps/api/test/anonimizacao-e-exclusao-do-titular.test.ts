import { afterAll, describe, expect, it } from "vitest";
import { app, cleanup, login, makeAccount, type Fixture } from "./helpers";
import { prisma } from "../src/lib/prisma";
import { sensivelWhere } from "../src/lib/audit";

// T6.4 (F7), item 5 do PROMPT MESTRE: "anonimizacao e exclusao do titular".
//
// O direito de eliminacao (LGPD art. 18, VI) e o que a casa menos gosta de
// implementar, porque apagar e facil demais: apagar a conta de quem lancou uma
// venda de 2023 destroi o documento que a lei obriga a guardar por cinco anos.
// O que este arquivo amarra e a linha exata entre os dois excessos — nem "nao
// apagamos nada porque temos medo", nem "apagamos tudo inclusive o que nao e da
// pessoa". Na ordem:
//  1. nenhuma das duas portas responde sem token, e nenhuma aceita pedido sem senha;
//  2. anonimizar leva embora nome, endereco, telefone, avatar, segundo fator e
//     sessoes, e ainda fecha a porta de entrada da conta;
//  3. o que e documento de negocio e trilha de auditoria continua la, com o mesmo
//     conteudo — a anonimizacao nao reescreve a historia fiscal da empresa;
//  4. excluir apaga a linha da pessoa, e os documentos sobrevivem sem referencia a
//     ninguem (SET NULL das chaves de negocio), inclusive a linha da trilha que
//     conta o proprio pedido;
//  5. as guardas: quem e o ultimo OWNER de uma casa ativa nao sai sem antes
//     transferir a propriedade, uma casa dormente nao segura ninguem, e a conta da
//     plataforma nao se elimina por aqui — a regra de acesso do dono do sistema
//     esta acima de qualquer pedido;
//  6. cada exercicio, cada recusa e cada senha que nao confere fica na trilha, e
//     aparece na aba de alteracoes sensiveis.

const ANONIMIZAR = "/api/lgpd/minha-conta/anonimizar";
const EXCLUIR = "/api/lgpd/minha-conta/excluir";

type Resultado = {
  feito: true;
  direito: string;
  em: string;
  identidade?: { nome: string; email: string };
  apagado: Record<string, number>;
  preservado: Record<string, number>;
  guarda: Array<{ item: string; motivo: string }>;
  aviso: string;
};

const trilha = { userIds: [] as string[], companyIds: [] as string[], emails: [] as string[] };

function registra(f: Fixture): Fixture {
  trilha.userIds.push(f.userId);
  trilha.companyIds.push(f.companyId);
  trilha.emails.push(f.email);
  return f;
}

// Cada caso no seu endereco IP: as duas portas tem limite proprio de tres pedidos
// por minuto, e um caso que tenta quatro vezes do mesmo lugar mediria o rate-limit
// em vez da regra de conta. O teto em si e provado no ultimo caso.
let ipSeq = 0;
function novoIp(): string {
  ipSeq += 1;
  return "10.88." + Math.floor(ipSeq / 254) + "." + (ipSeq % 254) + ".9";
}

function pedir(url: string, token: string, senha: string, ip = novoIp()) {
  return app.inject({
    method: "POST",
    url,
    remoteAddress: ip,
    headers: { authorization: `Bearer ${token}` },
    payload: { senha },
  });
}

function mensagem(res: { json(): unknown }): string {
  return String((res.json() as { message?: string }).message ?? "");
}

/** A conta com documento de negocio, aviso, aceite, sessao e trilha — o quadro que
 *  a eliminacao tem de partir ao meio: a pessoa sai, o papel da empresa fica. */
async function montarCena(f: Fixture) {
  await prisma.financeEntry.create({
    data: {
      companyId: f.companyId,
      userId: f.userId,
      type: "EXPENSE",
      description: "Lancamento da pessoa que vai sair",
      amount: "150.00",
      dueDate: new Date("2026-05-01"),
    },
  });
  await prisma.lead.create({
    data: { companyId: f.companyId, userId: f.userId, name: "Lead anotado pela pessoa" },
  });
  await prisma.notification.create({
    data: { userId: f.userId, companyId: f.companyId, kind: "teste", title: "Aviso da pessoa", priority: "LOW" },
  });
  await prisma.consentRecord.create({ data: { userId: f.userId, kind: "TERMS", version: 2, ip: "203.0.113.9" } });
  await prisma.auditLog.create({
    data: { userId: f.userId, companyId: f.companyId, action: "teste.acao-da-pessoa", entity: "user", entityId: f.userId },
  });
  return {
    lancamentos: await prisma.financeEntry.count({ where: { userId: f.userId } }),
    leads: await prisma.lead.count({ where: { userId: f.userId } }),
    avisos: await prisma.notification.count({ where: { userId: f.userId } }),
    aceites: await prisma.consentRecord.count({ where: { userId: f.userId } }),
    trilha: await prisma.auditLog.count({ where: { userId: f.userId } }),
  };
}

/** Coloca um segundo OWNER na casa de quem vai sair: sem isso a guarda de ultimo
 *  dono barria o pedido, e o caso quer medir outra coisa. O vinculo e criado na casa
 *  indicada — o sucessor tem empresa propria dele, e atualizar o vinculo daquela
 *  empresa nao colocaria ninguem aqui. */
async function terSucessor(companyId: string) {
  const sucessor = registra(await makeAccount("STAFF"));
  await prisma.companyUser.create({
    data: { userId: sucessor.userId, companyId, role: "OWNER" },
  });
  return sucessor;
}

afterAll(async () => {
  await prisma.consentRecord.deleteMany({ where: { userId: { in: trilha.userIds } } });
  await cleanup(trilha);
});

describe("Anonimizacao e exclusao do titular (F7, LGPD art. 18, VI)", () => {
  it("nenhuma das duas portas responde sem token", async () => {
    for (const url of [ANONIMIZAR, EXCLUIR]) {
      const res = await app.inject({ method: "POST", url, payload: { senha: "SenhaForte123!" } });
      expect(res.statusCode, url).toBe(401);
    }
  });

  it("sem a senha que confere, nada muda e a recusa fica na trilha", async () => {
    const f = registra(await makeAccount("ADMIN"));
    const token = await login(f.email, f.password);

    const res = await pedir(ANONIMIZAR, token, "SenhaErrada123!");
    expect(res.statusCode).toBe(400);

    const depois = await prisma.user.findUniqueOrThrow({ where: { id: f.userId } });
    expect(depois.anonymizedAt).toBeNull();
    expect(depois.name).toBe("Teste");
    expect(depois.email).toBe(f.email);
    expect(depois.active).toBe(true);
    // A porta de entrada continua aberta para quem sabe a senha.
    expect(await login(f.email, f.password)).toBeTypeOf("string");

    const recusa = await prisma.auditLog.findFirst({ where: { userId: f.userId, action: "lgpd.anonymize.failed" } });
    expect(recusa, "a senha que nao confere tem de ficar registrada").not.toBeNull();
  });

  it("pedir sem campo de senha nao elimina ninguem", async () => {
    const f = registra(await makeAccount("STAFF"));
    const token = await login(f.email, f.password);
    const res = await app.inject({
      method: "POST",
      url: EXCLUIR,
      remoteAddress: novoIp(),
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    expect(await prisma.user.findUnique({ where: { id: f.userId } })).not.toBeNull();
  });

  it("a anonimizacao leva embora o que identifica a pessoa e fecha a porta de entrada", async () => {
    const f = registra(await makeAccount("STAFF"));
    await prisma.user.update({
      where: { id: f.userId },
      data: { name: "Marcelo Titular", phone: "11 90000-0002", avatarUrl: "https://exemplo.test/a.png" },
    });
    const token = await login(f.email, f.password);

    const res = await pedir(ANONIMIZAR, token, f.password);
    expect(res.statusCode, res.body).toBe(200);
    const corpo = res.json() as Resultado;
    expect(corpo.feito).toBe(true);
    expect(corpo.direito).toBe("anonimizacao");
    expect(Date.parse(corpo.em)).not.toBeNaN();

    const depois = await prisma.user.findUniqueOrThrow({ where: { id: f.userId } });
    expect(depois.name).toBe("Titular anonimizado");
    expect(depois.phone).toBeNull();
    expect(depois.avatarUrl).toBeNull();
    expect(depois.active).toBe(false);
    expect(depois.anonymizedAt).not.toBeNull();
    // O endereco novo e um numero de protocolo, nao uma caixa postal: `.invalid`
    // e o dominio que a RFC 6761 reserva para "nao resolve em lugar nenhum".
    expect(depois.email).toBe(corpo.identidade!.email);
    expect(depois.email.endsWith("@invalid")).toBe(true);
    expect(depois.email).not.toBe(f.email);
    expect(await prisma.user.count({ where: { email: f.email } })).toBe(0);

    // Segundo fator zerado: sobra um id sem nome nenhum atraves dele.
    expect(depois.totpSecretCiphertext).toBeNull();
    expect(depois.totpEnabledAt).toBeNull();

    // Nem a senha antiga, nem nenhuma outra, abrem esta conta de novo.
    const tentativa = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: novoIp(),
      payload: { email: f.email, password: f.password },
    });
    expect(tentativa.statusCode).toBe(401);

    // E o token que ainda estava vivo no bolso da pessoa para de servir: a conta
    // desativada e conferida na mesma consulta do vinculo (A5).
    const leitura = await app.inject({
      method: "GET",
      url: "/api/lgpd/meus-dados",
      remoteAddress: novoIp(),
      headers: { authorization: `Bearer ${token}` },
    });
    expect(leitura.statusCode).toBe(403);
  });

  it("a anonimizacao fecha sessoes, come codigos e apaga a contagem do endereco antigo", async () => {
    const f = registra(await makeAccount("MANAGER"));
    const token = await login(f.email, f.password);
    await prisma.passwordResetToken.create({
      data: { userId: f.userId, tokenHash: "hash-de-prova-" + f.userId, expiresAt: new Date(Date.now() + 6e5) },
    });
    await prisma.emailVerificationToken.create({
      data: { userId: f.userId, tokenHash: "hash-de-confirmacao-" + f.userId, expiresAt: new Date(Date.now() + 6e5) },
    });
    await prisma.loginAttempt.create({
      data: { email: f.email.toLowerCase(), failures: 3, firstFailedAt: new Date(), lastFailedAt: new Date() },
    });

    const res = await pedir(ANONIMIZAR, token, f.password);
    expect(res.statusCode, res.body).toBe(200);
    const corpo = res.json() as Resultado;

    expect(await prisma.refreshToken.count({ where: { userId: f.userId } })).toBe(0);
    expect(await prisma.passwordResetToken.count({ where: { userId: f.userId } })).toBe(0);
    expect(await prisma.emailVerificationToken.count({ where: { userId: f.userId } })).toBe(0);
    expect(await prisma.recoveryCode.count({ where: { userId: f.userId } })).toBe(0);
    expect(await prisma.notification.count({ where: { userId: f.userId } })).toBe(0);
    expect(await prisma.loginAttempt.count({ where: { email: f.email.toLowerCase() } })).toBe(0);
    expect(corpo.apagado.sessoes).toBeGreaterThan(0);
    expect(corpo.apagado.tentativasDeLogin).toBe(1);
    // A anonimizacao nao apaga a linha da conta nem os vinculos: e exatamente ai
    // que ela se separa da exclusao.
    expect(corpo.apagado.conta).toBe(0);
    expect(corpo.apagado.vinculos).toBe(0);
    expect(await prisma.companyUser.count({ where: { userId: f.userId } })).toBe(1);
  });

  it("documento de negocio e trilha de auditoria continuam la depois de anonimizar", async () => {
    const f = registra(await makeAccount("ADMIN"));
    const antes = await montarCena(f);
    const token = await login(f.email, f.password);

    const res = await pedir(ANONIMIZAR, token, f.password);
    expect(res.statusCode, res.body).toBe(200);
    const corpo = res.json() as Resultado;

    expect(corpo.preservado).toMatchObject({
      lancamentos: antes.lancamentos,
      leads: antes.leads,
      aceites: antes.aceites,
    });
    expect(await prisma.financeEntry.count({ where: { userId: f.userId } })).toBe(antes.lancamentos);
    expect(await prisma.lead.count({ where: { userId: f.userId } })).toBe(antes.leads);
    expect(await prisma.auditLog.count({ where: { userId: f.userId, action: "teste.acao-da-pessoa" } })).toBe(1);
    // O aceite continua provando o consentimento, sem o endereco de origem.
    expect(await prisma.consentRecord.count({ where: { userId: f.userId } })).toBe(antes.aceites);
    expect((await prisma.consentRecord.findFirstOrThrow({ where: { userId: f.userId } })).ip).toBeNull();
    expect((await prisma.financeEntry.findFirstOrThrow({ where: { userId: f.userId } })).description).toBe(
      "Lancamento da pessoa que vai sair",
    );
    // E o que fica, e por que fica, vem declarado na resposta.
    expect(corpo.guarda.length).toBeGreaterThan(0);
    for (const item of corpo.guarda) expect(item.motivo.length).toBeGreaterThan(10);
  });

  it("a exclusao apaga a pessoa e preserva o documento sem referencia a ninguem", async () => {
    const f = registra(await makeAccount("OWNER"));
    await terSucessor(f.companyId);
    const antes = await montarCena(f);
    const token = await login(f.email, f.password);

    const res = await pedir(EXCLUIR, token, f.password);
    expect(res.statusCode, res.body).toBe(200);
    const corpo = res.json() as Resultado;
    expect(corpo.direito).toBe("exclusao");
    expect(corpo.identidade).toBeUndefined();

    expect(await prisma.user.findUnique({ where: { id: f.userId } })).toBeNull();
    expect(await prisma.companyUser.count({ where: { userId: f.userId } })).toBe(0);
    expect(await prisma.refreshToken.count({ where: { userId: f.userId } })).toBe(0);
    expect(await prisma.notification.count({ where: { userId: f.userId } })).toBe(0);
    expect(await prisma.consentRecord.count({ where: { userId: f.userId } })).toBe(0);
    expect(await prisma.loginAttempt.count({ where: { email: f.email.toLowerCase() } })).toBe(0);
    expect(corpo.apagado.conta).toBe(1);
    expect(corpo.apagado.aceites).toBe(antes.aceites);

    // O papel da empresa nao e da pessoa: lancamento e lead seguem escritos, com o
    // campo de quem praticou a acao devolvido a null.
    const lancamento = await prisma.financeEntry.findFirstOrThrow({ where: { companyId: f.companyId } });
    expect(lancamento.userId).toBeNull();
    expect(lancamento.description).toBe("Lancamento da pessoa que vai sair");
    expect(await prisma.lead.count({ where: { companyId: f.companyId, userId: null } })).toBe(antes.leads);
    // A acao antiga da pessoa tambem sobrevive, anonimizada, na mesma trilha. A
    // conta é pela casa: a trilha de auditoria não é apagada junto da empresa (é o
    // que ela é — trilha), e uma asserção sem recorte de `companyId` mediria os
    // resíduos de toda rodada anterior no banco de prova.
    expect(
      await prisma.auditLog.count({ where: { companyId: f.companyId, action: "teste.acao-da-pessoa", userId: null } }),
    ).toBe(1);

    // A linha que conta o pedido sobrevive a pessoa, sem apontar para ela.
    const evento = await prisma.auditLog.findFirst({
      where: { companyId: f.companyId, action: "lgpd.delete", entityId: f.userId },
    });
    expect(evento, "a trilha tem de contar a exclusao mesmo depois dela").not.toBeNull();
    expect(evento!.userId).toBeNull();
    expect(evento!.scope).toBe("tenant");

    // O token que a pessoa tinha no bolso nao abre mais nada.
    const leitura = await app.inject({
      method: "GET",
      url: "/api/lgpd/meus-dados",
      remoteAddress: novoIp(),
      headers: { authorization: `Bearer ${token}` },
    });
    expect(leitura.statusCode).toBe(403);
  });

  it("quem e o ultimo OWNER de uma casa ativa nao sai sem transferir a propriedade antes", async () => {
    const f = registra(await makeAccount("OWNER"));
    await prisma.user.update({ where: { id: f.userId }, data: { name: "Dono Unico" } });
    const token = await login(f.email, f.password);

    for (const url of [ANONIMIZAR, EXCLUIR]) {
      const res = await pedir(url, token, f.password);
      expect(res.statusCode, url).toBe(409);
      expect(mensagem(res)).toContain("último responsável ativo");
    }

    const depois = await prisma.user.findUniqueOrThrow({ where: { id: f.userId } });
    expect(depois.name).toBe("Dono Unico");
    expect(depois.anonymizedAt).toBeNull();
    expect(depois.active).toBe(true);
    // A sessao continua de pe: recusar o pedido nao derruba quem o fez.
    expect(await prisma.refreshToken.count({ where: { userId: f.userId, revokedAt: null } })).toBeGreaterThan(0);

    const bloqueio = await prisma.auditLog.findFirst({ where: { userId: f.userId, action: "lgpd.delete.blocked" } });
    expect(bloqueio, "a recusa tem de ficar registrada com o motivo").not.toBeNull();
    expect(await prisma.auditLog.count({ where: { userId: f.userId, action: "lgpd.anonymize.blocked" } })).toBe(1);
  });

  it("uma casa com outro OWNER ativo libera o pedido, e a casa fica com dono", async () => {
    const f = registra(await makeAccount("OWNER"));
    const sucessor = await terSucessor(f.companyId);
    const token = await login(f.email, f.password);

    const res = await pedir(EXCLUIR, token, f.password);
    expect(res.statusCode, res.body).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: f.userId } })).toBeNull();
    expect(await prisma.companyUser.findFirstOrThrow({ where: { companyId: f.companyId } }).then((v) => v.userId)).toBe(
      sucessor.userId,
    );
  });

  it("empresa dormente nao segura pedido: a guarda so conta casa ativa", async () => {
    const f = registra(await makeAccount("OWNER"));
    // Segunda casa da mesma pessoa: ela e a ultima OWNER dela, mas a casa esta
    // adormecida — nao ha propriedade a transferir em empresa que nao opera.
    const dormente = await makeAccount("STAFF");
    trilha.userIds.push(dormente.userId);
    trilha.companyIds.push(dormente.companyId);
    trilha.emails.push(dormente.email);
    await prisma.company.update({ where: { id: dormente.companyId }, data: { active: false } });
    await prisma.companyUser.create({ data: { userId: f.userId, companyId: dormente.companyId, role: "OWNER" } });
    await terSucessor(f.companyId);

    const token = await login(f.email, f.password, f.companyId);
    const res = await pedir(ANONIMIZAR, token, f.password);
    expect(res.statusCode, res.body).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: f.userId } })).anonymizedAt).not.toBeNull();
  });

  it("a conta da plataforma nao se elimina por aqui, em nenhum dos dois caminhos", async () => {
    const f = registra(await makeAccount("OWNER", { plataforma: true }));
    const token = await login(f.email, f.password);

    for (const url of [ANONIMIZAR, EXCLUIR]) {
      const res = await pedir(url, token, f.password);
      expect(res.statusCode, url).toBe(403);
      expect(mensagem(res).toLowerCase()).toContain("conta da plataforma");
    }

    const depois = await prisma.user.findUniqueOrThrow({ where: { id: f.userId } });
    expect(depois.active).toBe(true);
    expect(depois.anonymizedAt).toBeNull();
    expect(depois.platformRole).toBe("SUPER_ADMIN");
    // A regra de acesso e medida onde vale: quem administra a instalacao continua
    // entrando, com a senha de sempre.
    expect(await login(f.email, f.password)).toBeTypeOf("string");
  });

  it("cada exercicio do direito aparece na aba de alteracoes sensiveis", async () => {
    const f = registra(await makeAccount("STAFF"));
    const token = await login(f.email, f.password);
    expect((await pedir(ANONIMIZAR, token, f.password)).statusCode).toBe(200);

    const acoes = (
      await prisma.auditLog.findMany({
        where: { companyId: f.companyId, AND: [sensivelWhere(), { action: { startsWith: "lgpd." } }] },
        select: { action: true },
      })
    ).map((l) => l.action);
    expect(acoes).toContain("lgpd.anonymize");

    const saindo = registra(await makeAccount("OWNER"));
    await terSucessor(saindo.companyId);
    const token2 = await login(saindo.email, saindo.password);
    expect((await pedir(EXCLUIR, token2, saindo.password)).statusCode).toBe(200);
    expect(
      await prisma.auditLog.count({ where: { companyId: saindo.companyId, AND: [sensivelWhere(), { action: "lgpd.delete" }] } }),
    ).toBe(1);
    // A recusa tambem e alteracao sensivel: ela conta uma decisao sobre dado pessoal.
    const bloqueada = registra(await makeAccount("OWNER"));
    const token3 = await login(bloqueada.email, bloqueada.password);
    expect((await pedir(EXCLUIR, token3, bloqueada.password)).statusCode).toBe(409);
    expect(
      await prisma.auditLog.count({
        where: { companyId: bloqueada.companyId, AND: [sensivelWhere(), { action: "lgpd.delete.blocked" }] },
      }),
    ).toBe(1);
  });

  it("o teto de tres pedidos por minuto por endereco vale nas duas portas", async () => {
    const f = registra(await makeAccount("STAFF"));
    const token = await login(f.email, f.password);
    const ip = novoIp();
    const codigos: number[] = [];
    for (let i = 0; i < 4; i++) codigos.push((await pedir(ANONIMIZAR, token, "SenhaErrada123!", ip)).statusCode);
    expect(codigos.slice(0, 3)).toEqual([400, 400, 400]);
    expect(codigos[3]).toBe(429);

    const ipExclusao = novoIp();
    const codigosEx = [];
    for (let i = 0; i < 4; i++) codigosEx.push((await pedir(EXCLUIR, token, "SenhaErrada123!", ipExclusao)).statusCode);
    expect(codigosEx.slice(0, 3)).toEqual([400, 400, 400]);
    expect(codigosEx[3]).toBe(429);

    // A conta segue inteira: o teto existe para proteger o pedido, nao para
    // executar uma eliminacao na terceira tentativa.
    expect((await prisma.user.findUniqueOrThrow({ where: { id: f.userId } })).anonymizedAt).toBeNull();
  });
});
