import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app, cleanup, makeAccount, uid, type Fixture } from "./helpers";
import { prisma } from "../src/lib/prisma";
import { hashToken } from "../src/lib/tokens";

// T3.5 (F4): a renovaçao de sessao entre duas abas abertas da mesma conta.
//
// O `refreshSession()` do front_end gira o refresh token a cada renovação: o
// token velho fica marcado `usedAt` + `revokedAt` no instante em que o par novo
// nasce. Isso é o que permite tratar reapresentação de token consumido como sinal
// de roubo — derrubando a família inteira. O problema é que duas abas renovam
// juntas: as duas saem com o mesmo token velho na mão antes de qualquer uma
// gravar o novo no navegador. Sem janela, a segunda aba legítima derrubava a
// própria pessoa de todas as sessões.
//
// As regras provadas aqui, na ordem:
//   1. dentro da janela a segunda aba renova normal, e a corrida fica registrada;
//   2. a corrida emite um par NOVO — não devolve o que a primeira aba já levou;
//   3. fora da janela a reapresentação continua sendo roubo: 401, auditoria de
//      reuso e nenhuma sessão viva da pessoa sobra de pé;
//   4. a janela não é um atalho para conta desativada;
//   5. revogação por decisão (logout) não confunde o alarme: ela só marca
//      `revokedAt`, e as outras sessões continuam vivas;
//   6. a corrida mantém a empresa ativa da sessão (A4), não a primeira empresa;
//   7. a janela é da rotação, não da conta: uma revogação por decisão (troca de
//      senha, logout) mata a linhagem que a gerou, e reapresentar o pai dentro
//      dos dez segundos seguintes não reabre sessão nenhuma.

/** Janela do serviço, repetida aqui de propósito: o teste é a régua do número. */
const JANELA_MS = 10_000;

let criado: { userIds: string[]; companyIds: string[]; emails: string[] } = {
  userIds: [],
  companyIds: [],
  emails: [],
};
let tokensAntes = 0;

function registrou(f: Fixture): Fixture {
  criado.userIds.push(f.userId);
  criado.companyIds.push(f.companyId);
  criado.emails.push(f.email);
  return f;
}

let contadorDeIp = 100;
function novoIp(): string {
  contadorDeIp += 1;
  return "10.98." + Math.floor(contadorDeIp / 254) + "." + (contadorDeIp % 254) + ".9";
}

interface Par {
  accessToken: string;
  refreshToken: string;
}

async function entrar(email: string, password: string): Promise<Par> {
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    remoteAddress: novoIp(),
    payload: { email, password },
  });
  if (res.statusCode !== 200) throw new Error("login falhou: " + res.statusCode + " " + res.body);
  const corpo = res.json() as { user?: { id: string }; accessToken?: string; refreshToken?: string };
  if (!corpo.user || !corpo.accessToken || !corpo.refreshToken) {
    throw new Error("login esperava devolver sessao: " + res.body);
  }
  return { accessToken: corpo.accessToken, refreshToken: corpo.refreshToken };
}

/** A rota de renovação, com o endereço de cada tentativa. */
async function renovar(refreshToken: string): Promise<{ status: number; corpo: Record<string, unknown> }> {
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/refresh",
    remoteAddress: novoIp(),
    payload: { refreshToken },
  });
  return { status: res.statusCode, corpo: res.json() as Record<string, unknown> };
}

/**
 * Volta no tempo o instante em que o token foi consumido, para simular a segunda
 * aba que chega depois da janela. É a única forma de provar os dez segundos sem
 * dormir dez segundos em cada suíte.
 */
async function atrasarRotacao(refreshToken: string, ms: number): Promise<void> {
  const registro = await prisma.refreshToken.findUniqueOrThrow({ where: { tokenHash: hashToken(refreshToken) } });
  if (!registro.usedAt) throw new Error("esperava token ja rotacionado");
  await prisma.refreshToken.update({
    where: { id: registro.id },
    data: { usedAt: new Date(registro.usedAt.getTime() - ms) },
  });
}

/** Troca de senha pela rota, com o access token da aba que está na mão da pessoa. */
async function trocarSenha(accessToken: string, senhaAtual: string): Promise<number> {
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/change-password",
    remoteAddress: novoIp(),
    headers: { authorization: "Bearer " + accessToken },
    payload: { currentPassword: senhaAtual, newPassword: "SenhaNova123!" },
  });
  return res.statusCode;
}

/** Revogação por decisão, pela rota de logout. */
async function sair(refreshToken: string): Promise<number> {
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/logout",
    remoteAddress: novoIp(),
    payload: { refreshToken },
  });
  return res.statusCode;
}

/** Empresa extra para a conta, direto no banco: o fixture não tem helper disso. */
async function segundaEmpresa(userId: string, role: "OWNER" | "ADMIN" | "MANAGER" | "STAFF"): Promise<string> {
  const company = await prisma.company.create({ data: { name: uid("Empresa B"), slug: uid("slugb") } });
  await prisma.companyUser.create({ data: { userId, companyId: company.id, role } });
  criado.companyIds.push(company.id);
  return company.id;
}

/** A empresa que a sessão devolve — é o que `/auth/me` responde com o token novo. */
async function empresaDaSessao(accessToken: string): Promise<string> {
  const res = await app.inject({
    method: "GET",
    url: "/api/auth/me",
    remoteAddress: novoIp(),
    headers: { authorization: "Bearer " + accessToken },
  });
  if (res.statusCode !== 200) throw new Error("me falhou: " + res.statusCode + " " + res.body);
  return (res.json() as { companyId: string }).companyId;
}

async function acoes(userId: string): Promise<string[]> {
  const linhas = await prisma.auditLog.findMany({ where: { userId }, select: { action: true }, orderBy: { createdAt: "asc" } });
  return linhas.map((l) => l.action);
}

beforeAll(async () => {
  await app.ready();
  tokensAntes = await prisma.refreshToken.count();
});

afterAll(async () => {
  await cleanup(criado);
  criado = { userIds: [], companyIds: [], emails: [] };
  // Regra 4 do contrato: a prova limpa o que escreveu. Os refresh tokens caem por
  // cascata do usuário; sobrar linha é fixture mal desenhado. A auditoria é
  // append-only por decisão de produto, então ela cresce de propósito — o que se
  // confere aqui é que o acréscimo é só dos eventos desta suíte.
  expect(await prisma.refreshToken.count()).toBeLessThanOrEqual(tokensAntes);
  expect(await prisma.refreshToken.count()).toBe(tokensAntes);
  await app.close();
});

describe("Corrida de abas na renovação de sessao", () => {
  it("a segunda aba que chega com o token velho renova, e a corrida fica na auditoria", async () => {
    const conta = registrou(await makeAccount("MANAGER"));
    const par = await entrar(conta.email, conta.password);

    // Primeira aba: gira o token.
    const primeira = await renovar(par.refreshToken);
    expect(primeira.status).toBe(200);

    // Segunda aba, saindo com o mesmo token velho antes do giro chegar ao disco.
    const segunda = await renovar(par.refreshToken);
    expect(segunda.status).toBe(200);
    expect(typeof segunda.corpo.accessToken).toBe("string");
    expect(typeof segunda.corpo.refreshToken).toBe("string");

    const evento = await prisma.auditLog.findFirst({
      where: { userId: conta.userId, action: "auth.refresh_corrida" },
      orderBy: { createdAt: "desc" },
    });
    expect(evento).not.toBeNull();
    const metadata = evento!.metadata as { desdeARotacaoMs: number; motivo: string };
    expect(metadata.desdeARotacaoMs).toBeLessThanOrEqual(JANELA_MS);
    expect(metadata.motivo).toContain("duas abas");
    // Não é roubo: o alarme de reuso fica calado na corrida legítima.
    expect(await acoes(conta.userId)).not.toContain("auth.refresh_reuse");
  });

  it("a corrida devolve um par novo, nao o par que a primeira aba ja levou", async () => {
    const conta = registrou(await makeAccount("MANAGER"));
    const par = await entrar(conta.email, conta.password);
    const primeira = await renovar(par.refreshToken);
    const segunda = await renovar(par.refreshToken);

    // O que tem de ser diferente é o refresh token — a credencial com estado, que
    // o banco confere. O access token é Stateless: assinado do mesmo payload na
    // mesma segunda, ele sai byte a byte igual, e isso não é defeito (medido nesta
    // suíte: `refreshToken` diverge, `accessToken` coincide). A ponta que precisa
    // funcionar é a que ficou viva no navegador.
    expect(segunda.corpo.refreshToken).not.toBe(primeira.corpo.refreshToken);
    // O par da segunda aba funciona: o navegador que ganhou a corrida não fica
    // com um token decorativo na mão.
    const me = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      remoteAddress: novoIp(),
      headers: { authorization: "Bearer " + (segunda.corpo.accessToken as string) },
    });
    expect(me.statusCode).toBe(200);
  });

  it("fora da janela o mesmo token e roubo: 401, alarme e nenhuma sessao viva", async () => {
    const conta = registrou(await makeAccount("MANAGER"));
    const par = await entrar(conta.email, conta.password);
    const primeira = await renovar(par.refreshToken);
    const vivoDepoisDaCorrida = primeira.corpo.refreshToken as string;

    // A reapresentação chega depois dos dez segundos: volta a ser reuso.
    await atrasarRotacao(par.refreshToken, JANELA_MS + 5_000);
    const ladrao = await renovar(par.refreshToken);
    expect(ladrao.status).toBe(401);

    expect(await acoes(conta.userId)).toContain("auth.refresh_reuse");
    // Reaçao em cadeia: a sessao da aba legítima cai junto.
    const sobreviventes = await prisma.refreshToken.count({ where: { userId: conta.userId, revokedAt: null } });
    expect(sobreviventes).toBe(0);
    const depois = await renovar(vivoDepoisDaCorrida);
    expect(depois.status).toBe(401);
  });

  it("a janela nao abre porta para conta desativada", async () => {
    const conta = registrou(await makeAccount("MANAGER"));
    const par = await entrar(conta.email, conta.password);
    await renovar(par.refreshToken);

    await prisma.user.update({ where: { id: conta.userId }, data: { active: false } });
    const segunda = await renovar(par.refreshToken);
    expect(segunda.status).toBe(403);
    expect(String(segunda.corpo.message)).toContain("inativo");
  });

  it("logout nao dispara o alarme de roubo das outras sessoes", async () => {
    const conta = registrou(await makeAccount("MANAGER"));
    const primeiraAba = await entrar(conta.email, conta.password);
    const segundaAba = await entrar(conta.email, conta.password);

    const saida = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      remoteAddress: novoIp(),
      payload: { refreshToken: primeiraAba.refreshToken },
    });
    expect(saida.statusCode).toBe(204);

    // O token que saiu do navegador: morto, e sem apagar a família.
    expect((await renovar(primeiraAba.refreshToken)).status).toBe(401);
    expect(await acoes(conta.userId)).not.toContain("auth.refresh_reuse");

    // A outra aba, que não pediu nada, continua viva.
    const outra = await renovar(segundaAba.refreshToken);
    expect(outra.status).toBe(200);
    expect(await prisma.refreshToken.count({ where: { userId: conta.userId, revokedAt: null } })).toBeGreaterThan(0);
  });

  it("a corrida mantem a empresa ativa da sessao, nao a primeira empresa", async () => {
    const conta = registrou(await makeAccount("OWNER"));
    const casaAtual = conta.companyId;
    const outraCasa = await segundaEmpresa(conta.userId, "OWNER");
    const par = await entrar(conta.email, conta.password);

    // Troca de casa: a sessao passa a responder pela segunda empresa.
    const troca = await app.inject({
      method: "POST",
      url: "/api/auth/switch-company",
      remoteAddress: novoIp(),
      headers: { authorization: "Bearer " + par.accessToken },
      payload: { companyId: outraCasa },
    });
    expect(troca.statusCode).toBe(200);
    const novoPar = troca.json() as { accessToken: string; refreshToken: string };
    expect(await empresaDaSessao(novoPar.accessToken)).toBe(outraCasa);

    // Giro normal + corrida com o token velho: a empresa tem de continuar a mesma.
    expect((await renovar(novoPar.refreshToken)).status).toBe(200);
    const corrida = await renovar(novoPar.refreshToken);
    expect(corrida.status).toBe(200);
    expect(await empresaDaSessao(corrida.corpo.accessToken as string)).toBe(outraCasa);
    expect(await empresaDaSessao(corrida.corpo.accessToken as string)).not.toBe(casaAtual);
  });

  // Regra 7 — a janela protege a segunda aba, não o token consumido.

  it("a troca de senha fecha até a janela de corrida do token rotacionado", async () => {
    const conta = registrou(await makeAccount("MANAGER"));
    const par = await entrar(conta.email, conta.password);

    // Rotação legítima: o pai fica `usedAt` + `revokedAt`, o filho nasce vivo, e a
    // janela de dez segundos se abre para a segunda aba.
    const primeira = await renovar(par.refreshToken);
    expect(primeira.status).toBe(200);

    // A pessoa troca a senha. Desde a Fase 2 da auditoria isso derruba TODAS as
    // sessões — é a decisão mais forte que existe na conta.
    expect(await trocarSenha(primeira.corpo.accessToken as string, conta.password)).toBe(200);
    expect(await prisma.refreshToken.count({ where: { userId: conta.userId, revokedAt: null } })).toBe(0);

    // A janela não pode ser uma porta pelas costas dessa decisão: o pai reapresentado
    // logo em seguida, ainda dentro dos dez segundos, não emite par nenhum.
    const ladrao = await renovar(par.refreshToken);
    expect(ladrao.status).toBe(401);
    expect(typeof ladrao.corpo.accessToken).not.toBe("string");
    expect(await prisma.refreshToken.count({ where: { userId: conta.userId, revokedAt: null } })).toBe(0);
    // E fica registrado: reapresentar token consumido é reuso, com ou sem janela.
    expect(await acoes(conta.userId)).toContain("auth.refresh_reuse");
  });

  it("o logout da aba que girou o token fecha a janela do pai rotacionado", async () => {
    const conta = registrou(await makeAccount("MANAGER"));
    const par = await entrar(conta.email, conta.password);
    const primeira = await renovar(par.refreshToken);
    const filho = primeira.corpo.refreshToken as string;

    // A pessoa sai do navegador: a rota revoga o token que está na mão dela.
    expect(await sair(filho)).toBe(204);

    // O pai, consumido na rotação daquele mesmo logout, continua morto — a janela
    // só vale enquanto a linhagem que a abriu estiver de pé.
    expect((await renovar(par.refreshToken)).status).toBe(401);
    expect(await prisma.refreshToken.count({ where: { userId: conta.userId, revokedAt: null } })).toBe(0);
  });
});
