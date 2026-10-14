import { describe, it, expect, afterAll, beforeAll, beforeEach } from "vitest";
import { app, makeAccount, cleanup, comFlag, uid, type Fixture } from "./helpers";
import { prisma } from "../src/lib/prisma";
import {
  FALHAS_PARA_BLOQUEIO,
  JANELA_DE_CONTAGEM_MS,
  DURACAO_DO_BLOQUEIO_MS,
} from "../src/lib/tentativas";

// T3.2: bloqueio por conta, sem diferença mensurável.
//
// O que a regra tem de garantir, na ordem:
//   1. depois de N senhas erradas seguidas a conta fica bloqueada por um tempo;
//   2. durante o bloqueio a senha CERTA também não entra — é isso que torna o
//      bloqueio uma resposta ao ataque e não um detalhe cosmético;
//   3. a resposta é a MESMA nos três casos que um atacante adoraria separar: e-mail
//      que não existe, senha errada em conta que existe, senha certa em conta
//      bloqueada. Mesmo status, mesmo corpo, mesma frase;
//   4. o prazo passa e a pessoa volta a entrar com a senha dela, sem suporte;
//   5. o contador esquece falhas antigas: cinco erros em dias diferentes não são
//      um ataque, e bloquear por isso seria punir o dono da conta.
//
// A contagem vive em `login_attempts`, chaveada pelo endereço (não pelo id), e é
// por isso que o e-mail inexistente também tem linha: sem ela, "esse endereço não
// existe" seria respondido mais cedo, e a própria tabela entregaria a informação.

let criado: { userIds: string[]; companyIds: string[]; emails: string[] } = {
  userIds: [],
  companyIds: [],
  emails: [],
};

/** Endereços chutados que não são de ninguém: a linha existe, o dono não. */
const emailsFantasma: string[] = [];

function registrou(f: Fixture): Fixture {
  criado.userIds.push(f.userId);
  criado.companyIds.push(f.companyId);
  criado.emails.push(f.email);
  return f;
}

// Cada caso tem o próprio IP. Não é cosmetic: a rota de login mantém o limite real
// de dez pedidos por minuto POR ENDEREÇO mesmo com o global afrouxado da suíte, e
// um caso que tenta cinco vezes seis vezes seguidas do mesmo lugar esbarraria no
// rate-limit e receberia 429 em vez do 401 que estamos provando. Espalhar por IPs é
// o que deixa o teste medir a regra de conta, não a de rede.
let ipDaCase = 0;
function novoIp(): string {
  ipDaCase += 1;
  return "10.77." + Math.floor(ipDaCase / 254) + "." + (ipDaCase % 254) + ".7";
}

function tentarEntrar(email: string, password: string, ip = novoIp()) {
  return app.inject({
    method: "POST",
    url: "/api/auth/login",
    remoteAddress: ip,
    payload: { email, password },
  });
}

async function linhaDe(email: string) {
  return prisma.loginAttempt.findUnique({ where: { email: email.toLowerCase() } });
}

async function limparTudo(): Promise<void> {
  await prisma.loginAttempt.deleteMany({
    where: { email: { in: [...criado.emails, ...emailsFantasma].map((e) => e.toLowerCase()) } },
  });
}

let tentativasAntes = 0;

beforeAll(async () => {
  tentativasAntes = await prisma.loginAttempt.count();
});

beforeEach(async () => {
  await limparTudo();
});

afterAll(async () => {
  await limparTudo();
  await cleanup(criado);
  criado = { userIds: [], companyIds: [], emails: [] };
  // A tabela de contagem é do banco de prova, não da conta de ninguém: depois do
  // arquivo, ela volta ao tamanho de antes. É a prova de que o fixture limpou o
  // que criou, inclusive as linhas de endereço que não é de ninguém.
  const depois = await prisma.loginAttempt.count();
  expect(depois).toBeLessThanOrEqual(tentativasAntes);
  await app.close();
});

describe("Bloqueio de conta por tentativas de login", () => {
  it("a conta bloqueia depois de N senhas erradas, com a mesma resposta de sempre", async () => {
    const conta = registrou(await makeAccount("OWNER"));
    for (let i = 0; i < FALHAS_PARA_BLOQUEIO; i++) {
      const resposta = await tentarEntrar(conta.email, "SenhaErrada" + i + "!");
      expect(resposta.statusCode).toBe(401);
    }
    const linha = await linhaDe(conta.email);
    expect(linha?.failures).toBe(FALHAS_PARA_BLOQUEIO);
    expect(linha?.lockedUntil).not.toBeNull();
    const daqui = Date.now();
    expect(linha!.lockedUntil!.getTime()).toBeGreaterThan(daqui);
    expect(linha!.lockedUntil!.getTime() - daqui).toBeLessThanOrEqual(DURACAO_DO_BLOQUEIO_MS + 5_000);

    // A senha certa, logo em seguida, continua de fora.
    const comSenhaBoa = await tentarEntrar(conta.email, conta.password);
    expect(comSenhaBoa.statusCode).toBe(401);
    expect(comSenhaBoa.json().message).toBe("Credenciais inválidas");
  });

  it("as tres respostas sao exatamente a mesma coisa", async () => {
    const conta = registrou(await makeAccount("OWNER"));
    for (let i = 0; i < FALHAS_PARA_BLOQUEIO; i++) await tentarEntrar(conta.email, "errada-" + i);

    const bloqueada = await tentarEntrar(conta.email, conta.password);
    const senhaErrada = await tentarEntrar(conta.email, "outra-senha-errada");
    const fantasma = uid("nao-existe") + "@nexus.test";
    emailsFantasma.push(fantasma);
    const naoExiste = await tentarEntrar(fantasma, "qualquer-senha");

    for (const res of [bloqueada, senhaErrada, naoExiste]) {
      expect(res.statusCode).toBe(401);
    }
    // Corpo literalmente igual: mesma frase, nenhum campo a mais revelando que
    // aquela conta existe, ou que está bloqueada.
    expect(bloqueada.json()).toEqual(senhaErrada.json());
    expect(naoExiste.json()).toEqual(senhaErrada.json());
    expect(bloqueada.body).toBe(senhaErrada.body);
    expect(naoExiste.body).toBe(senhaErrada.body);
    // E a frase não contém a palavra "bloqueada" em hipótese nenhuma.
    expect(bloqueada.body.toLowerCase()).not.toContain("bloquead");
  });

  it("o e-mail que nao existe tambem tem sua linha de contagem", async () => {
    const email = uid("fantasma") + "@nexus.test";
    emailsFantasma.push(email);
    const res = await tentarEntrar(email, "qualquer-senha");
    expect(res.statusCode).toBe(401);
    const linha = await linhaDe(email);
    expect(linha?.failures).toBe(1);
    // ...mas uma linha dessas nunca chega ao bloqueio de nada real: ela só
    // acompanha o ritmo de quem testa endereço, e é apagada pela própria leitura
    // quando envelhece.
  });

  it("venceu o prazo, a senha certa entra e a contagem volta a zero", async () => {
    const conta = registrou(await makeAccount("OWNER"));
    for (let i = 0; i < FALHAS_PARA_BLOQUEIO; i++) await tentarEntrar(conta.email, "errada-" + i);

    // Viagem no tempo pela coluna, sem dormir quinze minutos dentro do teste.
    await prisma.loginAttempt.update({
      where: { email: conta.email.toLowerCase() },
      data: { lockedUntil: new Date(Date.now() - 1000), lastFailedAt: new Date(Date.now() - JANELA_DE_CONTAGEM_MS - 1000) },
    });

    const dentro = await tentarEntrar(conta.email, conta.password);
    // Janela de contagem vencida junto com o bloqueio: a linha velha é
    // desconsiderada, e a senha vale de novo.
    expect(dentro.statusCode).toBe(200);
    expect(await linhaDe(conta.email)).toBeNull();
  });

  it("falhas espacadas fora da janela de contagem nao somam", async () => {
    const conta = registrou(await makeAccount("ADMIN"));
    for (let i = 0; i < FALHAS_PARA_BLOQUEIO - 1; i++) await tentarEntrar(conta.email, "errada-" + i);

    // A última falha de antes da janela acontecer num dia anterior: quem erra a
    // senha quatro vezes hoje e uma vez amanhã não é um ataque.
    await prisma.loginAttempt.update({
      where: { email: conta.email.toLowerCase() },
      data: { lastFailedAt: new Date(Date.now() - JANELA_DE_CONTAGEM_MS - 60_000) },
    });

    const decisiva = await tentarEntrar(conta.email, "errada-final");
    expect(decisiva.statusCode).toBe(401);
    const linha = await linhaDe(conta.email);
    expect(linha?.failures).toBe(1);
    expect(linha?.lockedUntil).toBeNull();

    // e a senha continua sendo a original.
    const entrou = await tentarEntrar(conta.email, conta.password);
    expect(entrou.statusCode).toBe(200);
  });

  it("login bem-sucedido limpa as tentativas da conta", async () => {
    const conta = registrou(await makeAccount("STAFF"));
    await tentarEntrar(conta.email, "errada-1");
    expect(await linhaDe(conta.email)).not.toBeNull();
    const ok = await tentarEntrar(conta.email, conta.password);
    expect(ok.statusCode).toBe(200);
    expect(await linhaDe(conta.email)).toBeNull();
  });

  it("trocar a senha pela recuperacao tambem limpa o bloqueio", async () => {
    const conta = registrou(await makeAccount("OWNER"));
    for (let i = 0; i < FALHAS_PARA_BLOQUEIO; i++) await tentarEntrar(conta.email, "errada-" + i);
    expect((await linhaDe(conta.email))?.lockedUntil).not.toBeNull();

    // A recuperacao e a saida de quem foi trancado do lado de fora por alguem que
    // chutou a senha dele. Se o bloqueio sobrevivesse ao codigo valido, a primeira
    // coisa que a pessoa faria seria pedir recuperacao de novo -- exatamente o
    // ruido que a contagem pune.
    const codigo = await comFlag("AUTH_EXPOSE_RESET_TOKEN", "1", async () => {
      const pedido = await app.inject({
        method: "POST",
        url: "/api/auth/forgot-password",
        remoteAddress: novoIp(),
        payload: { email: conta.email },
      });
      expect(pedido.statusCode).toBe(200);
      const devToken = (pedido.json() as { devToken?: string }).devToken;
      expect(devToken).toBeTypeOf("string");
      return devToken!;
    });

    const trocada = await app.inject({
      method: "POST",
      url: "/api/auth/reset-password",
      remoteAddress: novoIp(),
      payload: { email: conta.email, token: codigo, password: "Redefinida@2026" },
    });
    expect(trocada.statusCode).toBe(200);
    expect(await linhaDe(conta.email)).toBeNull();

    // E a senha nova entra na hora, sem esperar o prazo do bloqueio antigo.
    const entrou = await tentarEntrar(conta.email, "Redefinida@2026");
    expect(entrou.statusCode).toBe(200);
  });

  it("o evento de bloqueio fica na auditoria, sem revelar o motivo na resposta", async () => {
    const conta = registrou(await makeAccount("OWNER"));
    for (let i = 0; i < FALHAS_PARA_BLOQUEIO; i++) await tentarEntrar(conta.email, "errada-" + i);
    const evento = await prisma.auditLog.findFirst({
      where: { action: "auth.login_bloqueado", entityId: conta.userId },
      orderBy: { createdAt: "desc" },
    });
    expect(evento).not.toBeNull();
    // A auditoria diz o que aconteceu para quem administra; o cliente recebe a
    // frase genérica de sempre (provado no caso das três respostas iguais).
    const metadata = evento!.metadata as { tentativas?: number };
    expect(metadata.tentativas).toBeGreaterThanOrEqual(FALHAS_PARA_BLOQUEIO);
  });
});
