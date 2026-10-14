import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { Secret, TOTP } from "otpauth";
import { app, cleanup, comFlag, makeAccount, type Fixture } from "./helpers";
import { prisma } from "../src/lib/prisma";
import { EMISSOR_DO_TOTP } from "../src/lib/segundo-fator";
import { fakeMailer } from "../src/lib/mail/fake";
import { definirMailer } from "../src/lib/mail";

// T3.4 (decisão D3 do dono): segundo fator TOTP, segredo cifrado em repouso.
//
// As regras que este arquivo prova, na ordem:
//   1. sem chave de cifraçao no ambiente, o segundo fator não é oferecido — gerar um
//      segredo que não se consegue ler de volta seria prometer proteção falsa;
//   2. o segredo aparece uma vez, para a pessoa, e o banco só vê o envelope cifrado;
//   3. segredo gerado e não confirmado é pendente: nenhuma entrada acontece com ele;
//   4. ligar exige provar o código do aplicativo — a senha não basta;
//   5. ligado, a senha certa não entra mais sozinha: o que nasce é um token de
//      desafio, e a sessão só existe depois do código;
//   6. token de desafio não abre rota de negócio, e sessão comum não abre rota de
//      etapa — os dois se recusam por construção;
//   7. os dez códigos de recuperação valem uma vez cada um, e o banco só guarda o
//      hash deles;
//   8. desligar exige um código válido (não a senha), e em produção o papel
//      obrigatório não pode desligar.

const caixa = fakeMailer();
const CHAVE_DE_PROVA = "c".repeat(63) + "a";

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

let ipDaCase = 0;
function novoIp(): string {
  ipDaCase += 1;
  return "10.99." + Math.floor(ipDaCase / 254) + "." + (ipDaCase % 254) + ".7";
}

async function post(url: string, payload: Record<string, unknown>, token?: string) {
  const res = await app.inject({
    method: "POST",
    url: "/api/auth" + url,
    remoteAddress: novoIp(),
    headers: token ? { authorization: "Bearer " + token } : {},
    payload,
  });
  return res;
}

async function get(url: string, token?: string) {
  const res = await app.inject({
    method: "GET",
    url: "/api/auth" + url,
    remoteAddress: novoIp(),
    headers: token ? { authorization: "Bearer " + token } : {},
  });
  return res;
}

/**
 * O aplicativo de códigos, imitado de perto: o mesmo segredo, o mesmo período, o
 * mesmo algoritmo. O nome da opção é `timestamp` (a 9.5.2 não aceita `time`), e o
 * deslocamento é em períodos de 30 segundos — é assim que os casos provam a
 * tolerância de um período para cada lado sem mexer no relógio da máquina.
 */
function codigoDoAplicativo(segredoBase32: string, deslocamentoDePeriodos = 0): string {
  const totp = new TOTP({
    issuer: EMISSOR_DO_TOTP,
    label: "conta",
    secret: Secret.fromBase32(segredoBase32),
    digits: 6,
    period: 30,
    algorithm: "SHA1",
  });
  return totp.generate({ timestamp: Date.now() + deslocamentoDePeriodos * 30_000 });
}

async function entrar(email: string, password: string) {
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    remoteAddress: novoIp(),
    payload: { email, password },
  });
  return { status: res.statusCode, corpo: res.json() as Record<string, unknown> };
}

/** Sessão comum de uma conta sem segundo fator: o caminho de sempre do login. */
async function sessao(email: string, password: string): Promise<string> {
  const { status, corpo } = await entrar(email, password);
  if (status !== 200 || typeof corpo.accessToken !== "string") {
    throw new Error("login simples falhou: " + status + " " + JSON.stringify(corpo));
  }
  return corpo.accessToken;
}

/** Liga o segundo fator pelo caminho da conta (sessão já existe) e devolve o segredo. */
async function ligarSegundoFator(token: string): Promise<{ segredo: string; codigos: string[] }> {
  const preparar = await post("/2fa/preparar", {}, token);
  expect(preparar.statusCode).toBe(200);
  const segredo = preparar.json().segredoBase32 as string;
  const ativar = await post("/2fa/ativar", { codigo: codigoDoAplicativo(segredo) }, token);
  expect(ativar.statusCode).toBe(200);
  return { segredo, codigos: ativar.json().codigosDeRecuperacao as string[] };
}

let codigosAntes = 0;
let tokensAntes = 0;

beforeAll(async () => {
  codigosAntes = await prisma.recoveryCode.count();
  tokensAntes = await prisma.emailVerificationToken.count();
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
  // Regra 4 do contrato: a prova limpa o que escreveu. Os códigos de recuperação e
  // os tokens caem por cascata junto do usuário; sobrar linha é defeito do fixture.
  expect(await prisma.recoveryCode.count()).toBeLessThanOrEqual(codigosAntes);
  expect(await prisma.emailVerificationToken.count()).toBeLessThanOrEqual(tokensAntes);
  await app.close();
});

describe("Segundo fator (D3)", () => {
  it("sem chave de cifraçao o segundo fator nao e oferecido", async () => {
    // Produção sem `TOTP_ENCRYPTION_KEY`: o segredo não teria como ser lido de
    // volta, e oferecer 2FA assim seria prometer uma porta que não abre.
    const conta = registrou(await makeAccount("STAFF"));
    const token = await sessao(conta.email, conta.password);
    await comFlag("NODE_ENV", "production", async () => {
      await comFlag("TOTP_ENCRYPTION_KEY", "", async () => {
        const res = await post("/2fa/preparar", {}, token);
        expect(res.statusCode).toBe(409);
        expect(res.json().message).toContain("TOTP_ENCRYPTION_KEY");
      });
    });
  });

  it("o segredo sai uma vez para a tela, e o banco ve só o envelope cifrado", async () => {
    const conta = registrou(await makeAccount("STAFF"));
    const token = await sessao(conta.email, conta.password);

    const res = await post("/2fa/preparar", {}, token);
    expect(res.statusCode).toBe(200);
    const corpo = res.json() as { segredoBase32: string; uri: string; obrigatorio: boolean };
    expect(corpo.segredoBase32).toMatch(/^[A-Z2-7]{32}$/);
    expect(corpo.uri).toContain("otpauth://totp/");
    expect(corpo.uri).toContain("secret=" + corpo.segredoBase32);
    expect(corpo.uri.toLowerCase()).toContain(conta.email.split("@")[0]!.toLowerCase());
    // Fora de produção o papel comum não é obrigado: a tela mostra "ligue quando quiser".
    expect(corpo.obrigatorio).toBe(false);

    const gravado = await prisma.user.findUniqueOrThrow({ where: { id: conta.userId } });
    expect(gravado.totpSecretCiphertext).not.toBeNull();
    expect(gravado.totpSecretCiphertext!.startsWith("v1:")).toBe(true);
    expect(gravado.totpSecretCiphertext).not.toContain(corpo.segredoBase32);
    // Ainda pendente: gerar não é ligar.
    expect(gravado.totpEnabledAt).toBeNull();

    const status = await get("/2fa/status", token);
    expect(status.json()).toMatchObject({ ligado: false, pendente: true, obrigatorio: false, codigosRestantes: 0 });
  });

  it("ligar sem o codigo do aplicativo nao liga nada", async () => {
    const conta = registrou(await makeAccount("STAFF"));
    const token = await sessao(conta.email, conta.password);
    await post("/2fa/preparar", {}, token);

    const chute = await post("/2fa/ativar", { codigo: "000000" }, token);
    expect(chute.statusCode).toBe(401);
    expect(chute.json().message).toBe("Código inválido. Confira o horário do aparelho e tente de novo.");

    const gravado = await prisma.user.findUniqueOrThrow({ where: { id: conta.userId } });
    expect(gravado.totpEnabledAt).toBeNull();
    expect(await prisma.recoveryCode.count({ where: { userId: conta.userId } })).toBe(0);

    const evento = await prisma.auditLog.findFirst({
      where: { userId: conta.userId, action: "auth.2fa_ativacao_falhou" },
    });
    expect(evento).not.toBeNull();
  });

  it("um codigo de periodo antigo nao liga o segundo fator", async () => {
    // A tolerância é de um período para cada lado (90 segundos no total). Dois
    // períodos para trás já é código de outro minuto, e aceitá-lo ampliaria a
    // janela de um código interceptado.
    const conta = registrou(await makeAccount("STAFF"));
    const token = await sessao(conta.email, conta.password);
    const preparar = await post("/2fa/preparar", {}, token);
    const segredo = preparar.json().segredoBase32 as string;

    const velho = await post("/2fa/ativar", { codigo: codigoDoAplicativo(segredo, -3) }, token);
    expect(velho.statusCode).toBe(401);
    expect(await prisma.user.findUniqueOrThrow({ where: { id: conta.userId } })).toMatchObject({
      totpEnabledAt: null,
    });
  });

  it("o codigo certo liga, entrega os dez codigos de recuperacao uma unica vez, e so o hash fica no banco", async () => {
    const conta = registrou(await makeAccount("STAFF"));
    const token = await sessao(conta.email, conta.password);
    const { segredo, codigos } = await ligarSegundoFator(token);

    expect(codigos).toHaveLength(10);
    expect(new Set(codigos).size).toBe(10);
    for (const codigo of codigos) expect(codigo).toMatch(/^[a-z0-9]{5}-[a-z0-9]{5}$/);

    const gravado = await prisma.user.findUniqueOrThrow({ where: { id: conta.userId } });
    expect(gravado.totpEnabledAt).not.toBeNull();

    const linhas = await prisma.recoveryCode.findMany({ where: { userId: conta.userId } });
    expect(linhas).toHaveLength(10);
    const texto = JSON.stringify(linhas);
    for (const codigo of codigos) expect(texto).not.toContain(codigo);
    // O hash é HMAC de 64 hexadecimal, não texto nem base32 do segredo.
    expect(linhas[0]!.codeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(texto).not.toContain(segredo);

    // O aviso de segurança vai embora pela porta de entrega, sem segredo nenhum.
    const avisos = caixa.porRotulo("segundo-fator-ativado");
    expect(avisos).toHaveLength(1);
    expect(avisos[0]!.para).toBe(conta.email);
    expect(avisos[0]!.texto).toContain("ativada");
    expect(avisos[0]!.texto).not.toContain(segredo);

    const status = await get("/2fa/status", token);
    expect(status.json()).toMatchObject({ ligado: true, pendente: false, codigosRestantes: 10 });
  });

  it("depois de ligado a senha certa nao entra sozinha, e o desafio nao e sessao", async () => {
    const conta = registrou(await makeAccount("STAFF"));
    const token = await sessao(conta.email, conta.password);
    const { segredo } = await ligarSegundoFator(token);

    const tentativa = await entrar(conta.email, conta.password);
    expect(tentativa.status).toBe(200);
    expect(tentativa.corpo.twoFactorRequired).toBe(true);
    expect(tentativa.corpo.accessToken).toBeUndefined();
    expect(tentativa.corpo.refreshToken).toBeUndefined();
    const desafio = tentativa.corpo.challengeToken as string;
    expect(desafio).toBeTypeOf("string");

    // (a) o token de desafio não abre rota de negócio nenhuma: nem a própria conta.
    const vazamento = await get("/me", desafio);
    expect(vazamento.statusCode).toBe(401);

    // (b) código errado na etapa: 401, e nenhuma sessão nasce.
    const errado = await post("/2fa/challenge", { challengeToken: desafio, codigo: "123456" });
    expect(errado.statusCode).toBe(401);
    expect(errado.json().accessToken).toBeUndefined();

    // (c) o código do aplicativo entra, e só então a sessão existe.
    const certo = await post("/2fa/challenge", { challengeToken: desafio, codigo: codigoDoAplicativo(segredo) });
    expect(certo.statusCode).toBe(200);
    expect(certo.json().accessToken).toBeTypeOf("string");
    expect((certo.json() as Record<string, unknown>).user).toBeTypeOf("object");

    const evento = await prisma.auditLog.findFirst({
      where: { userId: conta.userId, action: "auth.login" },
      orderBy: { createdAt: "desc" },
    });
    expect(JSON.stringify(evento?.metadata ?? {})).toContain("totp");
  });

  it("uma sessao comum nao abre as rotas de etapa", async () => {
    // Os dois decoradores se recusam por construção: quem chega com a chave errada
    // não configura nem ativa segundo fator por cima de uma sessão normal.
    const conta = registrou(await makeAccount("STAFF"));
    const token = await sessao(conta.email, conta.password);
    expect((await post("/2fa/setup", {}, token)).statusCode).toBe(401);
    expect((await post("/2fa/activate", { codigo: "123456" }, token)).statusCode).toBe(401);
  });

  it("o codigo de recuperacao abre a porta uma vez e se gasta", async () => {
    const conta = registrou(await makeAccount("STAFF"));
    const token = await sessao(conta.email, conta.password);
    const { codigos } = await ligarSegundoFator(token);

    const primeiro = codigos[0]!;
    const desafio = (await entrar(conta.email, conta.password)).corpo.challengeToken as string;
    const entrada = await post("/2fa/challenge", { challengeToken: desafio, codigo: primeiro });
    expect(entrada.statusCode).toBe(200);
    const sessaoNova = (entrada.json() as { accessToken: string }).accessToken;
    expect(sessaoNova).toBeTypeOf("string");

    // O mesmo código de novo: queimado é queimado, e a resposta é a do código
    // inválido — sem "este já foi usado", que denunciaria o estado do lote.
    const outroDesafio = (await entrar(conta.email, conta.password)).corpo.challengeToken as string;
    const repetido = await post("/2fa/challenge", { challengeToken: outroDesafio, codigo: primeiro });
    expect(repetido.statusCode).toBe(401);

    const linha = await prisma.recoveryCode.findFirst({ where: { userId: conta.userId, usedAt: { not: null } } });
    expect(linha).not.toBeNull();
    const evento = await prisma.auditLog.findFirst({
      where: { userId: conta.userId, action: "auth.2fa_codigo_de_recuperacao_usado" },
    });
    expect(evento).not.toBeNull();
    expect(JSON.stringify(evento?.metadata ?? {})).toContain("restantes");

    const status = await get("/2fa/status", sessaoNova);
    expect(status.json()).toMatchObject({ ligado: true, codigosRestantes: 9 });
  });

  it("digitar o codigo de recuperacao sem o traco e a mesma porta", async () => {
    const conta = registrou(await makeAccount("STAFF"));
    const token = await sessao(conta.email, conta.password);
    const { codigos } = await ligarSegundoFator(token);
    const desafio = (await entrar(conta.email, conta.password)).corpo.challengeToken as string;

    const semTraco = (codigos[1] ?? "").replace("-", "");
    const entrada = await post("/2fa/challenge", { challengeToken: desafio, codigo: semTraco });
    expect(entrada.statusCode).toBe(200);
  });

  it("o codigo de recuperacao de outra conta nao abre esta porta", async () => {
    const conta = registrou(await makeAccount("STAFF"));
    const token = await sessao(conta.email, conta.password);
    const { codigos } = await ligarSegundoFator(token);

    const vizinha = registrou(await makeAccount("STAFF"));
    const tokenVizinha = await sessao(vizinha.email, vizinha.password);
    const { codigos: codigosDaVizinha } = await ligarSegundoFator(tokenVizinha);

    const desafio = (await entrar(conta.email, conta.password)).corpo.challengeToken as string;
    // O hash é único por código, mas a posse é conferida: um código válido de outra
    // conta não é segunda chance de ninguém.
    void codigos;
    const alheio = await post("/2fa/challenge", { challengeToken: desafio, codigo: codigosDaVizinha[0] ?? "" });
    expect(alheio.statusCode).toBe(401);
    expect(await prisma.recoveryCode.count({ where: { userId: conta.userId, usedAt: { not: null } } })).toBe(0);
  });

  it("desligar exige um codigo valido, nao a senha", async () => {
    const conta = registrou(await makeAccount("STAFF"));
    const token = await sessao(conta.email, conta.password);
    const { segredo } = await ligarSegundoFator(token);

    // A senha já está na mão de quem tem a sessão; se ela bastasse para desligar,
    // o segundo fator protegeria só até a primeira senha vazada.
    const semCodigo = await post("/2fa/desativar", { codigo: "000000" }, token);
    expect(semCodigo.statusCode).toBe(401);
    // Desligar com código errado não toca nada: o segredo e a data continuam lá.
    const antes = await prisma.user.findUniqueOrThrow({ where: { id: conta.userId } });
    expect(antes.totpEnabledAt).not.toBeNull();
    expect(antes.totpSecretCiphertext).not.toBeNull();

    const desligado = await post("/2fa/desativar", { codigo: codigoDoAplicativo(segredo) }, token);
    expect(desligado.json()).toEqual({ ok: true });

    const gravado = await prisma.user.findUniqueOrThrow({ where: { id: conta.userId } });
    expect(gravado.totpEnabledAt).toBeNull();
    expect(gravado.totpSecretCiphertext).toBeNull();
    expect(await prisma.recoveryCode.count({ where: { userId: conta.userId } })).toBe(0);

    const avisos = caixa.porRotulo("segundo-fator-desativado");
    expect(avisos).toHaveLength(1);

    // Desligado, a senha volta a entrar sozinha: o estado é o de antes de ligar.
    const entrada = await entrar(conta.email, conta.password);
    expect(entrada.corpo.accessToken).toBeTypeOf("string");
  });

  it("em producao, OWNER e admin da plataforma sao obrigados a ligar antes de entrar", async () => {
    const conta = registrou(await makeAccount("OWNER"));
    await comFlag("NODE_ENV", "production", async () => {
      await comFlag("TOTP_ENCRYPTION_KEY", CHAVE_DE_PROVA, async () => {
        const tentativa = await entrar(conta.email, conta.password);
        expect(tentativa.status).toBe(200);
        expect(tentativa.corpo.twoFactorSetupRequired).toBe(true);
        expect(tentativa.corpo.accessToken).toBeUndefined();
        const setupToken = tentativa.corpo.setupToken as string;
        expect(typeof setupToken).toBe("string");

        // O token de configuração só abre as rotas de etapa, e a recíproca é falsa:
        // um token de sessão comum não abre estas mesmas rotas (caso acima).
        const preparar = await post("/2fa/setup", {}, setupToken);
        expect(preparar.statusCode).toBe(200);
        const segredo = preparar.json().segredoBase32 as string;
        expect((preparar.json() as Record<string, unknown>).obrigatorio).toBe(true);

        // O segredo cifrado com a chave declarada: trocada a chave, nada abre.
        const gravado = await prisma.user.findUniqueOrThrow({ where: { id: conta.userId } });
        expect(gravado.totpSecretCiphertext!.startsWith("v1:")).toBe(true);

        const ativa = await post("/2fa/activate", { codigo: codigoDoAplicativo(segredo) }, setupToken);
        expect(ativa.statusCode).toBe(200);
        expect((ativa.json() as Record<string, unknown>).accessToken).toBeTypeOf("string");
        expect(((ativa.json() as { codigosDeRecuperacao: string[] }).codigosDeRecuperacao)).toHaveLength(10);

        // Ligado, não se desliga: em produção o papel obrigatório fica de fora da
        // opção de desligar o próprio escudo.
        const sessaoNova = (ativa.json() as { accessToken: string }).accessToken;
        const tentarDesligar = await post("/2fa/desativar", { codigo: codigoDoAplicativo(segredo) }, sessaoNova);
        expect(tentarDesligar.statusCode).toBe(409);
        expect(tentarDesligar.json().message).toContain("obrigatório");

        const status = await get("/2fa/status", sessaoNova);
        expect(status.json()).toMatchObject({ ligado: true, obrigatorio: true });
      });
    });
  });

  it("em producao o desafio de quem ja tem segundo fator continua a mesma etapa", async () => {
    // Dono com o fator ligado: a senha não entra sozinha em produção também, e a
    // resposta não diz a ninguém que aquela conta tem 2FA — é o caminho normal.
    const conta = registrou(await makeAccount("MANAGER"));
    await comFlag("TOTP_ENCRYPTION_KEY", CHAVE_DE_PROVA, async () => {
      const token = await sessao(conta.email, conta.password);
      const { segredo } = await ligarSegundoFator(token);

      await comFlag("NODE_ENV", "production", async () => {
        const tentativa = await entrar(conta.email, conta.password);
        expect(tentativa.corpo.twoFactorRequired).toBe(true);
        expect(tentativa.corpo.twoFactorSetupRequired).toBeUndefined();
        const entrada = await post("/2fa/challenge", {
          challengeToken: tentativa.corpo.challengeToken as string,
          codigo: codigoDoAplicativo(segredo),
        });
        expect(entrada.statusCode).toBe(200);
        expect((entrada.json() as Record<string, unknown>).accessToken).toBeTypeOf("string");
      });
    });
  });

  it("um segredo gravado por outra chave nao abre a porta, e nao devolve 500", async () => {
    // Rotação de `TOTP_ENCRYPTION_KEY` sem reenvio do segundo fator é o cenário: o
    // envelope existe, mas ninguém consegue lê-lo. A regra é fechar com uma frase
    // que nomeia a causa — nunca um erro criptográfico nu, nunca a entrada.
    const conta = registrou(await makeAccount("STAFF"));
    await comFlag("TOTP_ENCRYPTION_KEY", CHAVE_DE_PROVA, async () => {
      const token = await sessao(conta.email, conta.password);
      await ligarSegundoFator(token);
    });

    await comFlag("TOTP_ENCRYPTION_KEY", "d".repeat(63) + "b", async () => {
      const { corpo } = await entrar(conta.email, conta.password);
      expect(corpo.twoFactorRequired).toBe(true);
      const entrada = await post("/2fa/challenge", {
        challengeToken: corpo.challengeToken as string,
        codigo: "123456",
      });
      expect(entrada.statusCode).toBe(409);
      expect(entrada.json().message).toContain("chave de cifrações");
      // Nada da técnica vaza: nem o envelope, nem a chave, nem texto de GCM.
      expect(entrada.body).not.toMatch(/gcm|aes|digest|tag/i);

      const evento = await prisma.auditLog.findFirst({
        where: { userId: conta.userId, action: "auth.2fa_segredo_ilegivel" },
      });
      expect(evento).not.toBeNull();
    });
  });

  it("o codigo digitado com espacos e maiusculas e o mesmo codigo", async () => {
    // Ninguém digita um código de celular com formadura perfeita; a régua é a
    // forma canônica, e a tela pode mostrar como quiser.
    const conta = registrou(await makeAccount("STAFF"));
    const token = await sessao(conta.email, conta.password);
    const preparar = await post("/2fa/preparar", {}, token);
    const segredo = preparar.json().segredoBase32 as string;
    const codigo = codigoDoAplicativo(segredo);

    const ativado = await post("/2fa/ativar", { codigo: "  " + codigo + " " }, token);
    expect(ativado.statusCode).toBe(200);

    const { corpo } = await entrar(conta.email, conta.password);
    const recuperacao = ((ativado.json() as { codigosDeRecuperacao: string[] }).codigosDeRecuperacao[0] ?? "").toUpperCase();
    const entrada = await post("/2fa/challenge", { challengeToken: corpo.challengeToken as string, codigo: recuperacao });
    expect(entrada.statusCode).toBe(200);
  });

  it("a rota de etapa aceita o proprio token e recusa o token da outra etapa", async () => {
    // Os dois tokens de etapa são assinados com o mesmo segredo e o mesmo tempo.
    // O que os separa é o escopo, e a recusa acontece antes de qualquer leitura.
    const conta = registrou(await makeAccount("OWNER"));
    await comFlag("NODE_ENV", "production", async () => {
      await comFlag("TOTP_ENCRYPTION_KEY", CHAVE_DE_PROVA, async () => {
        const { corpo } = await entrar(conta.email, conta.password);
        const setupToken = corpo.setupToken as string;
        const segredo = (await post("/2fa/setup", {}, setupToken)).json().segredoBase32 as string;

        // Senha de novo: agora com segundo fator pendente e obrigatório, o caminho
        // continua o de configuração (não existe "desafio" antes de ligar).
        const deNovo = await entrar(conta.email, conta.password);
        const setupDeNovo = deNovo.corpo.setupToken as string;

        // O token de configuração não atravessa a rota de entrada.
        const troca = await post("/2fa/challenge", { challengeToken: setupDeNovo, codigo: codigoDoAplicativo(segredo) });
        expect(troca.statusCode).toBe(401);
      });
    });
  });
});
