import { describe, it, expect, afterAll } from "vitest";
import { app, makeAccount, login, cleanup, type Fixture } from "./helpers";
import { prisma } from "../src/lib/prisma";

// Configurações (seção 37): dados cadastrais da empresa, moeda, fuso, idioma, meta
// de receita, perfil da conta e troca de senha. O que fica provado aqui:
// - a regra brasileira é do servidor: CNPJ com dígito verificador, CEP, UF, DDD,
//   moeda, fuso e idioma conhecidos pela plataforma, e o 400 diz qual campo errou;
// - a escrita é parcial — o bloco que não veio no corpo não é apagado, e campo
//   inventado volta 400 em vez de ser ignorado em silêncio;
// - settings:write é de quem gestão a empresa (OWNER e ADMIN); MANAGER e STAFF não;
// - a conta, ao contrário, é de todo papel: cada um edita o próprio nome e telefone;
// - o token só alcança a própria empresa, e cada gravação sensível deixa rastro;
// - trocar a senha derruba todas as sessões abertas.

const auth = (token: string) => ({ authorization: `Bearer ${token}` });
const SENHA = "SenhaForte123!";
const NOVA_SENHA = "NovaSenhaForte456#";
// 11222333000181 é o CNPJ canônico de teste: os dois dígitos verificadores conferem.
const CNPJ_OK = "11.222.333/0001-81";
const CNPJ_ERRADO = "11.222.333/0001-82";

type Resposta = Awaited<ReturnType<typeof app.inject>>;

function mensagemDeCampo(res: Resposta, campo: string): string {
  const corpo = res.json() as { issues?: { path: string; message: string }[] };
  return corpo.issues?.find((i) => i.path === campo)?.message ?? "";
}

// Um só app para os dois blocos: fechar o servidor no fim de um descreveria o
// outro, então a limpeza é do arquivo e os dois grupos compartilham a lista.
const created: { userIds: string[]; companyIds: string[] } = { userIds: [], companyIds: [] };

afterAll(async () => {
  await cleanup(created);
  await app.close();
});

describe("Configurações da empresa", () => {
  let dono: { f: Fixture; token: string } | undefined;

  async function setupDono() {
    if (dono) return dono;
    const f = await makeAccount("OWNER");
    created.userIds.push(f.userId);
    created.companyIds.push(f.companyId);
    dono = { f, token: await login(f.email, SENHA) };
    return dono;
  }

  async function patch(token: string, payload: Record<string, unknown>): Promise<Resposta> {
    return app.inject({ method: "PATCH", url: "/api/companies/current", headers: auth(token), payload });
  }

  it("GET /companies/current devolve a empresa no shape que a tela lê", async () => {
    const { f, token } = await setupDono();
    const res = await app.inject({ method: "GET", url: "/api/companies/current", headers: auth(token) });
    expect(res.statusCode).toBe(200);
    const corpo = res.json() as Record<string, unknown>;
    expect(corpo.id).toBe(f.companyId);
    expect(corpo.role).toBe("OWNER");
    expect(corpo.currency).toBe("BRL");
    expect(corpo.timezone).toBe("America/Sao_Paulo");
    expect(corpo.language).toBe("pt-BR");
    expect(corpo.revenueTarget).toBeNull();
    expect(corpo.cnpj).toBeNull();
  });

  it("grava o cadastro normalizado: documento, telefone e CEP viram algarismos, UF vira maiúscula", async () => {
    const { token } = await setupDono();
    const res = await patch(token, {
      legalName: "Nexus Testes Ltda",
      cnpj: CNPJ_OK,
      phone: "(11) 3333-4444",
      email: "Fiscal@NexusTest.test",
      zipCode: "01310-100",
      street: "Avenida Paulista",
      number: "1000",
      district: "Bela Vista",
      city: "São Paulo",
      stateUf: "sp",
    });
    expect(res.statusCode).toBe(200);
    const corpo = res.json() as { empresa: Record<string, string | null>; alterados: string[] };
    expect(corpo.empresa.cnpj).toBe("11222333000181");
    expect(corpo.empresa.phone).toBe("1133334444");
    expect(corpo.empresa.zipCode).toBe("01310100");
    expect(corpo.empresa.stateUf).toBe("SP");
    expect(corpo.empresa.email).toBe("fiscal@nexustest.test");
    expect(corpo.alterados).toEqual(expect.arrayContaining(["cnpj", "phone", "zipCode", "stateUf", "email"]));
  });

  it("gravação parcial não apaga o bloco que não veio", async () => {
    const { token } = await setupDono();
    const antes = await patch(token, { cnpj: CNPJ_OK });
    expect((antes.json() as { empresa: { cnpj: string } }).empresa.cnpj).toBe("11222333000181");

    const res = await patch(token, { currency: "USD", timezone: "UTC", language: "en-US" });
    expect(res.statusCode).toBe(200);
    const corpo = res.json() as { empresa: Record<string, unknown>; alterados: string[] };
    expect(corpo.empresa.cnpj).toBe("11222333000181");
    expect(corpo.empresa.currency).toBe("USD");
    expect(corpo.empresa.timezone).toBe("UTC");
    expect(corpo.empresa.language).toBe("en-US");
    expect(corpo.alterados).toEqual(["currency", "timezone", "language"]);

    // Devolve ao padrão do produto para os próximos casos não dependerem de ordem.
    await patch(token, { currency: "BRL", timezone: "America/Sao_Paulo", language: "pt-BR" });
  });

  it("um único campo da lista também grava sozinho", async () => {
    const { token } = await setupDono();
    const res = await patch(token, { currency: "EUR" });
    expect(res.statusCode).toBe(200);
    const corpo = res.json() as { empresa: { currency: string }; alterados: string[] };
    expect(corpo.empresa.currency).toBe("EUR");
    expect(corpo.alterados).toEqual(["currency"]);
    await patch(token, { currency: "BRL" });
  });

  it("campo vazio limpa o que estava guardado", async () => {
    const { token } = await setupDono();
    await patch(token, { tradeName: "Nexus Vitrine" });
    const res = await patch(token, { tradeName: "" });
    const corpo = res.json() as { empresa: { tradeName: string | null }; alterados: string[] };
    expect(corpo.empresa.tradeName).toBeNull();
    expect(corpo.alterados).toEqual(["tradeName"]);
  });

  it("repetir o mesmo valor não escreve e não suja a auditoria", async () => {
    const { f, token } = await setupDono();
    await patch(token, { city: "Campinas" });
    const antes = await prisma.auditLog.count({ where: { companyId: f.companyId, action: "company.settings.updated" } });

    const res = await patch(token, { city: "Campinas" });
    const corpo = res.json() as { alterados: string[] };
    expect(corpo.alterados).toEqual([]);

    const depois = await prisma.auditLog.count({ where: { companyId: f.companyId, action: "company.settings.updated" } });
    expect(depois).toBe(antes);
  });

  it("CNPJ com dígito verificador errado → 400 apontando o campo", async () => {
    const { token } = await setupDono();
    const res = await patch(token, { cnpj: CNPJ_ERRADO });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toBe("Dados inválidos");
    expect(mensagemDeCampo(res, "cnpj")).toMatch(/dígito verificador/i);
  });

  it("recusa CEP, UF, telefone, e-mail, moeda, fuso e idioma fora da regra", async () => {
    const { token } = await setupDono();
    const casos: [string, Record<string, unknown>][] = [
      ["zipCode", { zipCode: "123" }],
      ["zipCode", { zipCode: "00000000" }],
      ["stateUf", { stateUf: "XX" }],
      ["phone", { phone: "12345" }],
      ["email", { email: "sem-arroba" }],
      ["logoUrl", { logoUrl: "ftp://empresa.com/logo.png" }],
      ["currency", { currency: "BRLZ" }],
      ["timezone", { timezone: "Marte/Olimpo" }],
      ["language", { language: "xx" }],
    ];
    for (const [campo, payload] of casos) {
      const res = await patch(token, payload);
      expect(res.statusCode, campo + " deveria ser 400").toBe(400);
      expect(mensagemDeCampo(res, campo), campo).not.toBe("");
    }
  });

  it("meta de receita: negativa é 400, cadastrada volta como número", async () => {
    const { token } = await setupDono();
    const ruim = await patch(token, { revenueTarget: -1 });
    expect(ruim.statusCode).toBe(400);
    expect(mensagemDeCampo(ruim, "revenueTarget")).toMatch(/não pode ser negativa/i);

    const boa = await patch(token, { revenueTarget: 25000.5 });
    expect(boa.statusCode).toBe(200);
    const corpo = boa.json() as { empresa: { revenueTarget: number | string | null } };
    expect(corpo.empresa.revenueTarget).toBe(25000.5);

    const limpa = await patch(token, { revenueTarget: null });
    expect((limpa.json() as { empresa: { revenueTarget: unknown } }).empresa.revenueTarget).toBeNull();
  });

  it("corpo vazio e campo inventado são 400", async () => {
    const { token } = await setupDono();
    const vazio = await patch(token, {});
    expect(vazio.statusCode).toBe(400);
    // Refinamento do corpo inteiro não tem caminho de campo: vem na lista sem path.
    expect(mensagemDeCampo(vazio, "")).toMatch(/ao menos um campo/i);

    const inventado = await patch(token, { moedaParalela: "BRL" });
    expect(inventado.statusCode).toBe(400);
  });

  it("settings:write é de quem gere a empresa: ADMIN pode, MANAGER e STAFF não", async () => {
    const admin = await makeAccount("ADMIN");
    const gerente = await makeAccount("MANAGER");
    const atendente = await makeAccount("STAFF");
    created.userIds.push(admin.userId, gerente.userId, atendente.userId);
    created.companyIds.push(admin.companyId, gerente.companyId, atendente.companyId);

    expect((await patch(await login(admin.email, SENHA), { city: "Curitiba" })).statusCode).toBe(200);

    for (const f of [gerente, atendente]) {
      const res = await patch(await login(f.email, SENHA), { city: "Curitiba" });
      expect(res.statusCode, f.email).toBe(403);
      expect(res.json().message).toMatch(/Permissão insuficiente/);
    }
  });

  it("o token só alcança a própria empresa", async () => {
    const { f, token } = await setupDono();
    await patch(token, { cnpj: CNPJ_OK });

    const outra = await makeAccount("OWNER");
    created.userIds.push(outra.userId);
    created.companyIds.push(outra.companyId);
    const res = await app.inject({
      method: "GET",
      url: "/api/companies/current",
      headers: auth(await login(outra.email, SENHA)),
    });
    expect(res.json().cnpj).toBeNull();
    expect(res.json().id).toBe(outra.companyId);
    expect(f.companyId).not.toBe(outra.companyId);
  });

  it("alteração de configuração aparece na aba de alterações sensíveis", async () => {
    const { token } = await setupDono();
    await patch(token, { zipCode: "20040020", city: "Rio de Janeiro" });

    const res = await app.inject({
      method: "GET",
      url: "/api/audit?sensivel=true&entity=company&pageSize=10",
      headers: auth(token),
    });
    expect(res.statusCode).toBe(200);
    const linhas = (res.json() as { data: { action: string; metadata: { campos?: string[] } | null }[] }).data;
    const achada = linhas.find(
      (l) => l.action === "company.settings.updated" && l.metadata?.campos?.includes("zipCode"),
    );
    expect(achada, "a gravação de ZIP deveria estar na trilha sensível").toBeTruthy();
  });

  it("as listas que a tela usa vêm da API, e exigem sessão", async () => {
    const semToken = await app.inject({ method: "GET", url: "/api/companies/settings/opcoes" });
    expect(semToken.statusCode).toBe(401);

    const { token } = await setupDono();
    const res = await app.inject({ method: "GET", url: "/api/companies/settings/opcoes", headers: auth(token) });
    expect(res.statusCode).toBe(200);
    const corpo = res.json() as {
      ufs: string[];
      moedas: { codigo: string; rotulo: string }[];
      idiomas: { codigo: string }[];
      fusos: string[];
    };
    expect(corpo.ufs).toHaveLength(27);
    expect(corpo.ufs).toContain("SP");
    expect(corpo.moedas.map((m) => m.codigo)).toEqual(expect.arrayContaining(["BRL", "USD", "EUR"]));
    expect(corpo.idiomas.map((i) => i.codigo)).toContain("pt-BR");
    expect(corpo.fusos).toContain("America/Sao_Paulo");
  });

  it("meta cadastrada aparece no bloco de metas do painel", async () => {
    const { token } = await setupDono();
    await patch(token, { revenueTarget: null });
    const semMeta = await app.inject({ method: "GET", url: "/api/reports/overview", headers: auth(token) });
    expect((semMeta.json() as { meta: unknown }).meta).toBeNull();

    await patch(token, { revenueTarget: 30000 });
    const res = await app.inject({ method: "GET", url: "/api/reports/overview", headers: auth(token) });
    const meta = (res.json() as { meta: Record<string, number | null> | null }).meta;
    expect(meta).not.toBeNull();
    expect(meta?.alvo).toBe(30000);
    expect(meta?.faltando).toBe(30000);
    expect(meta?.atingido).toBe(0);
    expect(Number(meta?.diasRestantes)).toBeGreaterThanOrEqual(1);
    expect(Number(meta?.ritmoDiario)).toBeGreaterThan(0);
    await patch(token, { revenueTarget: null });
  });
});

describe("Conta: perfil e senha", () => {
  async function conta(role: "OWNER" | "STAFF") {
    const f = await makeAccount(role);
    created.userIds.push(f.userId);
    created.companyIds.push(f.companyId);
    return { f, token: await login(f.email, SENHA) };
  }

  it("grava nome e telefone do próprio perfil, com o telefone virando algarismos", async () => {
    const { f, token } = await conta("OWNER");
    const res = await app.inject({
      method: "PATCH",
      url: "/api/auth/me",
      headers: auth(token),
      payload: { name: "Marcelo Souza", phone: "(11) 98888-7777" },
    });
    expect(res.statusCode).toBe(200);
    const corpo = res.json() as { user: { name: string; phone: string | null }; alterados: string[] };
    expect(corpo.user.name).toBe("Marcelo Souza");
    expect(corpo.user.phone).toBe("11988887777");
    expect(corpo.alterados).toEqual(["name", "phone"]);

    const gravado = await prisma.user.findUnique({ where: { id: f.userId } });
    expect(gravado?.phone).toBe("11988887777");
  });

  it("atendente também pode editar a própria conta", async () => {
    const { token } = await conta("STAFF");
    const res = await app.inject({
      method: "PATCH",
      url: "/api/auth/me",
      headers: auth(token),
      payload: { name: "Atendente Teste" },
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { user: { name: string } }).user.name).toBe("Atendente Teste");
  });

  it("telefone fora do padrão e corpo vazio são 400", async () => {
    const { token } = await conta("STAFF");
    const telefoneRuim = await app.inject({
      method: "PATCH",
      url: "/api/auth/me",
      headers: auth(token),
      payload: { phone: "12345" },
    });
    expect(telefoneRuim.statusCode).toBe(400);
    expect(mensagemDeCampo(telefoneRuim, "phone")).not.toBe("");

    const vazio = await app.inject({ method: "PATCH", url: "/api/auth/me", headers: auth(token), payload: {} });
    expect(vazio.statusCode).toBe(400);

    const deOutro = await app.inject({
      method: "PATCH",
      url: "/api/auth/me",
      headers: auth(token),
      payload: { role: "OWNER" },
    });
    expect(deOutro.statusCode).toBe(400);
  });

  it("nome repetido não gera auditoria", async () => {
    const { f, token } = await conta("OWNER");
    await app.inject({ method: "PATCH", url: "/api/auth/me", headers: auth(token), payload: { name: "Mesmo Nome" } });
    const antes = await prisma.auditLog.count({ where: { companyId: f.companyId, action: "auth.profile_updated" } });
    const res = await app.inject({ method: "PATCH", url: "/api/auth/me", headers: auth(token), payload: { name: "Mesmo Nome" } });
    expect((res.json() as { alterados: string[] }).alterados).toEqual([]);
    const depois = await prisma.auditLog.count({ where: { companyId: f.companyId, action: "auth.profile_updated" } });
    expect(depois).toBe(antes);
  });

  it("troca de senha confere a atual, a política e a repetição", async () => {
    const { token } = await conta("OWNER");

    const atualErrada = await app.inject({
      method: "POST",
      url: "/api/auth/change-password",
      headers: auth(token),
      payload: { currentPassword: "SenhaErrada123!", newPassword: NOVA_SENHA },
    });
    // 400 e não 401: 401 faria o aplicativo tentar renovar um token ainda válido.
    expect(atualErrada.statusCode).toBe(400);
    expect(atualErrada.json().message).toMatch(/senha atual não confere/i);

    const novaFraca = await app.inject({
      method: "POST",
      url: "/api/auth/change-password",
      headers: auth(token),
      payload: { currentPassword: SENHA, newPassword: "abc" },
    });
    expect(novaFraca.statusCode).toBe(400);
    expect(mensagemDeCampo(novaFraca, "newPassword")).not.toBe("");

    const mesmaSenha = await app.inject({
      method: "POST",
      url: "/api/auth/change-password",
      headers: auth(token),
      payload: { currentPassword: SENHA, newPassword: SENHA },
    });
    expect(mesmaSenha.statusCode).toBe(409);
  });

  it("trocar a senha derruba todas as sessões abertas", async () => {
    const f = await makeAccount("OWNER");
    created.userIds.push(f.userId);
    created.companyIds.push(f.companyId);

    const entrada = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: f.email, password: SENHA },
    });
    expect(entrada.statusCode).toBe(200);
    const { accessToken, refreshToken } = entrada.json() as { accessToken: string; refreshToken: string };

    const antes = await app.inject({ method: "POST", url: "/api/auth/refresh", payload: { refreshToken } });
    expect(antes.statusCode).toBe(200);

    const trocada = await app.inject({
      method: "POST",
      url: "/api/auth/change-password",
      headers: auth(accessToken),
      payload: { currentPassword: SENHA, newPassword: NOVA_SENHA },
    });
    expect(trocada.statusCode).toBe(200);
    expect((trocada.json() as { sessionsRevoked: number }).sessionsRevoked).toBeGreaterThanOrEqual(1);

    const depois = await app.inject({ method: "POST", url: "/api/auth/refresh", payload: { refreshToken } });
    expect(depois.statusCode).toBe(401);

    const senhaVelha = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: f.email, password: SENHA },
    });
    expect(senhaVelha.statusCode).toBe(401);

    const senhaNova = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: f.email, password: NOVA_SENHA },
    });
    expect(senhaNova.statusCode).toBe(200);

    const trilha = await prisma.auditLog.findFirst({
      where: { userId: f.userId, action: "auth.password_changed" },
      orderBy: { createdAt: "desc" },
    });
    expect(trilha).not.toBeNull();
    expect((trilha?.metadata as { sessionsRevoked?: number }).sessionsRevoked).toBeGreaterThanOrEqual(1);
  });
});
