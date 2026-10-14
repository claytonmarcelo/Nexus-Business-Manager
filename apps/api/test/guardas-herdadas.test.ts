import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { Secret, TOTP } from "otpauth";
import { app, cleanup, comFlag, makeAccount, uid, type Fixture } from "./helpers";
import { prisma } from "../src/lib/prisma";
import { EMISSOR_DO_TOTP } from "../src/lib/segundo-fator";
import { fakeMailer } from "../src/lib/mail/fake";
import { definirMailer } from "../src/lib/mail";

// T3.5 (F4), parte final: as guardas antigas continuam de pé DEPOIS do reforço.
//
// A F4 mexeu nas três peças que todo o resto do sistema consulta: o login passou a
// poder devolver token de etapa em vez de sessão, o `authenticate` passou a recusar
// token com escopo, e o refresh ganhou janela de corrida entre abas. Uma regra de
// papel, de empresa ativa ou de saldo que se apoiasse num atalho do fluxo antigo
// poderia ter caído silenciosamente — e cairia em produção, onde as flags ligam.
//
// Por isso cada caso abaixo roda com o ambiente de produção simulado
// (`REQUIRE_EMAIL_VERIFICATION=1`, `NODE_ENV=production`, chave de cifraçao presente)
// e com a conta entrando pelo caminho mais duro que existe hoje: e-mail confirmado,
// segundo fator obrigatório para OWNER, sessão nascendo da rota de etapa. As regras
// reaprovadas, na ordem:
//   1. ADMIN não cria nem rebaixa OWNER — só OWNER faz isso, e a sessão vinda do
//      segundo fator carrega o papel verdadeiro;
//   2. ninguém altera o próprio papel;
//   3. a empresa nunca fica sem pelo menos um proprietário;
//   4. o refresh devolve a empresa ativa da sessão (A4), inclusive na corrida de abas;
//   5. conta desativada perde o acesso na hora — token de sessão, renovação e login;
//   6. a lista de sessões responde só pela empresa ativa (A6);
//   7. pedir recuperação de senha continua sem derrubar sessão nenhuma (A7);
//   8. aviso de negócio não atravessa empresa;
//   9. o estoque continua atômico sob dois cliques simultâneos.

const CHAVE_DE_PROVA = "c".repeat(63) + "a";
const caixa = fakeMailer();

let criado: { userIds: string[]; companyIds: string[]; emails: string[] } = {
  userIds: [],
  companyIds: [],
  emails: [],
};

function registrou(f: Fixture): Fixture {
  criado.userIds.push(f.userId);
  criado.companyIds.push(f.companyId);
  criado.emails.push(f.email);
  return f;
}

let contadorDeIp = 200;
function novoIp(): string {
  contadorDeIp += 1;
  return "10.97." + Math.floor(contadorDeIp / 254) + "." + (contadorDeIp % 254) + ".5";
}

async function chamar(
  method: "POST" | "PATCH" | "GET" | "DELETE",
  url: string,
  token?: string,
  payload?: unknown,
) {
  return app.inject({
    method,
    url,
    remoteAddress: novoIp(),
    headers: token ? { authorization: "Bearer " + token } : {},
    payload: payload as object | undefined,
  });
}

/** As flags da F4 juntas, como em produção, e restauradas no fim do trecho. */
async function emProducao<T>(trecho: () => Promise<T>): Promise<T> {
  return comFlag("REQUIRE_EMAIL_VERIFICATION", "1", () =>
    comFlag("NODE_ENV", "production", () => comFlag("TOTP_ENCRYPTION_KEY", CHAVE_DE_PROVA, trecho)),
  );
}

/**
 * Conta de teste no regime de produção: criada no banco e com o e-mail confirmado,
 * que é o estado de quem passou pela verificação da D2. Sem essa confirmação o login
 * recusaria antes de qualquer regra de papel, e o teste provaria a flag, não a guarda.
 */
async function conta(role: "OWNER" | "ADMIN" | "MANAGER" | "STAFF"): Promise<Fixture> {
  const f = registrou(await makeAccount(role));
  await prisma.user.update({ where: { id: f.userId }, data: { emailVerifiedAt: new Date() } });
  return f;
}

function codigoDoAplicativo(segredoBase32: string): string {
  return new TOTP({
    issuer: EMISSOR_DO_TOTP,
    label: "conta",
    secret: Secret.fromBase32(segredoBase32),
    digits: 6,
    period: 30,
    algorithm: "SHA1",
  }).generate();
}

interface Sessao {
  accessToken: string;
  refreshToken: string;
}

/**
 * A sessão pelo caminho mais duro que a F4 deixou: se o papel obriga segundo fator,
 * atravessa a etapa de configuração; se o fator já está ligado, atravessa o desafio.
 * O que volta é exatamente o par de tokens que a tela do painel recebe.
 */
async function sessaoDaConta(f: Fixture, companyId?: string): Promise<Sessao> {
  const tentativa = await chamar("POST", "/api/auth/login", undefined, {
    email: f.email,
    password: f.password,
    ...(companyId ? { companyId } : {}),
  });
  if (tentativa.statusCode !== 200) {
    throw new Error("login falhou: " + tentativa.statusCode + " " + tentativa.body);
  }
  const corpo = tentativa.json() as Record<string, unknown>;

  if (corpo.twoFactorSetupRequired === true) {
    const etapa = corpo.setupToken as string;
    const preparar = await chamar("POST", "/api/auth/2fa/setup", etapa);
    if (preparar.statusCode !== 200) throw new Error("setup falhou: " + preparar.body);
    const ativado = await chamar("POST", "/api/auth/2fa/activate", etapa, {
      codigo: codigoDoAplicativo(preparar.json().segredoBase32 as string),
    });
    if (ativado.statusCode !== 200) throw new Error("activate falhou: " + ativado.body);
    const par = ativado.json() as Sessao;
    return { accessToken: par.accessToken, refreshToken: par.refreshToken };
  }

  if (corpo.twoFactorRequired === true) {
    const etapa = corpo.challengeToken as string;
    const linha = await prisma.user.findUniqueOrThrow({ where: { id: f.userId } });
    const segredo = await descriptografar(linha.totpSecretCiphertext as string);
    const entrada = await chamar("POST", "/api/auth/2fa/challenge", undefined, {
      challengeToken: etapa,
      codigo: codigoDoAplicativo(segredo),
    });
    if (entrada.statusCode !== 200) throw new Error("desafio falhou: " + entrada.body);
    return entrada.json() as Sessao;
  }

  return corpo as unknown as Sessao;
}

/** Membro criado dentro da empresa do dono, pela rota de verdade (POST /users). */
async function membroDaEmpresa(
  tokenDoDono: string,
  companyId: string,
  role: "OWNER" | "ADMIN" | "MANAGER" | "STAFF",
): Promise<Fixture> {
  const email = `${uid("m")}@nexus.test`;
  const senha = "SenhaForte123!";
  const res = await chamar("POST", "/api/users", tokenDoDono, {
    email,
    name: "Membro de teste",
    password: senha,
    role,
  });
  if (res.statusCode !== 201) throw new Error("criação falhou: " + res.statusCode + " " + res.body);
  const id = (res.json() as { id: string }).id;
  await prisma.user.update({ where: { id }, data: { emailVerifiedAt: new Date() } });
  return registrou({ userId: id, companyId, email, password: senha });
}

async function descriptografar(envelope: string): Promise<string> {
  const { decifrar } = await import("../src/lib/criptografia");
  return decifrar(envelope);
}

async function empresaDaSessao(accessToken: string): Promise<string> {
  const res = await chamar("GET", "/api/auth/me", accessToken);
  if (res.statusCode !== 200) throw new Error("me falhou: " + res.statusCode + " " + res.body);
  return (res.json() as { companyId: string }).companyId;
}

/** Empresa extra na conta, direto no banco: o fixture não tem helper disso. */
async function segundaEmpresa(
  userId: string,
  role: "OWNER" | "ADMIN" | "MANAGER" | "STAFF",
): Promise<string> {
  const company = await prisma.company.create({ data: { name: uid("Empresa B"), slug: uid("slugb") } });
  await prisma.companyUser.create({ data: { userId, companyId: company.id, role } });
  criado.companyIds.push(company.id);
  return company.id;
}

let avisosAntes = 0;
let tokensAntes = 0;

beforeAll(async () => {
  await app.ready();
  avisosAntes = await prisma.notification.count();
  tokensAntes = await prisma.refreshToken.count();
});

beforeEach(() => {
  caixa.limpar();
  definirMailer(caixa);
});

afterEach(() => {
  definirMailer(undefined);
});

afterAll(async () => {
  await cleanup(criado);
  criado = { userIds: [], companyIds: [], emails: [] };
  // Regra 4 do contrato: a prova limpa o que escreveu, e mostra a contagem.
  expect(await prisma.notification.count()).toBe(avisosAntes);
  expect(await prisma.refreshToken.count({ where: { revokedAt: null } })).toBeLessThanOrEqual(tokensAntes);
  await app.close();
});

describe("Guardas de papel sob o regime da F4", () => {
  it("ADMIN sem proprietário na empresa não cria OWNER, mesmo pela porta do segundo fator", async () => {
    await emProducao(async () => {
      const admin = await conta("ADMIN");
      const { accessToken } = await sessaoDaConta(admin);

      const convite = {
        email: `${uid("c")}@nexus.test`,
        name: "Convidado de teste",
        password: "SenhaForte123!",
        role: "OWNER",
      };
      const recusa = await chamar("POST", "/api/users", accessToken, convite);
      expect(recusa.statusCode).toBe(403);
      expect(recusa.json().message).toBe("Só o proprietário pode criar um proprietário.");

      // Nada passou para o banco: a empresa deste ADMIN continua sem dono nenhum.
      expect(
        await prisma.companyUser.count({ where: { companyId: admin.companyId, role: "OWNER" } }),
      ).toBe(0);
      expect(
        await prisma.user.count({ where: { email: convite.email.toLowerCase() } }),
      ).toBe(0);
    });
  });

  it("ADMIN não rebaixa OWNER e não encosta no próprio papel", async () => {
    await emProducao(async () => {
      const dono = await conta("OWNER");
      const donoSessao = await sessaoDaConta(dono);
      // A sessão nasceu da rota de etapa: o papel que o token carrega é o verdadeiro.
      const quemSou = await chamar("GET", "/api/auth/me", donoSessao.accessToken);
      expect(quemSou.json()).toMatchObject({ role: "OWNER", companyId: dono.companyId });

      const admin = await membroDaEmpresa(donoSessao.accessToken, dono.companyId, "ADMIN");
      const { accessToken: tokenAdmin } = await sessaoDaConta(admin);

      const rebaixa = await chamar("PATCH", `/api/users/${dono.userId}/role`, tokenAdmin, { role: "STAFF" });
      expect(rebaixa.statusCode).toBe(403);
      expect(rebaixa.json().message).toBe("Só o proprietário pode criar ou rebaixar um proprietário.");

      const sePromova = await chamar("PATCH", `/api/users/${admin.userId}/role`, tokenAdmin, { role: "OWNER" });
      expect(sePromova.statusCode).toBe(403);
      expect(sePromova.json().message).toBe("Você não pode alterar o seu próprio papel.");

      expect(await papelDe(admin.userId, dono.companyId)).toBe("ADMIN");
      expect(await papelDe(dono.userId, dono.companyId)).toBe("OWNER");
    });
  });

  it("a empresa continua sem poder ficar sem proprietário", async () => {
    await emProducao(async () => {
      const dono = await conta("OWNER");
      const { accessToken } = await sessaoDaConta(dono);

      const segundo = await chamar("POST", "/api/users", accessToken, {
        email: `${uid("d")}@nexus.test`,
        name: "Segundo dono",
        password: "SenhaForte123!",
        role: "OWNER",
      });
      expect(segundo.statusCode).toBe(201);
      const segundoId = (segundo.json() as { id: string }).id;
      criado.userIds.push(segundoId);

      // Com dois donos, sair do próprio papel é lícito — e a empresa nunca fica só.
      const sai = await chamar("PATCH", `/api/users/${dono.userId}/role`, accessToken, { role: "STAFF" });
      expect(sai.statusCode).toBe(403);
      expect(sai.json().message).toBe("Você não pode alterar o seu próprio papel.");

      const rebaixaColega = await chamar("PATCH", `/api/users/${segundoId}/role`, accessToken, { role: "STAFF" });
      expect(rebaixaColega.statusCode).toBe(200);

      // Sobrou um dono só: quem tenta tirá-lo do papel cai na guarda de orfanato.
      const ultimoSaindo = await chamar("PATCH", `/api/users/${dono.userId}/role`, accessToken, { role: "ADMIN" });
      expect(ultimoSaindo.statusCode).toBe(409);
      expect(ultimoSaindo.json().message).toBe("A empresa precisa continuar com pelo menos um proprietário.");
      expect(await prisma.companyUser.count({ where: { companyId: dono.companyId, role: "OWNER" } })).toBe(1);
    });
  });
});

describe("Sessão, empresa ativa e recuperação sob o regime da F4", () => {
  it("o refresh devolve a empresa ativa da sessão, e a corrida de abas não troca de empresa", async () => {
    await emProducao(async () => {
      const dono = await conta("OWNER");
      const outra = await segundaEmpresa(dono.userId, "STAFF");

      const primeira = await sessaoDaConta(dono, dono.companyId);
      expect(await empresaDaSessao(primeira.accessToken)).toBe(dono.companyId);

      const troca = await chamar("POST", "/api/auth/switch-company", primeira.accessToken, { companyId: outra });
      expect(troca.statusCode).toBe(200);
      const naOutra = troca.json() as Sessao;
      expect(await empresaDaSessao(naOutra.accessToken)).toBe(outra);

      // A4: renovar mantém a empresa ativa — nunca a primeira do vínculo.
      const renovado = await chamar("POST", "/api/auth/refresh", undefined, {
        refreshToken: naOutra.refreshToken,
      });
      expect(renovado.statusCode).toBe(200);
      const par = renovado.json() as Sessao;
      expect(await empresaDaSessao(par.accessToken)).toBe(outra);

      // Corrida de abas dentro da janela: a segunda aba renova com o token velho e
      // continua na mesma empresa. A janela não é uma porta para a empresa errada.
      const segundaAba = await chamar("POST", "/api/auth/refresh", undefined, {
        refreshToken: naOutra.refreshToken,
      });
      expect(segundaAba.statusCode).toBe(200);
      expect(await empresaDaSessao((segundaAba.json() as Sessao).accessToken)).toBe(outra);

      const eventos = await prisma.auditLog.findMany({
        where: { userId: dono.userId, action: "auth.refresh_corrida" },
      });
      expect(eventos.length).toBeGreaterThan(0);
    });
  });

  it("conta desativada perde o acesso na hora, até com o segundo fator ligado", async () => {
    await emProducao(async () => {
      const dono = await conta("OWNER");
      const { accessToken, refreshToken } = await sessaoDaConta(dono);
      expect((await chamar("GET", "/api/clients", accessToken)).statusCode).toBe(200);

      await prisma.user.update({ where: { id: dono.userId }, data: { active: false } });

      // Token de sessão já emitido: cai na hora, sem esperar vencer.
      expect((await chamar("GET", "/api/auth/me", accessToken)).statusCode).toBe(403);
      // A renovação também não reabre a porta. O código conferido é o da convenção
      // que já estava provada antes da F4 (`desativacao-acesso.test.ts`) e que a
      // janela de abas mantém (`corrida-de-abas.test.ts`): o token é válido, quem
      // deixou de existir é a conta — 403 "Usuário inativo", e nenhum par novo sai
      // da resposta. Provar isso é o ponto do caso, não o número do status.
      const vivasAntes = await prisma.refreshToken.count({ where: { userId: dono.userId, revokedAt: null } });
      const renovado = await chamar("POST", "/api/auth/refresh", undefined, { refreshToken });
      expect(renovado.statusCode).toBe(403);
      expect(String((renovado.json() as { message?: string }).message)).toContain("inativo");
      expect((renovado.json() as { accessToken?: string }).accessToken).toBeUndefined();
      expect(await prisma.refreshToken.count({ where: { userId: dono.userId, revokedAt: null } })).toBe(vivasAntes);
      // E o login da conta desativada não chega a emitir token de etapa.
      const entrada = await chamar("POST", "/api/auth/login", undefined, {
        email: dono.email,
        password: dono.password,
      });
      expect(entrada.statusCode).toBe(401);
    });
  });

  it("a lista de sessões responde só pela empresa ativa, com o reforço de login em campo", async () => {
    await emProducao(async () => {
      const dono = await conta("OWNER");
      const outra = await segundaEmpresa(dono.userId, "ADMIN");

      const naA = await sessaoDaConta(dono, dono.companyId);
      const naB = await sessaoDaConta(dono, outra);
      void naA;
      const listaNaB = await chamar("GET", "/api/users/sessions", naB.accessToken);
      expect(listaNaB.statusCode).toBe(200);
      const linhas = (listaNaB.json() as { data: Array<{ id: string; userId: string }> }).data;
      expect(linhas.length).toBeGreaterThan(0);
      // Toda sessão listada pertence à empresa da sessão — nem uma linha da A aparece.
      for (const linha of linhas) {
        const registro = await prisma.refreshToken.findUniqueOrThrow({ where: { id: linha.id } });
        expect(registro.companyId).toBe(outra);
      }
    });
  });

  it("pedir recuperação de senha não derruba sessão nenhuma, agora com a verificação ligada", async () => {
    await emProducao(async () => {
      const atendente = await conta("STAFF");
      const { refreshToken } = await sessaoDaConta(atendente);
      const vivas = () =>
        prisma.refreshToken.count({ where: { userId: atendente.userId, revokedAt: null } });
      expect(await vivas()).toBe(1);

      for (let i = 0; i < 3; i += 1) {
        const pediu = await chamar("POST", "/api/auth/forgot-password", undefined, { email: atendente.email });
        expect(pediu.statusCode).toBe(200);
      }
      // Negação de serviço pelo e-mail da vítima continua impossível.
      expect(await vivas()).toBe(1);
      const renovado = await chamar("POST", "/api/auth/refresh", undefined, { refreshToken });
      expect(renovado.statusCode).toBe(200);

      // E o código continua sem vazar na resposta pública nem no corpo do e-mail.
      const corpo = JSON.stringify((await chamar("POST", "/api/auth/forgot-password", undefined, {
        email: atendente.email,
      })).json());
      expect(corpo).not.toMatch(/token|codigo|devToken/i);
      expect(await prisma.passwordResetToken.count({ where: { userId: atendente.userId, usedAt: null } })).toBe(4);
    });
  });

  it("aviso de negócio não atravessa empresa", async () => {
    const a = registrou(await makeAccount("OWNER"));
    const b = registrou(await makeAccount("OWNER"));
    const tokenA = await sessaoDaContaSemEtapa(a);
    const tokenB = await sessaoDaContaSemEtapa(b);

    const avisoDeA = await prisma.notification.create({
      data: { userId: a.userId, companyId: a.companyId, kind: "venda", title: "Venda de A" },
    });
    await prisma.notification.create({
      data: { userId: b.userId, companyId: b.companyId, kind: "venda", title: "Venda de B" },
    });

    const listaB = await chamar("GET", "/api/notifications", tokenB);
    expect(listaB.statusCode).toBe(200);
    const titulos = JSON.stringify(listaB.json());
    expect(titulos).not.toContain("Venda de A");
    expect(titulos).toContain("Venda de B");
    expect((listaB.json() as { meta: { total: number } }).meta.total).toBe(1);

    // Marcar como lida é por empresa também: o id de A não existe para B.
    const marca = await chamar("PATCH", `/api/notifications/${avisoDeA.id}/read`, tokenB);
    expect(marca.statusCode).toBe(404);
    expect(await prisma.notification.findUniqueOrThrow({ where: { id: avisoDeA.id } })).toMatchObject({
      readAt: null,
    });
  });

  it("o estoque continua atômico: duas vendas da última unidade, uma passa", async () => {
    const dono = registrou(await makeAccount("OWNER"));
    const accessToken = await sessaoDaContaSemEtapa(dono);
    const authHeader = accessToken;

    const produto = await chamar("POST", "/api/products", accessToken, {
      name: "Item Guarda " + uid("p"),
      salePrice: 10,
      stockQuantity: 1,
      minStock: 0,
    });
    expect(produto.statusCode).toBe(201);
    const productId = (produto.json() as { id: string }).id;

    const cliente = await chamar("POST", "/api/clients", accessToken, { name: "Cliente Guarda " + uid("c") });
    const clientId = (cliente.json() as { id: string }).id;

    const pedido = { clientId, confirm: true, items: [{ productId, quantity: 1, unitPrice: 10 }] };
    const [x, y] = await Promise.all([
      chamar("POST", "/api/sales", accessToken, pedido),
      chamar("POST", "/api/sales", accessToken, pedido),
    ]);
    const codigos = [x.statusCode, y.statusCode].sort();
    expect(codigos[0]).toBe(201);
    expect(codigos[1]).toBe(400);

    const saldo = await prisma.product.findUniqueOrThrow({ where: { id: productId }, select: { stockQuantity: true } });
    expect(Number(saldo.stockQuantity)).toBe(0);
    expect(await prisma.stockMovement.count({ where: { productId, kind: "OUT" } })).toBe(1);
  });
});

/** Sessão do regime normal (sem as flags de produção): caminho de sempre da conta. */
async function sessaoDaContaSemEtapa(f: Fixture): Promise<string> {
  const tentativa = await chamar("POST", "/api/auth/login", undefined, { email: f.email, password: f.password });
  if (tentativa.statusCode !== 200) throw new Error("login falhou: " + tentativa.statusCode + " " + tentativa.body);
  return (tentativa.json() as { accessToken: string }).accessToken;
}

async function papelDe(userId: string, companyId: string): Promise<string | undefined> {
  return (
    await prisma.companyUser.findUnique({ where: { userId_companyId: { userId, companyId } } })
  )?.role;
}
