import { describe, it, expect, afterAll, beforeEach, afterEach } from "vitest";
import { app, makeAccount, cleanup, comFlag, type Fixture } from "./helpers";
import { prisma } from "../src/lib/prisma";
import { hashToken } from "../src/lib/tokens";
import { verifyPassword } from "../src/lib/password";
import { fakeMailer } from "../src/lib/mail/fake";
import { definirMailer } from "../src/lib/mail";
import type { RotuloDeMail } from "../src/lib/mail/porta";

// T3.1 (decisão D1 do dono): "enviar e-mail" deixou de ser devolver o código na
// resposta HTTP. A regra que este arquivo prova, na ordem:
//   1. o código sai pela porta de entrega, para a caixa postal de quem pediu;
//   2. a resposta HTTP continua muda — sem código, sem detalhe de entrega;
//   3. pedir recuperação não revela se o e-mail existe;
//   4. o código vence (meia hora) e queima no primeiro uso, e queimar um código
//      inutiliza os outros pedidos antes;
//   5. uma falha de entrega não vaza nada e não trava a pessoa para sempre.
//
// O entregador é a caixa em memória (`fakeMailer`) injetada por `definirMailer`:
// nenhuma conexão de rede sai do teste, e o que ele lê é exatamente a mensagem
// que a aplicação montou.

const caixa = fakeMailer();

/**
 * O codigo que a ultima mensagem de recuperacao trouxe. Extrai do corpo do e-mail,
 * nunca de uma saida de debug: a prova de que a pessoa consegue redefinir a senha e
 * a prova de que o codigo chegou escrito sao a mesma coisa.
 */
function ultimoCodigoEntregue(rotulo: RotuloDeMail = "recuperacao-de-senha"): string {
  const mensagem = caixa.porRotulo(rotulo).at(-1);
  const achado = /[0-9a-f]{48}/.exec(mensagem?.texto ?? "")?.[0];
  if (!achado) throw new Error("nenhum codigo chegou na caixa postal de " + rotulo);
  return achado;
}

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

async function pedirRecuperacao(email: string) {
  return app.inject({ method: "POST", url: "/api/auth/forgot-password", payload: { email } });
}

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
  await app.close();
});

describe("Recuperação de senha entregue por e-mail (D1)", () => {
  it("o codigo chega na caixa postal e o HTTP nao carrega nada dele", async () => {
    const conta = registrou(await makeAccount("OWNER"));
    const res = await pedirRecuperacao(conta.email);
    expect(res.statusCode).toBe(200);

    // (1) a mensagem saiu pela porta, com o rótulo certo e para o endereço certo.
    const mensagens = caixa.porRotulo("recuperacao-de-senha");
    expect(mensagens).toHaveLength(1);
    expect(mensagens[0]!.para.toLowerCase()).toBe(conta.email.toLowerCase());
    expect(mensagens[0]!.assunto).toBe("Código de recuperação de senha");

    // (2) o corpo da resposta não tem código nenhum: nem o hex de 48 caracteres,
    // nem a palavra que a versão de desenvolvimento usava.
    expect(res.body).not.toMatch(/[0-9a-f]{32,}/);
    expect(res.body.toLowerCase()).not.toContain("modo desenvolvimento");
    expect(res.json()).toEqual({ ok: true });

    // (3) o código que a pessoa recebeu é o mesmo que o banco guarda — conferido
    // pelo hash, nunca comparando texto em claro com uma coluna do banco.
    const codigo = (mensagens[0]!.texto.match(/\b[0-9a-f]{48}\b/) ?? [])[0]!;
    expect(codigo).toBeTypeOf("string");
    const gravado = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(codigo) } });
    expect(gravado?.userId).toBe(conta.userId);

    // a validade escrita na mensagem é a mesma da coluna: 30 minutos.
    expect(mensagens[0]!.texto).toContain("30 minutos");
    const minutos = (gravado!.expiresAt.getTime() - Date.now()) / 60_000;
    expect(minutos).toBeGreaterThan(28);
    expect(minutos).toBeLessThanOrEqual(30);
  });

  it("e-mail inexistente responde a mesma coisa, e nenhuma mensagem sai", async () => {
    const antes = caixa.caixa.length;
    const res = await pedirRecuperacao("ninguem.existe-" + Date.now() + "@nexus.test");
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(caixa.caixa.length).toBe(antes);
  });

  it("fora de producao o codigo continua visivel na resposta, e a mensagem vai junto", async () => {
    // A chave de desenvolvimento não é mais um atalho que troca a entrega: ela é
    // uma segunda janela para a mesma mensagem. O teste depende das duas — o
    // fluxo de tela usa o código do corpo, e a prova de D1 usa a caixa.
    const conta = registrou(await makeAccount("ADMIN"));
    await comFlag("AUTH_EXPOSE_RESET_TOKEN", "1", async () => {
      const res = await pedirRecuperacao(conta.email);
      const devToken = (res.json() as { devToken?: string }).devToken;
      expect(devToken).toBeTypeOf("string");
      const enviada = caixa.porRotulo("recuperacao-de-senha").at(-1);
      expect(enviada?.texto).toContain(devToken);
    });
  });

  it("um codigo queima no primeiro uso, e o segundo pedido deixa de valer", async () => {
    const conta = registrou(await makeAccount("OWNER"));
    const senhaNova = "Recuperada@2026";

    const primeiro = await pedirRecuperacao(conta.email);
    expect(primeiro.statusCode).toBe(200);
    const codigo = ultimoCodigoEntregue();

    // segundo pedido antes de usar o primeiro: dois códigos vivos na mesma conta.
    await pedirRecuperacao(conta.email);
    const codigos = caixa.porRotulo("recuperacao-de-senha").map((m) => (m.texto.match(/\b[0-9a-f]{48}\b/) ?? [])[0]);
    expect(new Set(codigos).size).toBe(2);

    const troca = await app.inject({
      method: "POST", url: "/api/auth/reset-password",
      payload: { email: conta.email, token: codigo, password: senhaNova },
    });
    expect(troca.statusCode).toBe(200);

    // o mesmo código de novo: 401, e a mesma frase de sempre (sem "já foi usado",
    // que diria a quem ataquei que aquele código existiu).
    const repetido = await app.inject({
      method: "POST", url: "/api/auth/reset-password",
      payload: { email: conta.email, token: codigo, password: "Outra@2026x" },
    });
    expect(repetido.statusCode).toBe(401);
    expect(repetido.json().message).toBe("Código de recuperação inválido ou expirado");

    // e o OUTRO código vivo da mesma conta não vale mais: trocar a senha fecha a
    // janela inteira, não só a linha usada.
    const outro = codigos.find((c) => c !== codigo);
    const peloOutro = await app.inject({
      method: "POST", url: "/api/auth/reset-password",
      payload: { email: conta.email, token: outro, password: "MaisOutra@2026" },
    });
    expect(peloOutro.statusCode).toBe(401);

    // a senha que ficou é a primeira trocada.
    const guardada = await prisma.user.findUniqueOrThrow({ where: { id: conta.userId } });
    expect(await verifyPassword(senhaNova, guardada.passwordHash)).toBe(true);
  });

  it("codigo vencido nao redefine senha nenhuma", async () => {
    const conta = registrou(await makeAccount("OWNER"));
    await pedirRecuperacao(conta.email);
    const codigo = ultimoCodigoEntregue();

    // Viagem no tempo pela coluna, sem mexer em relógio de processo: o que se
    // prova é a checagem de `expiresAt`, não a idade real da linha.
    await prisma.passwordResetToken.update({
      where: { tokenHash: hashToken(codigo) },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const res = await app.inject({
      method: "POST", url: "/api/auth/reset-password",
      payload: { email: conta.email, token: codigo, password: "Vencida@2026x" },
    });
    expect(res.statusCode).toBe(401);
    const guardada = await prisma.user.findUniqueOrThrow({ where: { id: conta.userId } });
    expect(await verifyPassword(conta.password, guardada.passwordHash)).toBe(true);
  });

  it("falha de entrega nao vaza detalhe e a pessoa pode pedir de novo", async () => {
    const conta = registrou(await makeAccount("OWNER"));
    caixa.falharApos(0);

    const res = await pedirRecuperacao(conta.email);
    // A resposta é a mesma de sempre: a falha é do servidor de e-mail, e contá-la
    // pela tela seria dizer a quem não é o dono que aquele endereço existe.
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(res.body.toLowerCase()).not.toContain("falhou");

    // O evento fica na auditoria, onde o erro de verdade pode ser lido.
    const evento = await prisma.auditLog.findFirst({
      where: { userId: conta.userId, action: "auth.forgot_password_entrega_falhou" },
      orderBy: { createdAt: "desc" },
    });
    expect(evento).not.toBeNull();
    // ...e a auditoria não carrega o texto do erro nem o código: só o rótulo.
    expect(JSON.stringify(evento?.metadata ?? {})).not.toMatch(/[0-9a-f]{32,}/);

    caixa.falharApos(Number.POSITIVE_INFINITY);
    const nova = await pedirRecuperacao(conta.email);
    expect(nova.json()).toEqual({ ok: true });
    expect(caixa.porRotulo("recuperacao-de-senha").length).toBeGreaterThan(0);
  });
});
