import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app, login, cleanup, makeAccount, type Fixture } from "./helpers";
import { prisma } from "../src/lib/prisma";

// T6.6 (F7): a trilha de auditoria é o livro de receipts da casa — quem praticou
// a ação, de onde veio, o que mudou. O livro precisa ser seguro de ler, e o
// lugar óbvio para um segredo vazar é justamente ele: a pessoa digita a senha,
// o servidor registra "login falhou", e o metadata carrega o que veio no
// corpo.
//
// A régua deste arquivo é dupla, e as duas metades se completam:
//
//  1. **forma** — nenhuma chave de metadata com cara de segredo (senha, token,
//     hash, secret, autorização, cookie);
//  2. **valor** — nenhum valor que seja o segredo de verdade: a senha digitada,
//     a senha antiga, a senha nova, o token de acesso, o token de renovação —
//     e nada com o formato de JWT ou de hash bcrypt.
//
// A forma pega o descuido do futuro; o valor pega o descuido de hoje. Uma
// frase como "token rotacionado reapresentado" é inocente: é um VALOR, não uma
// chave, e não é o token de ninguém. Por isso a régua olha os dois lados em
// vez de procurar a palavra "senha" no texto inteiro — assim ela não grita
// com a frase e não deixa passar o segredo.
const CHAVE_PROIBIDA = /(senha|password|passwd|secret|secreto|token|hash|jwt|authorization|autorizacao|cookie|api[-_]?key)/i;
const FORMATO_DE_JWT = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/;
const FORMATO_DE_HASH = /\$2[aby]\$\d{2}\$/;

const SENHA_ANTIGA = "SenhaForte123!";
const SENHA_ERRADA = "SenhaErrada9!";
const SENHA_NOVA = "SenhaNova456!";
const TEXTO_LEGAL = "Termos de uso da casa de prova: texto revisado, sem segredo dentro.";

type Linha = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  userId: string | null;
  companyId: string | null;
  metadata: unknown;
};

function valoresDoMetadata(metadata: unknown): Array<{ chave: string; valor: unknown }> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
  return Object.entries(metadata as Record<string, unknown>).map(([chave, valor]) => ({ chave, valor }));
}

function textoDoMetadata(metadata: unknown): string {
  return JSON.stringify(metadata ?? {});
}

describe("A trilha de auditoria não guarda senha, token nem corpo sensível (T6.6)", () => {
  const trilha = { userIds: [] as string[], companyIds: [] as string[], emails: [] as string[] };
  let conta: { f: Fixture; token: string };
  let admin: { f: Fixture; token: string };
  let segredos: string[] = [];
  let inicio = new Date();
  // O documento LGPD é global (não é de nenhuma empresa). A prova publica um
  // texto nele, e a prateleira volta a ser o que era no fim — inclusive o
  // conteúdo e a versão, porque outro arquivo de teste conta com isso.
  let legalAntes: { title: string; content: string | null; published: boolean; version: number } | null = null;

  const auth = (token: string) => ({ authorization: `Bearer ${token}` });

  beforeAll(async () => {
    legalAntes = await prisma.legalDocument.findUnique({
      where: { kind: "LGPD" },
      select: { title: true, content: true, published: true, version: true },
    });
    const fc = await makeAccount("OWNER");
    const fa = await makeAccount("ADMIN", { plataforma: true });
    trilha.userIds.push(fc.userId, fa.userId);
    trilha.companyIds.push(fc.companyId, fa.companyId);
    trilha.emails.push(fc.email, fa.email);

    // O login é feito aqui (e não pelo helper) porque a prova precisa do token de
    // sessão inteiro para conferir que nenhum deles vaza para a trilha.
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: fc.email, password: SENHA_ANTIGA },
    });
    expect(res.statusCode).toBe(200);
    const corpo = res.json() as { accessToken: string; refreshToken: string };
    conta = { f: fc, token: corpo.accessToken };
    admin = { f: fa, token: await login(fa.email, SENHA_ANTIGA) };

    segredos = [SENHA_ANTIGA, SENHA_ERRADA, SENHA_NOVA, corpo.accessToken, corpo.refreshToken];
    inicio = new Date();
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { createdAt: { gte: inicio } } });
    if (legalAntes) {
      await prisma.legalDocument.update({ where: { kind: "LGPD" }, data: legalAntes });
    } else {
      await prisma.legalDocument.deleteMany({ where: { kind: "LGPD" } });
    }
    await cleanup(trilha);
  });

  it("a falha de senha guarda o endereço da pessoa e não a senha", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: conta.f.email, password: SENHA_ERRADA },
    });
    expect(res.statusCode).toBe(401);

    const linhas = await prisma.auditLog.findMany({
      where: { action: "auth.login.failed", createdAt: { gte: inicio } },
      orderBy: { createdAt: "desc" },
    });
    const linha = linhas.find((l) => textoDoMetadata(l.metadata).includes(conta.f.email));
    expect(linha).toBeDefined();

    // O endereço entra (é o que a pessoa precisa para reconhecer a conta em
    // questão), e a senha que ela digitou não.
    expect(textoDoMetadata(linha!.metadata)).not.toContain(SENHA_ERRADA);
    expect(textoDoMetadata(linha!.metadata)).not.toContain(SENHA_ANTIGA);
    expect(textoDoMetadata(linha!.metadata)).not.toMatch(FORMATO_DE_HASH);
    for (const { chave } of valoresDoMetadata(linha!.metadata)) {
      expect(chave).not.toMatch(CHAVE_PROIBIDA);
    }
  });

  it("a troca de senha não deixa a senha antiga nem a nova na trilha", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/change-password",
      headers: auth(conta.token),
      payload: { currentPassword: SENHA_ANTIGA, newPassword: SENHA_NOVA },
    });
    expect(res.statusCode).toBe(200);

    const linha = await prisma.auditLog.findFirst({
      where: { action: "auth.password_changed", createdAt: { gte: inicio } },
      orderBy: { createdAt: "desc" },
    });
    expect(linha).not.toBeNull();
    const texto = textoDoMetadata(linha!.metadata);
    expect(texto).not.toContain(SENHA_ANTIGA);
    expect(texto).not.toContain(SENHA_NOVA);
    expect(texto).not.toMatch(FORMATO_DE_HASH);
    for (const { chave } of valoresDoMetadata(linha!.metadata)) {
      expect(chave).not.toMatch(CHAVE_PROIBIDA);
    }
  });

  it("a exportação dos dados da pessoa não joga o corpo do pedido na trilha", async () => {
    const res = await app.inject({ method: "GET", url: "/api/lgpd/meus-dados", headers: auth(conta.token) });
    expect(res.statusCode).toBe(200);

    const linha = await prisma.auditLog.findFirst({
      where: { action: "lgpd.export", createdAt: { gte: inicio } },
      orderBy: { createdAt: "desc" },
    });
    expect(linha).not.toBeNull();
    // O evento da exportação não carrega metadata: o que a pessoa levou embora
    // fica na resposta, não no livro de receipts.
    const texto = textoDoMetadata(linha!.metadata);
    expect(texto).not.toContain(conta.f.email);
    expect(texto).not.toMatch(FORMATO_DE_JWT);
    for (const { chave } of valoresDoMetadata(linha!.metadata)) {
      expect(chave).not.toMatch(CHAVE_PROIBIDA);
    }
  });

  it("a publicação de um texto legal não joga o texto do documento na trilha", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/api/cms/legal/LGPD",
      headers: auth(admin.token),
      payload: { content: TEXTO_LEGAL, published: true },
    });
    expect(res.statusCode).toBe(200);

    const linha = await prisma.auditLog.findFirst({
      where: { action: "cms.legal.published", createdAt: { gte: inicio } },
      orderBy: { createdAt: "desc" },
    });
    expect(linha).not.toBeNull();
    expect(textoDoMetadata(linha!.metadata)).not.toContain(TEXTO_LEGAL);
    for (const { chave } of valoresDoMetadata(linha!.metadata)) {
      expect(chave).not.toMatch(CHAVE_PROIBIDA);
    }
  });

  it("nenhuma linha da prova carrega senha, token, hash ou chave de segredo", async () => {
    // O arquivo inteiro é varrido — não só as linhas dos casos acima. Uma
    // rota nova que comece a gravar um segredo quebra este teste.
    const linhas = (await prisma.auditLog.findMany({
      where: { createdAt: { gte: inicio } },
    })) as Linha[];
    // Piso de grandeza: uma varredura que não encontra nada não prova nada.
    expect(linhas.length).toBeGreaterThanOrEqual(4);

    const chavesProibidas: string[] = [];
    const valoresProibidos: string[] = [];
    for (const linha of linhas) {
      for (const { chave, valor } of valoresDoMetadata(linha.metadata)) {
        if (CHAVE_PROIBIDA.test(chave)) chavesProibidas.push(`${linha.action} :: ${chave}`);
        if (typeof valor === "string") {
          for (const segredo of segredos) {
            if (valor.includes(segredo)) valoresProibidos.push(`${linha.action} :: ${chave}`);
          }
          if (FORMATO_DE_JWT.test(valor)) valoresProibidos.push(`${linha.action} :: ${chave} (formato de JWT)`);
          if (FORMATO_DE_HASH.test(valor)) valoresProibidos.push(`${linha.action} :: ${chave} (formato de hash)`);
        }
      }
    }

    expect(chavesProibidas).toEqual([]);
    expect(valoresProibidos).toEqual([]);
  });
});
