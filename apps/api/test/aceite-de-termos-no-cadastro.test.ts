import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app, cleanup, login, makeAccount, uid } from "./helpers";
import { prisma } from "../src/lib/prisma";
import { LegalKind } from "@prisma/client";

// T6 (F7), item 1 do PROMPT MESTRE: "registro de aceite de termos e política
// (versão, data, IP, usuário) no cadastro".
//
// O produto já tinha a prateleira dos textos — `legal_documents`, com editor na
// plataforma e leitura pública que recusa documento não publicado — mas nada
// registava que alguém aceitou. Sem registro, "o usuário aceitou os termos" é uma
// afirmação do operador sobre o passado, e não sobrevive a uma pergunta.
//
// O que este arquivo cobra:
//  1. cadastro sem os dois aceites não cria conta, não cria empresa e não cria
//     linha nenhuma — a recusa vem antes de qualquer escrita;
//  2. um aceite isolado não basta: são dois textos e duas vontades;
//  3. com os dois, nasce uma linha por texto, com usuário, versão do documento,
//     data e o endereço de onde a pessoa aceitou;
//  4. a linha guarda a versão que estava em vigor naquele momento: o texto muda
//     depois, e a prova do aceite de ontem não muda com ele;
//  5. aceite de cadastro é do cadastro: a conta criada pela equipe numa empresa já
//     existente não tem aceite nenhum, porque ninguém marcou caixa por ela
//     (decisão D14 — padrão seguro, reversível, registrada em ADR).
//
// Nada aqui usa banco de desenvolvimento (D6): os endereços saem do `uid()` dos
// helpers e vivem no banco de prova, que a limpeza apaga no fim.

const auth = (token: string) => ({ authorization: `Bearer ${token}` });
const SENHA = "Forte@2026x";

const trilha = { userIds: [] as string[], companyIds: [] as string[], emails: [] as string[] };

// A prateleira dos textos é tabela de plataforma, não do tenant: quem escreve
// nela escreve no estado que os arquivos de teste seguintes leem. O `cms.test.ts`
// conta a partir dela (documento não publicado ⇒ 404 na leitura pública), e este
// arquivo publica o TERMS de propósito, para provar a versão do momento. Por
// isso o estado medido antes do primeiro caso entra na conta e sai no `afterAll`:
// é o §4 ("a prova escreve limpo no fim") aplicado a uma tabela que não é da
// pessoa que criou a linha.
type EstadoDaPrateleira = {
  title: string;
  content: string | null;
  published: boolean;
  version: number;
};

const prateleiraAntes = new Map<string, EstadoDaPrateleira | null>();

async function leiaEstadoDaPrateleira(kind: "TERMS" | "PRIVACY"): Promise<EstadoDaPrateleira | null> {
  const linha = await prisma.legalDocument.findUnique({
    where: { kind },
    select: { title: true, content: true, published: true, version: true },
  });
  return linha ?? null;
}

async function devolvaEstadoDaPrateleira(kind: "TERMS" | "PRIVACY") {
  const antes = prateleiraAntes.get(kind) ?? null;
  if (antes === null) {
    // A linha não existia antes deste arquivo: quem a criou foi o próprio
    // cadastro, pela prateleira vazia do `obterLegal`. Some com ela.
    await prisma.legalDocument.deleteMany({ where: { kind } });
    return;
  }
  await prisma.legalDocument.update({ where: { kind }, data: antes });
}

function registroDe(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, consentRecords: true },
  });
}

async function cadastrar(payload: Record<string, unknown>) {
  return app.inject({ method: "POST", url: "/api/auth/register", payload });
}

afterAll(async () => {
  // Ordem filho -> pai: os aceites apontam para as contas criadas pelo cadastro.
  await prisma.consentRecord.deleteMany({ where: { userId: { in: trilha.userIds } } });
  await cleanup(trilha);
  // A prateleira volta a ser o que era, inclusive a versão: ver o comentário de
  // `prateleiraAntes` logo acima, que é a razão deste arquivo existir.
  await devolvaEstadoDaPrateleira("TERMS");
  await devolvaEstadoDaPrateleira("PRIVACY");
});

beforeAll(async () => {
  prateleiraAntes.set("TERMS", await leiaEstadoDaPrateleira("TERMS"));
  prateleiraAntes.set("PRIVACY", await leiaEstadoDaPrateleira("PRIVACY"));
});

describe("Aceite de termos e política no cadastro (F7, item 1)", () => {
  it("sem os dois aceites o cadastro não cria nada", async () => {
    const email = `${uid("semaceite")}@nexus.test`;
    const antes = {
      usuarios: await prisma.user.count(),
      empresas: await prisma.company.count(),
      aceites: await prisma.consentRecord.count(),
    };

    const res = await cadastrar({ name: "Sem Aceite", email, password: SENHA });
    expect(res.statusCode).toBe(400);
    const corpo = res.json() as { issues: Array<{ path: string; message: string }> };
    // A mensagem diz qual caixa faltou, nos dois caminhos.
    expect(corpo.issues.some((i) => i.path === "aceitaTermos" && /Termos/.test(i.message))).toBe(true);
    expect(corpo.issues.some((i) => i.path === "aceitaPrivacidade" && /privacidade/.test(i.message))).toBe(true);

    const depois = {
      usuarios: await prisma.user.count(),
      empresas: await prisma.company.count(),
      aceites: await prisma.consentRecord.count(),
    };
    expect(depois).toEqual(antes);
    expect(await registroDe(email)).toBeNull();
  });

  it("aceitar só um dos dois textos não abre a conta", async () => {
    const email = `${uid("meioaceite")}@nexus.test`;
    const umSo = await cadastrar({
      name: "Meio Aceite", email, password: SENHA, aceitaTermos: true, aceitaPrivacidade: false,
    });
    expect(umSo.statusCode).toBe(400);
    expect(await registroDe(email)).toBeNull();

    // `false` explícito é a mesma recusa de `true` faltando: a caixa existe para
    // ser marcada, não para ser omitida.
    const semCampo = await cadastrar({
      name: "Meio Aceite", email, password: SENHA, aceitaTermos: true,
    });
    expect(semCampo.statusCode).toBe(400);
    expect(await registroDe(email)).toBeNull();
  });

  it("com os dois aceites, uma linha por texto guarda usuário, versão, data e IP", async () => {
    const email = `${uid("aceitou")}@nexus.test`;
    const res = await cadastrar({
      name: "Aceitou Tudo", email, password: SENHA, aceitaTermos: true, aceitaPrivacidade: true,
    });
    expect(res.statusCode).toBe(201);
    const corpo = res.json() as { user: { id: string; companyId: string } };
    trilha.userIds.push(corpo.user.id);
    trilha.companyIds.push(corpo.user.companyId);
    trilha.emails.push(email);

    const registro = await registroDe(email);
    expect(registro?.name).toBe("Aceitou Tudo");
    expect(registro?.consentRecords).toHaveLength(2);

    const porTipo = new Map(registro?.consentRecords.map((c) => [c.kind, c]));
    expect([...porTipo.keys()].sort()).toEqual(["PRIVACY", "TERMS"]);

    // Versão = a que o documento tinha naquele instante. Se a tabela de textos
    // ainda não tinha linha, o serviço cria a prateleira vazia (versão 1), que é
    // exatamente o que `obterLegal` já faz para o editor — por isso a linha tem de
    // existir aqui, e o número dela é o mesmo da linha de aceite.
    const termosAgora = await prisma.legalDocument.findUnique({ where: { kind: LegalKind.TERMS } });
    const privacidadeAgora = await prisma.legalDocument.findUnique({ where: { kind: LegalKind.PRIVACY } });
    expect(termosAgora).not.toBeNull();
    expect(privacidadeAgora).not.toBeNull();
    expect(porTipo.get(LegalKind.TERMS)!.version).toBe(termosAgora!.version);
    expect(porTipo.get(LegalKind.PRIVACY)!.version).toBe(privacidadeAgora!.version);

    expect(porTipo.get(LegalKind.TERMS)!.userId).toBe(corpo.user.id);
    // Data do aceite, e o endereço de onde ele foi dado.
    expect(porTipo.get(LegalKind.TERMS)!.acceptedAt.getTime()).toBeLessThanOrEqual(Date.now());
    expect(porTipo.get(LegalKind.TERMS)!.ip).not.toBeNull();
    // Nenhum conteúdo de documento, nenhum token, nenhuma senha dentro da linha.
    expect(JSON.stringify(porTipo.get(LegalKind.TERMS))).not.toMatch(/password|token/i);
  });

  it("a linha guarda a versão do momento, e o texto que muda depois não a reescreve", async () => {
    const f = await makeAccount("OWNER", { plataforma: true });
    trilha.userIds.push(f.userId);
    trilha.companyIds.push(f.companyId);
    trilha.emails.push(f.email);
    const token = await login(f.email, f.password);

    // 1. publica um texto de rascunho e lê a versão que está em vigor.
    const publicado = await app.inject({
      method: "PUT", url: "/api/cms/legal/TERMS", headers: auth(token),
      payload: { title: "Termos de uso", content: "Rascunho 1: o produto guarda seus dados.", published: true },
    });
    expect(publicado.statusCode).toBe(200);
    const primeira = publicado.json() as { version: number; published: boolean };
    expect(primeira.published).toBe(true);
    expect(primeira.version).toBeTypeOf("number");

    const email1 = `${uid("v1")}@nexus.test`;
    const cadastro1 = await cadastrar({
      name: "Leu A Versao 1", email: email1, password: SENHA, aceitaTermos: true, aceitaPrivacidade: true,
    });
    expect(cadastro1.statusCode).toBe(201);
    const corpo1 = cadastro1.json() as { user: { id: string; companyId: string } };
    trilha.userIds.push(corpo1.user.id);
    trilha.companyIds.push(corpo1.user.companyId);
    trilha.emails.push(email1);

    // 2. o texto muda de conteúdo: a versão sobe.
    const reescrito = await app.inject({
      method: "PUT", url: "/api/cms/legal/TERMS", headers: auth(token),
      payload: { content: "Rascunho 2: agora com o capítulo de retenção de dados." },
    });
    expect(reescrito.statusCode).toBe(200);
    const segunda = reescrito.json() as { version: number };
    expect(segunda.version).toBe(primeira.version + 1);

    // 3. quem aceitou a primeira continua registrado na primeira.
    const linhaAntiga = await prisma.consentRecord.findFirst({
      where: { userId: corpo1.user.id, kind: LegalKind.TERMS },
    });
    expect(linhaAntiga?.version).toBe(primeira.version);

    // 4. e quem chega agora aceita a segunda.
    const email2 = `${uid("v2")}@nexus.test`;
    const cadastro2 = await cadastrar({
      name: "Leu A Versao 2", email: email2, password: SENHA, aceitaTermos: true, aceitaPrivacidade: true,
    });
    expect(cadastro2.statusCode).toBe(201);
    const corpo2 = cadastro2.json() as { user: { id: string; companyId: string } };
    trilha.userIds.push(corpo2.user.id);
    trilha.companyIds.push(corpo2.user.companyId);
    trilha.emails.push(email2);
    const linhaNova = await prisma.consentRecord.findFirst({
      where: { userId: corpo2.user.id, kind: LegalKind.TERMS },
    });
    expect(linhaNova?.version).toBe(segunda.version);

    // Mudar só o título não é mudar o texto aceito.
    const soTitulo = await app.inject({
      method: "PUT", url: "/api/cms/legal/TERMS", headers: auth(token),
      payload: { title: "Termos de uso do produto" },
    });
    expect(soTitulo.statusCode).toBe(200);
    expect((soTitulo.json() as { version: number }).version).toBe(segunda.version);
  });

  it("a conta criada pela equipe não tem aceite, porque ninguém marcou caixa por ela", async () => {
    const f = await makeAccount("ADMIN");
    trilha.userIds.push(f.userId);
    trilha.companyIds.push(f.companyId);
    trilha.emails.push(f.email);
    const token = await login(f.email, f.password);

    const email = `${uid("equipe")}@nexus.test`;
    const criado = await app.inject({
      method: "POST", url: "/api/users", headers: auth(token),
      payload: { name: "Da Equipe", email, password: SENHA, role: "STAFF" },
    });
    expect(criado.statusCode).toBe(201);
    const corpo = criado.json() as { id: string };
    trilha.userIds.push(corpo.id);

    expect(await prisma.consentRecord.count({ where: { userId: corpo.id } })).toBe(0);
  });
});
