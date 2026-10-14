import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { app, cleanup, comFlag, makeAccount, uid } from "./helpers";
import { prisma } from "../src/lib/prisma";
import { hashToken } from "../src/lib/tokens";
import { env } from "../src/config/env";
import { fakeMailer } from "../src/lib/mail/fake";
import { definirMailer } from "../src/lib/mail";
import { aguardarFilaDeMail } from "../src/lib/mail/fila";
import { strongPassword } from "../src/lib/passwordPolicy";

// T3.3 (decisão D2 do dono): conta sem e-mail confirmado não entra no painel.
//
// A régua tem de valer nos dois lados da flag, e é isso que este arquivo prova:
//   1. desligada (dev e suíte de testes), o cadastro entrega sessão como sempre
//      entregou — nenhum teste depende de ler caixa de e-mail;
//   2. ligada (produção), o cadastro não entrega sessão nenhuma: entrega a
//      mensagem e para na tela de "confirme seu e-mail";
//   3. sem confirmação, a senha CERTA não abre o painel;
//   4. o link confirma, e o mesmo login passa a entrar;
//   5. link vale uma vez só, e confirmar um gasta os outros da mesma conta;
//   6. link vencido e link inexistente respondem a mesma frase — a tela de
//      confirmação é pública, e um "esse link era de uma conta que existe" também
//      é canal de informação;
//   7. reenvio não denuncia endereço cadastrado, e não martela o administrador da
//      plataforma (que não tem caixa postal de verdade);
//   8. quem criou a conta antes de a flag ser ligada tem saída pelo reenvio — a
//      barreira é do produto, não uma sentença de morte para a conta.
//
// O entregador é a caixa em memória de `fakeMailer`: nenhuma rede sai do teste, e
// o que ele lê é exatamente a mensagem que a aplicação montou. Desde a T5.3
// (achado N58) quem entrega é a fila do processo, então os pedidos que enfileiram
// mensagem (`cadastrar`, `reenviar`) drenam a fila antes de devolver — a prova de
// que o request não espera o provedor está em `fila-de-mail.test.ts`.

const caixa = fakeMailer();
const SENHA = "SenhaForte123!";

let criado: { userIds: string[]; companyIds: string[]; emails: string[] } = {
  userIds: [],
  companyIds: [],
  emails: [],
};

function registrou(f: { userId: string; companyId: string; email: string }): typeof f {
  criado.userIds.push(f.userId);
  criado.companyIds.push(f.companyId);
  criado.emails.push(f.email);
  return f;
}

// Com a flag ligada o cadastro devolve `{verificationRequired:true}` e nada de id,
// então a limpeza precisa achar a conta pelo endereço — é o mesmo caminho que a
// pessoa usa na tela, e mantém o fixture honesto sobre o que a API entregou.
async function registrouContaDe(email: string): Promise<{ userId: string; companyId: string }> {
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const vinculo = await prisma.companyUser.findFirstOrThrow({ where: { userId: user.id } });
  registrou({ userId: user.id, companyId: vinculo.companyId, email: user.email });
  return { userId: user.id, companyId: vinculo.companyId };
}

// IP novo por pedido, pelo mesmo motivo da suíte de bloqueio: as rotas de cadastro,
// confirmação e reenvio mantêm o limite real de cinco/dez pedidos por minuto por
// endereço, e um caso que tenta três vezes do mesmo lugar receberia 429 em vez do
// comportamento que estamos provando.
let ipDaCase = 0;
function novoIp(): string {
  ipDaCase += 1;
  return "10.88." + Math.floor(ipDaCase / 254) + "." + (ipDaCase % 254) + ".7";
}

async function cadastrar(email: string, nome = "Conta de Prova") {
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    remoteAddress: novoIp(),
    payload: { name: nome, email, password: SENHA },
  });
  // Drenamos a fila depois do que enfileira mensagem (N58): este arquivo prova o
  // conteúdo da mensagem e o que o banco guarda, não o tempo do request — que é
  // objeto de `fila-de-mail.test.ts`.
  await aguardarFilaDeMail();
  return res;
}

function entrar(email: string, password = SENHA) {
  return app.inject({
    method: "POST",
    url: "/api/auth/login",
    remoteAddress: novoIp(),
    payload: { email, password },
  });
}

function confirmar(token: string) {
  return app.inject({
    method: "POST",
    url: "/api/auth/verify-email",
    remoteAddress: novoIp(),
    payload: { token },
  });
}

async function reenviar(email: string) {
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/resend-verification",
    remoteAddress: novoIp(),
    payload: { email },
  });
  await aguardarFilaDeMail();
  return res;
}

/** O código de 48 hexadecimal que a última mensagem de verificação trouxe. */
function codigoDaUltimaMensagem(): string {
  const mensagem = caixa.porRotulo("verificacao-de-email").at(-1);
  const achado = /[0-9a-f]{48}/.exec(mensagem?.texto ?? "")?.[0];
  if (!achado) throw new Error("nenhum codigo de verificacao chegou na caixa postal");
  return achado;
}

/** A linha de token que corresponde ao código entregue (prova de que é hash, não texto). */
async function linhaDoCodigo(codigo: string) {
  return prisma.emailVerificationToken.findFirstOrThrow({
    where: { tokenHash: hashToken(codigo) },
    orderBy: { createdAt: "desc" },
  });
}

let tokensAntes = 0;

beforeAll(async () => {
  tokensAntes = await prisma.emailVerificationToken.count();
});

beforeEach(async () => {
  // Drena antes de limpar: entrega atrasada do caso anterior não entra nesta caixa.
  await aguardarFilaDeMail();
  caixa.limpar();
  definirMailer(caixa);
});

afterEach(async () => {
  await aguardarFilaDeMail();
  definirMailer(undefined);
});

afterAll(async () => {
  await cleanup(criado);
  criado = { userIds: [], companyIds: [], emails: [] };
  // Prova de que a limpeza não deixou rastro no banco de prova (regra 4 do contrato):
  // os tokens caem junto do usuário por cascata, e um número maior aqui significaria
  // linha órfã acumulando suíte após suíte.
  const depois = await prisma.emailVerificationToken.count();
  expect(depois).toBeLessThanOrEqual(tokensAntes);
  await app.close();
});

describe("Verificação de e-mail do cadastro (D2)", () => {
  it("com a flag desligada o cadastro entrega sessao e nenhuma mensagem sai", async () => {
    // O estado de desenvolvimento e de teste: a régua está desligada, o fluxo é o
    // antigo, e ninguém precisa de caixa de e-mail para rodar a suíte.
    expect(env.REQUIRE_EMAIL_VERIFICATION).toBe("0");
    const email = uid("aberta") + "@nexus.test";
    const res = await cadastrar(email);
    expect(res.statusCode).toBe(201);
    const corpo = res.json() as { user?: { id: string }; accessToken?: unknown; refreshToken?: unknown; verificationRequired?: unknown };
    expect(corpo.accessToken).toBeTypeOf("string");
    expect(corpo.refreshToken).toBeTypeOf("string");
    expect(corpo.verificationRequired).toBeUndefined();
    expect(caixa.porRotulo("verificacao-de-email")).toHaveLength(0);

    const conta = await registrouContaDe(email);
    expect(conta.userId).toBe(corpo.user?.id);

    const entrada = await entrar(email);
    expect(entrada.statusCode).toBe(200);
  });

  it("com a flag ligada o cadastro nao entrega sessao, e a mensagem sai com o link", async () => {
    await comFlag("REQUIRE_EMAIL_VERIFICATION", "1", async () => {
      const email = uid("fechada") + "@nexus.test";
      const res = await cadastrar(email, "Ana de Prova");
      expect(res.statusCode).toBe(201);

      // (1) nada de sessão no corpo: nem access, nem refresh, nem id de usuário.
      expect(res.json()).toEqual({ verificationRequired: true });

      // (2) a mensagem saiu, para a caixa certa, com o link do produto.
      const mensagens = caixa.porRotulo("verificacao-de-email");
      expect(mensagens).toHaveLength(1);
      expect(mensagens[0]!.para).toBe(email);
      expect(mensagens[0]!.assunto).toBe("Confirme o seu e-mail");
      expect(mensagens[0]!.texto).toContain(env.WEB_BASE_URL + "/verificar-e-mail?token=");
      expect(mensagens[0]!.texto).toContain("7 dias");
      // O primeiro nome, não o nome completo: mensagem de produto, não de log.
      expect(mensagens[0]!.texto).toContain("Olá, Ana.");

      // (3) o banco guarda o hash, nunca o código em claro.
      const codigo = codigoDaUltimaMensagem();
      const gravado = await linhaDoCodigo(codigo);
      expect(gravado.tokenHash).toBe(hashToken(codigo));
      expect(gravado.tokenHash).not.toContain(codigo);
      expect(gravado.usedAt).toBeNull();
      const dias = (gravado.expiresAt.getTime() - Date.now()) / 86_400_000;
      expect(dias).toBeGreaterThan(6.9);
      expect(dias).toBeLessThanOrEqual(7);
      await registrouContaDe(email);
    });
  });

  it("sem confirmar, a senha certa nao abre o painel", async () => {
    await comFlag("REQUIRE_EMAIL_VERIFICATION", "1", async () => {
      const email = uid("semconfirmar") + "@nexus.test";
      await cadastrar(email);
      const codigo = codigoDaUltimaMensagem();
      const { userId } = await registrouContaDe(email);

      const tentada = await entrar(email);
      expect(tentada.statusCode).toBe(403);
      expect(tentada.json().message).toBe("Confirme o seu e-mail para entrar. Reenvie a mensagem se ela não chegou.");
      expect(tentada.body).not.toContain(codigo);
      expect((tentada.json() as Record<string, unknown>).accessToken).toBeUndefined();

      // e a senha continua válida: a conta não foi punida por não ter lido o
      // e-mail, ela só está do lado de fora da porta.
      expect(await prisma.user.findUniqueOrThrow({ where: { id: userId } })).toMatchObject({
        emailVerifiedAt: null,
      });
    });
  });

  it("o link confirma a conta e o mesmo login passa a entrar", async () => {
    await comFlag("REQUIRE_EMAIL_VERIFICATION", "1", async () => {
      const email = uid("confirmada") + "@nexus.test";
      await cadastrar(email);
      const codigo = codigoDaUltimaMensagem();
      const linha = await linhaDoCodigo(codigo);
      await registrouContaDe(email);

      const res = await confirmar(codigo);
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ ok: true, email });

      const usuaria = await prisma.user.findUniqueOrThrow({ where: { id: linha.userId } });
      expect(usuaria.emailVerifiedAt).not.toBeNull();
      expect((await prisma.emailVerificationToken.findUniqueOrThrow({ where: { id: linha.id } })).usedAt).not.toBeNull();

      const entrada = await entrar(email);
      expect(entrada.statusCode).toBe(200);
      expect((entrada.json() as Record<string, unknown>).accessToken).toBeTypeOf("string");
    });
  });

  it("um link vale uma vez, e confirmar um gasta os outros da mesma conta", async () => {
    await comFlag("REQUIRE_EMAIL_VERIFICATION", "1", async () => {
      const email = uid("duplo") + "@nexus.test";
      await cadastrar(email);
      const primeiro = codigoDaUltimaMensagem();

      await reenviar(email);
      const segundo = codigoDaUltimaMensagem();
      expect(segundo).not.toBe(primeiro);
      const linha = await linhaDoCodigo(primeiro);
      await registrouContaDe(email);

      expect((await confirmar(primeiro)).statusCode).toBe(200);

      // o mesmo link de novo: 400, e a frase que não diz "já foi usado" — dizer
      // isso seria confirmar a quem testa que aquele código existiu.
      const repetido = await confirmar(primeiro);
      expect(repetido.statusCode).toBe(400);

      // e o outro link vivo da mesma conta também morreu: não há sete janelas
      // abertas para uma conta só.
      const peloOutro = await confirmar(segundo);
      expect(peloOutro.statusCode).toBe(400);
      expect(peloOutro.json().message).toBe(repetido.json().message);

      const vivos = await prisma.emailVerificationToken.count({
        where: { userId: linha.userId, usedAt: null },
      });
      expect(vivos).toBe(0);
    });
  });

  it("link vencido e link que nunca existiu respondem exatamente a mesma frase", async () => {
    await comFlag("REQUIRE_EMAIL_VERIFICATION", "1", async () => {
      const email = uid("vencido") + "@nexus.test";
      await cadastrar(email);
      const codigo = codigoDaUltimaMensagem();
      const linha = await linhaDoCodigo(codigo);
      await registrouContaDe(email);

      // Viagem no tempo pela coluna: o que se prova é a checagem de `expiresAt`.
      await prisma.emailVerificationToken.update({
        where: { id: linha.id },
        data: { expiresAt: new Date(Date.now() - 60_000) },
      });

      const vencido = await confirmar(codigo);
      const inventado = await confirmar("f".repeat(48));
      expect(vencido.statusCode).toBe(400);
      expect(inventado.statusCode).toBe(400);
      expect(vencido.json().message).toBe("Este link de confirmação não é mais válido. Reenvie a mensagem.");
      expect(inventado.json().message).toBe(vencido.json().message);

      // e nenhuma das duas confirma a conta.
      expect(await prisma.user.findUniqueOrThrow({ where: { id: linha.userId } })).toMatchObject({
        emailVerifiedAt: null,
      });
    });
  });

  it("o reenvio nao denuncia endereco cadastrado nem martela quem nao tem caixa postal", async () => {
    await comFlag("REQUIRE_EMAIL_VERIFICATION", "1", async () => {
      // (1) endereço que não existe: 200 genérico, nenhuma mensagem.
      const fantasma = uid("ninguem") + "@nexus.test";
      const antes = caixa.caixa.length;
      const pedido = await reenviar(fantasma);
      expect(pedido.statusCode).toBe(200);
      expect(pedido.json()).toEqual({ ok: true });
      expect(caixa.caixa.length).toBe(antes);

      // (2) conta já confirmada: também 200, também nenhuma mensagem.
      const email = uid("jaconfirmada") + "@nexus.test";
      await cadastrar(email);
      const codigo = codigoDaUltimaMensagem();
      await registrouContaDe(email);
      await confirmar(codigo);
      const depoisDeConfirmar = caixa.caixa.length;
      const reenvio = await reenviar(email);
      expect(reenvio.json()).toEqual({ ok: true });
      expect(caixa.caixa.length).toBe(depoisDeConfirmar);

      // (3) administrador da plataforma: a conta é fictícia e não tem caixa postal
      // de verdade — mesma trava que a recuperação de senha já tem.
      const admin = registrou(await makeAccount("OWNER", { plataforma: true }));
      const paraAdmin = await reenviar(admin.email);
      expect(paraAdmin.statusCode).toBe(200);
      expect(caixa.porRotulo("verificacao-de-email").some((m) => m.para === admin.email)).toBe(false);
    });
  });

  it("falha de entrega nao vaza detalhe e o reenvio continua sendo a saida", async () => {
    await comFlag("REQUIRE_EMAIL_VERIFICATION", "1", async () => {
      const email = uid("entregafalhou") + "@nexus.test";
      caixa.falharApos(0);

      const res = await cadastrar(email);
      // A conta existe, o token está gravado, e a resposta é a mesma de sempre: a
      // falha é do servidor de e-mail, não da pessoa.
      expect(res.statusCode).toBe(201);
      expect(res.json()).toEqual({ verificationRequired: true });
      expect(res.body.toLowerCase()).not.toContain("falhou");

      const { userId } = await registrouContaDe(email);
      const eventos = await prisma.auditLog.findMany({
        where: { userId, action: { startsWith: "auth.verificacao" } },
        orderBy: { createdAt: "asc" },
      });
      const acoes = eventos.map((e) => e.action);
      // A falha fica registrada, e a linha de "enviada" NÃO vem junto: auditoria de
      // entrega que carimba sucesso depois de um erro não serve para ninguém.
      expect(acoes).toContain("auth.verificacao_entrega_falhou");
      expect(acoes).not.toContain("auth.verificacao_enviada");

      caixa.falharApos(Number.POSITIVE_INFINITY);
      const novoPedido = await reenviar(email);
      expect(novoPedido.json()).toEqual({ ok: true });
      expect((await confirmar(codigoDaUltimaMensagem())).statusCode).toBe(200);
    });
  });

  it("a auditoria mascara o endereco e nunca carrega o token", async () => {
    await comFlag("REQUIRE_EMAIL_VERIFICATION", "1", async () => {
      const email = uid("mascarada") + "@nexus.test";
      await cadastrar(email);
      const codigo = codigoDaUltimaMensagem();
      const { userId } = await registrouContaDe(email);
      await confirmar(codigo);

      const eventos = await prisma.auditLog.findMany({
        where: {
          userId,
          action: {
            in: ["auth.verificacao_enviada", "auth.email_confirmado", "auth.register_aguarda_verificacao"],
          },
        },
      });
      expect(eventos.length).toBeGreaterThan(0);
      const texto = JSON.stringify(eventos.map((e) => e.metadata ?? {}));
      expect(texto).not.toContain(codigo);
      expect(texto).not.toMatch(/[0-9a-f]{48}/);
      // A caixa postal inteira não aparece: `m***@nexus.test` é o que fica.
      expect(texto).not.toContain(email);
      expect(texto).toContain("@nexus.test");
    });
  });

  it("conta criada antes de a flag ser ligada tem saida pelo reenvio", async () => {
    // A flag é decisão de ambiente: ela pode ser ligada depois de a conta existir.
    // Esse cadastro acontece com a régua desligada, sem confirmação nenhuma.
    const email = uid("antiga") + "@nexus.test";
    expect((await cadastrar(email)).statusCode).toBe(201);
    await registrouContaDe(email);

    await comFlag("REQUIRE_EMAIL_VERIFICATION", "1", async () => {
      expect((await entrar(email)).statusCode).toBe(403);

      expect((await reenviar(email)).json()).toEqual({ ok: true });
      const codigo = codigoDaUltimaMensagem();
      expect((await confirmar(codigo)).statusCode).toBe(200);

      expect((await entrar(email)).statusCode).toBe(200);
    });
  });

  it("a politica de senha continua a mesma do cadastro com verificacao", () => {
    // Nada da F4 afrouxa a regra de acesso do projeto: se uma mudança futura
    // relaxasse `strongPassword` "para o fluxo de verificação", este caso acende.
    expect(strongPassword.safeParse("abc123").success).toBe(false);
    expect(strongPassword.safeParse("senhadaminhaviva").success).toBe(false);
    expect(strongPassword.safeParse(SENHA).success).toBe(true);
  });
});
