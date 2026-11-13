import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app, login, cleanup, makeAccount, type Fixture } from "./helpers";
import { prisma } from "../src/lib/prisma";
import { ASSINATURA_DO_RASCUNHO, RASCUNHO_LEGAL } from "../src/modules/cms/cms.service";

// T6.6 (F7): os textos legais não podem ser inventados pelo produto.
//
// A casa escreve o texto e um advogado revisa. O que o software pode fazer é
// garantir que o texto em branco — ou o marcador que a prateleira vazia entrega
// — **não vire documento publicado**. Um site que publica "Termos de uso" sem
// texto não é um site sem texto: é um site que promete uma coisa que não diz.
//
// O que esta suíte mede, na ordem:
//  1. a prateleira vazia entrega um RASCUNHO marcado, que diz o que falta e
//     pede a revisão de um advogado — e a tela sabe que é rascunho;
//  2. publicar sem texto é recusado, e a recusa não muda nada no banco;
//  3. publicar o marcador intacto também é recusado;
//  4. com texto escrito, o documento publica, a versão sobe e o site passa a
//     mostrar o texto;
//  5. apagar o texto de um documento que já está publicado é recusado (o estado
//     resultante seria publicado sem texto);
//  6. despublicar é sempre possível, e não mexe no texto nem na versão.
const KINDS = ["TERMS", "PRIVACY", "LGPD"] as const;
type Kind = (typeof KINDS)[number];

type EstadoDaPrateleira = {
  title: string;
  content: string | null;
  published: boolean;
  version: number;
};

const prateleiraAntes = new Map<Kind, EstadoDaPrateleira | null>();

const TEXTO_REVISADO = [
  "Termos de uso — texto revisado por advogado em 2026.",
  "",
  "Este texto existe para a prova: a casa escreve o documento final e o Publicar",
  "no site só funciona com texto de verdade dentro.",
].join("\n");

describe("Textos legais: rascunho marcado e publicação com texto de verdade (T6.6)", () => {
  const trilha = { userIds: [] as string[], companyIds: [] as string[], emails: [] as string[] };
  let admin: { f: Fixture; token: string };
  const auth = (token: string) => ({ authorization: `Bearer ${token}` });

  async function leiaEstado(kind: Kind): Promise<EstadoDaPrateleira | null> {
    const linha = await prisma.legalDocument.findUnique({
      where: { kind },
      select: { title: true, content: true, published: true, version: true },
    });
    return linha ?? null;
  }

  async function devolvaEstado(kind: Kind) {
    const antes = prateleiraAntes.get(kind) ?? null;
    if (antes === null) {
      await prisma.legalDocument.deleteMany({ where: { kind } });
      return;
    }
    await prisma.legalDocument.update({ where: { kind }, data: antes });
  }

  beforeAll(async () => {
    for (const kind of KINDS) prateleiraAntes.set(kind, await leiaEstado(kind));
    const fa = await makeAccount("ADMIN", { plataforma: true });
    trilha.userIds.push(fa.userId);
    trilha.companyIds.push(fa.companyId);
    trilha.emails.push(fa.email);
    admin = { f: fa, token: await login(fa.email, fa.password) };
  });

  afterAll(async () => {
    // A prateleira volta a ser o que era, inclusive a versão — a mesma disciplina
    // do arquivo de aceite, porque os dois mexem no mesmo balcão.
    for (const kind of KINDS) await devolvaEstado(kind);
    await prisma.auditLog.deleteMany({ where: { action: { startsWith: "cms.legal" }, userId: admin.f.userId } });
    await cleanup(trilha);
  });

  it("a prateleira vazia entrega um rascunho marcado, que pede a revisão de um advogado", async () => {
    const res = await app.inject({ method: "GET", url: "/api/cms/legal", headers: auth(admin.token) });
    expect(res.statusCode).toBe(200);
    const docs = res.json().data as Array<{
      kind: Kind;
      content: string;
      published: boolean;
      rascunho: boolean;
      version: number;
    }>;
    expect(docs).toHaveLength(3);

    for (const doc of docs) {
      // É rascunho, e a tela recebe o aviso para não oferecer a publicação.
      expect(doc.rascunho).toBe(true);
      expect(doc.published).toBe(false);
      // O texto carrega a assinatura do marcador...
      expect(doc.content).toContain(ASSINATURA_DO_RASCUNHO);
      // ...diz que é um aviso, não uma cláusula...
      expect(doc.content).toMatch(/aviso/i);
      // ...e pede a revisão de um advogado.
      expect(doc.content).toMatch(/advogado/i);
      expect(doc.content).toMatch(/revis/i);
    }
  });

  it("publicar sem texto é recusado, e nada muda no banco nem na trilha", async () => {
    const antes = await leiaEstado("TERMS");
    const publicacoesAntes = await prisma.auditLog.count({ where: { action: "cms.legal.published" } });

    const res = await app.inject({
      method: "PUT",
      url: "/api/cms/legal/TERMS",
      headers: auth(admin.token),
      payload: { published: true },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toMatch(/advogado/i);

    const depois = await leiaEstado("TERMS");
    expect(depois?.published).toBe(false);
    expect(depois?.content).toBe(antes?.content);
    expect(depois?.version).toBe(antes?.version);
    expect(await prisma.auditLog.count({ where: { action: "cms.legal.published" } })).toBe(publicacoesAntes);
  });

  it("publicar o marcador intacto também é recusado", async () => {
    const antes = await leiaEstado("TERMS");
    const res = await app.inject({
      method: "PUT",
      url: "/api/cms/legal/TERMS",
      headers: auth(admin.token),
      payload: { content: RASCUNHO_LEGAL, published: true },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toMatch(/advogado/i);

    const depois = await leiaEstado("TERMS");
    expect(depois?.published).toBe(false);
    expect(depois?.content).toBe(antes?.content);
  });

  it("com texto escrito, o documento publica, a versão sobe e o site mostra", async () => {
    const antes = await leiaEstado("TERMS");
    const res = await app.inject({
      method: "PUT",
      url: "/api/cms/legal/TERMS",
      headers: auth(admin.token),
      payload: { content: TEXTO_REVISADO, published: true },
    });
    expect(res.statusCode).toBe(200);
    const corpo = res.json() as { published: boolean; rascunho: boolean; version: number; content: string };
    expect(corpo.published).toBe(true);
    expect(corpo.rascunho).toBe(false);
    expect(corpo.content).toBe(TEXTO_REVISADO);
    // O texto mudou, então a versão sobe — é ela que a linha de aceite guarda.
    expect(corpo.version).toBe((antes?.version ?? 1) + 1);

    // O site passa a mostrar o texto publicado.
    const publico = await app.inject({ method: "GET", url: "/api/public/legal/TERMS" });
    expect(publico.statusCode).toBe(200);
    expect((publico.json() as { content: string }).content).toBe(TEXTO_REVISADO);

    // E a publicação fica na trilha da plataforma, com o motivo escrito.
    const linha = await prisma.auditLog.findFirst({
      where: { action: "cms.legal.published" },
      orderBy: { createdAt: "desc" },
    });
    expect(linha).not.toBeNull();
    expect(linha!.scope).toBe("platform");
    expect(linha!.companyId).toBeNull();
    const meta = linha!.metadata as { kind?: string; publicado?: boolean };
    expect(meta.kind).toBe("TERMS");
    expect(meta.publicado).toBe(true);
  });

  it("apagar o texto de um documento já publicado é recusado", async () => {
    const antes = await leiaEstado("TERMS");
    expect(antes?.published).toBe(true);

    const res = await app.inject({
      method: "PUT",
      url: "/api/cms/legal/TERMS",
      headers: auth(admin.token),
      payload: { content: "" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toMatch(/advogado/i);

    const depois = await leiaEstado("TERMS");
    expect(depois?.content).toBe(TEXTO_REVISADO);
    expect(depois?.published).toBe(true);
    expect(depois?.version).toBe(antes?.version);
  });

  it("despublicar é sempre possível, e não mexe no texto nem na versão", async () => {
    const antes = await leiaEstado("TERMS");
    const res = await app.inject({
      method: "PUT",
      url: "/api/cms/legal/TERMS",
      headers: auth(admin.token),
      payload: { published: false },
    });
    expect(res.statusCode).toBe(200);
    const corpo = res.json() as { published: boolean; content: string; version: number; rascunho: boolean };
    expect(corpo.published).toBe(false);
    expect(corpo.content).toBe(TEXTO_REVISADO);
    expect(corpo.version).toBe(antes?.version);
    // O texto continua sendo texto de verdade: despublicar não devolve o
    // documento ao estado de rascunho.
    expect(corpo.rascunho).toBe(false);

    // E o site volta a dizer que o texto ainda não existe.
    const publico = await app.inject({ method: "GET", url: "/api/public/legal/TERMS" });
    expect(publico.statusCode).toBe(404);
  });
});
