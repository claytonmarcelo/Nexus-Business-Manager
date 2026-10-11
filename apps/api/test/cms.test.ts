import { describe, it, expect, afterAll, beforeEach } from "vitest";
import { app, makeAccount, login, cleanup } from "./helpers";
import { prisma } from "../src/lib/prisma";
import { recarregarEstado } from "../src/modules/cms/cms.service";

// CMS da página pública + modo manutenção. Estes testes provam o combinado do
// módulo: a leitura pública é anônima e nunca entrega o segredo do pulso, a
// escrita é de quem responde pela plataforma (content:read/write só OWNER,
// porque a vitrine é global), a gravação parcial faz merge sem sumir da tela,
// item inativo some da vitrine, documento legal não publicado é 404, a trilha
// de auditoria registra cada passo e o modo manutenção fecha a API inteira —
// menos o caminho de volta (auth, health, público, cms) — para quem tem pulso
// ou IP da lista.
describe("CMS da página pública", () => {
  const created: { userIds: string[]; companyIds: string[]; itemIds: string[] } = {
    userIds: [],
    companyIds: [],
    itemIds: [],
  };
  const auth = (token: string) => ({ authorization: `Bearer ${token}` });
  const SENHA = "SenhaForte123!";

  async function dono() {
    const f = await makeAccount("OWNER");
    created.userIds.push(f.userId);
    created.companyIds.push(f.companyId);
    return { f, token: await login(f.email, SENHA) };
  }

  beforeEach(() => {
    recarregarEstado();
  });

  afterAll(async () => {
    // Estado global de vitrine: desliga manutenção e limpa o que foi gravado.
    await prisma.landingConfig.updateMany({
      where: { id: "default" },
      data: { maintenance: { ativa: false, mensagem: "", previsao: "", ipsPermitidos: [] } },
    });
    recarregarEstado();
    await prisma.landingItem.deleteMany({ where: { id: { in: created.itemIds } } });
    await prisma.legalDocument.updateMany({
      where: { kind: "TERMS" },
      data: { content: null, published: false },
    });
    await cleanup(created);
    await app.close();
  });

  it("leitura pública é anônima e não vaza o token de pulso", async () => {
    const res = await app.inject({ method: "GET", url: "/api/public/landing" });
    expect(res.statusCode).toBe(200);
    const corpo = res.json();
    expect(corpo.headline.length).toBeGreaterThan(5);
    expect(corpo.cores.marca).toMatch(/^#[0-9a-f]{6}$/);
    expect(corpo.hero.overlay).toBeGreaterThanOrEqual(0);
    expect(corpo.manutencao).toHaveProperty("ativa");
    // O pulso não existe na resposta pública, nem por sobrenome de campo.
    expect(JSON.stringify(corpo)).not.toMatch(/pulso|token/i);
  });

  it("escrita exige content:write — ADMIN, MANAGER e STAFF recebem 403", async () => {
    for (const role of ["ADMIN", "MANAGER", "STAFF"] as const) {
      const f = await makeAccount(role);
      created.userIds.push(f.userId);
      created.companyIds.push(f.companyId);
      const token = await login(f.email, SENHA);
      const res = await app.inject({
        method: "PATCH",
        url: "/api/cms/config",
        headers: auth(token),
        payload: { headline: "Tentativa de " + role },
      });
      expect(res.statusCode).toBe(403);
    }
    const { token } = await dono();
    const liberado = await app.inject({
      method: "PATCH",
      url: "/api/cms/config",
      headers: auth(token),
      payload: { headline: "Gestão empresarial do jeito certo", subheadline: "Um parágrafo honesto sobre o produto, com mais de quarenta caracteres para a checagem de SEO passar." },
    });
    expect(liberado.statusCode).toBe(200);
    expect(liberado.json().headline).toBe("Gestão empresarial do jeito certo");
  });

  it("gravação parcial faz merge e cor fora do padrão devolve 400", async () => {
    const { token } = await dono();
    const antes = (await app.inject({ method: "GET", url: "/api/cms/config", headers: auth(token) })).json();
    const soUmaCor = await app.inject({
      method: "PATCH",
      url: "/api/cms/config",
      headers: auth(token),
      payload: { cores: { marca: "#ff0000" } },
    });
    expect(soUmaCor.statusCode).toBe(200);
    const depois = soUmaCor.json();
    expect(depois.cores.marca).toBe("#ff0000");
    // Nada do resto sumiu: o merge é bloco a bloco, não o objeto inteiro.
    expect(depois.cores.fundo).toBe(antes.cores.fundo);
    expect(depois.hero.ctaPrimario).toBe(antes.hero.ctaPrimario);
    expect(depois.headline).toBe(antes.headline);

    const ruim = await app.inject({
      method: "PATCH",
      url: "/api/cms/config",
      headers: auth(token),
      payload: { cores: { marca: "vermelho" } },
    });
    expect(ruim.statusCode).toBe(400);

    await app.inject({ method: "PATCH", url: "/api/cms/config", headers: auth(token), payload: { cores: { marca: antes.cores.marca } } });
  });

  it("item da vitrine nasce, edita, aparece no payload público e pode ser ocultado", async () => {
    const { token } = await dono();
    recarregarEstado();
    const criado = await app.inject({
      method: "POST",
      url: "/api/cms/items",
      headers: auth(token),
      payload: {
        kind: "FEATURE",
        title: "Financeiro",
        body: "Receitas, despesas e o retrato honesto do mês.",
        meta: { icone: "◫", rota: "/app/financeiro" },
        order: 3,
      },
    });
    expect(criado.statusCode).toBe(201);
    const id = criado.json().id as string;
    created.itemIds.push(id);
    expect(criado.json().meta.icone).toBe("◫");

    const publico = (await app.inject({ method: "GET", url: "/api/public/landing" })).json();
    expect(publico.capacidades.some((c: { id: string }) => c.id === id)).toBe(true);

    const oculto = await app.inject({
      method: "PATCH",
      url: `/api/cms/items/${id}`,
      headers: auth(token),
      payload: { active: false },
    });
    expect(oculto.statusCode).toBe(200);
    recarregarEstado();
    const vitrine = (await app.inject({ method: "GET", url: "/api/public/landing" })).json();
    expect(vitrine.capacidades.some((c: { id: string }) => c.id === id)).toBe(false);

    const removido = await app.inject({ method: "DELETE", url: `/api/cms/items/${id}`, headers: auth(token) });
    expect(removido.statusCode).toBe(200);
    const naoExiste = await app.inject({ method: "PATCH", url: `/api/cms/items/${id}`, headers: auth(token), payload: { order: 1 } });
    expect(naoExiste.statusCode).toBe(404);
  });

  it("depoimento leva estrelas e métrica leva valor e formato", async () => {
    const { token } = await dono();
    const depoimento = await app.inject({
      method: "POST",
      url: "/api/cms/items",
      headers: auth(token),
      payload: { kind: "TESTIMONIAL", title: "Fechou o mês em um dia", body: "Texto do cliente.", author: "Cliente", role: "Gestor", meta: { estrelas: 5, empresa: "Empresa X" } },
    });
    expect(depoimento.statusCode).toBe(201);
    created.itemIds.push(depoimento.json().id as string);

    const metrica = await app.inject({
      method: "POST",
      url: "/api/cms/items",
      headers: auth(token),
      payload: { kind: "METRIC", title: "Empresas no ar", meta: { valor: 12, formato: "numero" } },
    });
    expect(metrica.statusCode).toBe(201);
    created.itemIds.push(metrica.json().id as string);

    const estrelasRuins = await app.inject({
      method: "POST",
      url: "/api/cms/items",
      headers: auth(token),
      payload: { kind: "TESTIMONIAL", title: "Exagero", meta: { estrelas: 9 } },
    });
    expect(estrelasRuins.statusCode).toBe(400);

    recarregarEstado();
    const publico = (await app.inject({ method: "GET", url: "/api/public/landing" })).json();
    const d = publico.depoimentos.find((x: { id: string }) => x.id === depoimento.json().id);
    expect(d.meta.estrelas).toBe(5);
    const m = publico.metricas.find((x: { id: string }) => x.id === metrica.json().id);
    expect(m.meta.valor).toBe(12);
    expect(m.meta.formato).toBe("numero");
  });

  it("kind inválido é recusado e a lista do editor filtra por tipo", async () => {
    const { token } = await dono();
    const ruim = await app.inject({
      method: "POST",
      url: "/api/cms/items",
      headers: auth(token),
      payload: { kind: "POPUP", title: "Não existe esse tipo" },
    });
    expect(ruim.statusCode).toBe(400);

    const lista = await app.inject({ method: "GET", url: "/api/cms/items?kind=FAQ", headers: auth(token) });
    expect(lista.statusCode).toBe(200);
    expect(Array.isArray(lista.json().data)).toBe(true);
    expect(lista.json().data.every((f: { kind: string }) => f.kind === "FAQ")).toBe(true);
  });

  it("nota de SEO mede o que está preenchido, sem inflar", async () => {
    const { token } = await dono();
    const res = await app.inject({ method: "GET", url: "/api/cms/seo/score", headers: auth(token) });
    expect(res.statusCode).toBe(200);
    const score = res.json();
    expect(score.total).toBeGreaterThan(0);
    expect(score.nota).toBeGreaterThanOrEqual(0);
    expect(score.nota).toBeLessThanOrEqual(100);
    expect(score.itens.some((i: { item: string }) => i.item === "Imagem de compartilhamento (og:image)")).toBe(true);

    await app.inject({
      method: "PATCH",
      url: "/api/cms/config",
      headers: auth(token),
      payload: { seo: { ogImagem: "", canonica: "" } },
    });
    const baixo = (await app.inject({ method: "GET", url: "/api/cms/seo/score", headers: auth(token) })).json();
    const og = baixo.itens.find((i: { item: string }) => i.item.startsWith("Imagem"));
    expect(og.alcancado).toBe(false);

    const comImagem = await app.inject({
      method: "PATCH",
      url: "/api/cms/config",
      headers: auth(token),
      payload: { seo: { ogImagem: "https://nexus.example.com/og.png" } },
    });
    expect(comImagem.statusCode).toBe(200);
    const alto = (await app.inject({ method: "GET", url: "/api/cms/seo/score", headers: auth(token) })).json();
    expect(alto.itens.find((i: { item: string }) => i.item.startsWith("Imagem")).alcancado).toBe(true);
    expect(alto.nota).toBeGreaterThan(baixo.nota);
  });

  it("token de pulso é novo a cada clique e o documento legal só aparece publicado", async () => {
    const { token } = await dono();
    const um = (await app.inject({ method: "POST", url: "/api/cms/maintenance/token", headers: auth(token) })).json();
    const dois = (await app.inject({ method: "POST", url: "/api/cms/maintenance/token", headers: auth(token) })).json();
    expect(um.token).toMatch(/^[0-9a-f]{18}$/);
    expect(um.token).not.toBe(dois.token);

    const anonimo = await app.inject({ method: "POST", url: "/api/cms/maintenance/token" });
    expect(anonimo.statusCode).toBe(401);

    const antes = await app.inject({ method: "GET", url: "/api/public/legal/TERMS" });
    expect(antes.statusCode).toBe(404);

    const rascunho = await app.inject({
      method: "PUT",
      url: "/api/cms/legal/TERMS",
      headers: auth(token),
      payload: { content: "Texto dos termos de uso do Nexus Business Manager." },
    });
    expect(rascunho.statusCode).toBe(200);
    expect(rascunho.json().published).toBe(false);
    expect((await app.inject({ method: "GET", url: "/api/public/legal/TERMS" })).statusCode).toBe(404);

    const publicado = await app.inject({
      method: "PUT",
      url: "/api/cms/legal/TERMS",
      headers: auth(token),
      payload: { published: true },
    });
    expect(publicado.json().published).toBe(true);
    const publico = await app.inject({ method: "GET", url: "/api/public/legal/TERMS" });
    expect(publico.statusCode).toBe(200);
    expect(publico.json().content).toContain("termos de uso");
  });

  it("modo manutenção fecha a API de negócio, menos o caminho de volta", async () => {
    const { f, token } = await dono();
    recarregarEstado();
    const antes = await app.inject({ method: "GET", url: "/api/clients", headers: auth(token) });
    expect(antes.statusCode).toBe(200);

    const acendeu = await app.inject({
      method: "PATCH",
      url: "/api/cms/config",
      headers: auth(token),
      payload: { manutencao: { ativa: true, mensagem: "Voltamos em cinco minutos", previsaoEm: new Date(Date.now() + 300_000).toISOString() } },
    });
    expect(acendeu.statusCode).toBe(200);
    recarregarEstado();

    const fechado = await app.inject({ method: "GET", url: "/api/clients", headers: auth(token) });
    expect(fechado.statusCode).toBe(503);
    expect(fechado.json().message).toBe("Voltamos em cinco minutos");
    expect(fechado.json().previsaoEm).toMatch(/^\d{4}-/);

    // O editor é o caminho de volta: se a manutenção fechasse o CMS, ninguém
    // conseguiria desligá-la pela tela.
    const cms = await app.inject({ method: "GET", url: "/api/cms/config", headers: auth(token) });
    expect(cms.statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/api/health" })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/api/public/landing" })).statusCode).toBe(200);
    expect((await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: f.email, password: SENHA } })).statusCode).toBe(200);

    const pulso = (await app.inject({ method: "POST", url: "/api/cms/maintenance/token", headers: auth(token) })).json();
    const semPulso = await app.inject({ method: "GET", url: "/api/products", headers: auth(token) });
    expect(semPulso.statusCode).toBe(503);
    const comPulso = await app.inject({
      method: "GET",
      url: "/api/products",
      headers: { ...auth(token), "x-nexus-pulse": pulso.token },
    });
    expect(comPulso.statusCode).toBe(200);
    const pulsoErrado = await app.inject({
      method: "GET",
      url: "/api/products",
      headers: { ...auth(token), "x-nexus-pulse": "deadbeefdeadbeef" },
    });
    expect(pulsoErrado.statusCode).toBe(503);

    // IP da lista entra sem pulso; IP fora dela continua na porta.
    await app.inject({
      method: "PATCH",
      url: "/api/cms/config",
      headers: auth(token),
      payload: { manutencao: { ipsPermitidos: ["203.0.113.7"] } },
    });
    recarregarEstado();
    const deDentro = await app.inject({ method: "GET", url: "/api/clients", headers: auth(token), remoteAddress: "203.0.113.7" });
    expect(deDentro.statusCode).toBe(200);
    const deFora = await app.inject({ method: "GET", url: "/api/clients", headers: auth(token), remoteAddress: "198.51.100.9" });
    expect(deFora.statusCode).toBe(503);

    // O visitante pergunta ao servidor se o pulso dele vale — a resposta é só
    // sim/não, nunca o segredo.
    const checagem = await app.inject({ method: "POST", url: "/api/public/bypass", payload: { token: pulso.token } });
    expect(checagem.statusCode).toBe(200);
    expect(checagem.json().liberado).toBe(true);
    expect(checagem.body).not.toContain(pulso.token);
    const recusado = await app.inject({ method: "POST", url: "/api/public/bypass", payload: { token: "nao-e-o-pulso" } });
    expect(recusado.json().liberado).toBe(false);

    await app.inject({ method: "PATCH", url: "/api/cms/config", headers: auth(token), payload: { manutencao: { ativa: false, ipsPermitidos: [] } } });
    recarregarEstado();
    expect((await app.inject({ method: "GET", url: "/api/clients", headers: auth(token) })).statusCode).toBe(200);
  });

  it("cada gravação do CMS deixa trilha na auditoria da empresa de quem editou", async () => {
    const { f, token } = await dono();
    await app.inject({ method: "PATCH", url: "/api/cms/config", headers: auth(token), payload: { headline: "Headline auditado para o teste" } });
    const item = await app.inject({
      method: "POST",
      url: "/api/cms/items",
      headers: auth(token),
      payload: { kind: "FAQ", title: "O sistema isola por empresa?", body: "Sim: a empresa ativa vem do token." },
    });
    created.itemIds.push(item.json().id as string);

    const logs = await prisma.auditLog.findMany({
      where: { userId: f.userId, entity: { in: ["landing_config", "landing_item"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    expect(logs.some((l) => l.action === "cms.config.updated")).toBe(true);
    expect(logs.some((l) => l.action === "cms.item.created" && l.entityId === item.json().id)).toBe(true);
    expect(logs.every((l) => l.companyId === f.companyId)).toBe(true);
  });
});
