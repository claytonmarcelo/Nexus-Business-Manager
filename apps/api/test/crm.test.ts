import { describe, it, expect, afterAll } from "vitest";
import { app, makeAccount, login, cleanup, uid } from "./helpers";

describe("CRM / leads", () => {
  const created: { userIds: string[]; companyIds: string[] } = { userIds: [], companyIds: [] };
  afterAll(async () => {
    await cleanup(created);
    await app.close();
  });

  async function account(role: "OWNER" | "ADMIN" | "MANAGER" | "STAFF") {
    const f = await makeAccount(role);
    created.userIds.push(f.userId);
    created.companyIds.push(f.companyId);
    return { f, token: await login(f.email, f.password) };
  }
  const auth = (token: string) => ({ authorization: `Bearer ${token}` });

  it("cria, lista, busca e atualiza lead com auditoria", async () => {
    const { token } = await account("OWNER");
    const nome = "Lead Padaria " + uid("l");
    const criacao = await app.inject({
      method: "POST", url: "/api/leads", headers: auth(token),
      payload: { name: nome, email: "contato@padaria.test", phone: "(11) 99999-0000", source: "Instagram", value: 4800 },
    });
    expect(criacao.statusCode).toBe(201);
    const lead = criacao.json() as { id: string; status: string; value: number; source: string };
    expect(lead.status).toBe("NEW");
    expect(lead.value).toBe(4800);
    expect(lead.source).toBe("Instagram");

    const lista = await app.inject({ method: "GET", url: "/api/leads?search=" + encodeURIComponent(nome), headers: auth(token) });
    expect(lista.statusCode).toBe(200);
    const body = lista.json() as { data: Array<{ id: string; name: string }>; meta: { total: number } };
    expect(body.meta.total).toBe(1);
    expect(body.data[0]?.id).toBe(lead.id);

    const edicao = await app.inject({
      method: "PATCH", url: "/api/leads/" + lead.id, headers: auth(token),
      payload: { value: 5200, notes: "Cliente pediu proposta ate sexta" },
    });
    expect(edicao.statusCode).toBe(200);
    const atual = edicao.json() as { value: number; notes: string };
    expect(atual.value).toBe(5200);
    expect(atual.notes).toContain("proposta");

    const detalhe = await app.inject({ method: "GET", url: "/api/leads/" + lead.id, headers: auth(token) });
    expect((detalhe.json() as { name: string }).name).toContain("Lead Padaria");

    const aud = await app.inject({ method: "GET", url: "/api/audit?entity=lead", headers: auth(token) });
    const eventos = (aud.json() as { data: Array<{ action: string }> }).data;
    expect(eventos.some((e) => e.action === "lead.create")).toBe(true);
    expect(eventos.some((e) => e.action === "lead.update")).toBe(true);
  });

  it("pipeline traz os cinco estagios com contagem e soma de valor", async () => {
    const { token } = await account("OWNER");
    const alvos = [["NEW", 1000], ["CONTACTED", 2000], ["PROPOSAL", 3000]] as const;
    for (const [status, value] of alvos) {
      const r = await app.inject({ method: "POST", url: "/api/leads", headers: auth(token), payload: { name: "Lead " + status + " " + uid("l"), value } });
      expect(r.statusCode).toBe(201);
      const id = (r.json() as { id: string }).id;
      await app.inject({ method: "PATCH", url: "/api/leads/" + id + "/status", headers: auth(token), payload: { status } });
    }
    const pipe = await app.inject({ method: "GET", url: "/api/leads/pipeline", headers: auth(token) });
    expect(pipe.statusCode).toBe(200);
    const stages = pipe.json() as Array<{ status: string; count: number; value: number }>;
    expect(stages.map((s) => s.status)).toEqual(["NEW", "CONTACTED", "PROPOSAL", "WON", "LOST"]);
    expect(stages.find((s) => s.status === "NEW")?.count).toBe(1);
    expect(stages.find((s) => s.status === "PROPOSAL")?.value).toBe(3000);
    expect(stages.find((s) => s.status === "LOST")?.count).toBe(0);
  });

  it("marcar como GANHO converte o lead em cliente", async () => {
    const { token } = await account("OWNER");
    const nome = "Lead Conversao " + uid("l");
    const r = await app.inject({
      method: "POST", url: "/api/leads", headers: auth(token),
      payload: { name: nome, email: "conversion" + uid("e") + "@nexus.test", phone: "(21) 8888-7777", value: 900 },
    });
    const id = (r.json() as { id: string }).id;

    const ganho = await app.inject({ method: "PATCH", url: "/api/leads/" + id + "/status", headers: auth(token), payload: { status: "WON" } });
    expect(ganho.statusCode).toBe(200);
    const lead = ganho.json() as { status: string; clientName: string | null };
    expect(lead.status).toBe("WON");
    expect(lead.clientName).toBe(nome);

    const clientes = await app.inject({ method: "GET", url: "/api/clients?pageSize=100", headers: auth(token) });
    const lista = (clientes.json() as { data: Array<{ id: string; name: string; notes: string | null }> }).data;
    const cliente = lista.find((c) => c.name === nome);
    expect(cliente).toBeDefined();

    const detalhe = await app.inject({ method: "GET", url: "/api/clients/" + cliente!.id, headers: auth(token) });
    expect(detalhe.statusCode).toBe(200);
    expect((detalhe.json() as { notes: string | null }).notes).toContain("Convertido do lead");

    // repetir o estagio nao duplica o cliente
    const repetido = await app.inject({ method: "PATCH", url: "/api/leads/" + id + "/status", headers: auth(token), payload: { status: "WON" } });
    expect(repetido.statusCode).toBe(400);
    const depois = await app.inject({ method: "GET", url: "/api/clients?pageSize=100", headers: auth(token) });
    const nomes = ((depois.json() as { data: Array<{ name: string }> }).data).filter((c) => c.name === nome);
    expect(nomes.length).toBe(1);
  });

  it("PERDIDO nao cria cliente e estagio repetido e bloqueado", async () => {
    const { token } = await account("OWNER");
    const r = await app.inject({ method: "POST", url: "/api/leads", headers: auth(token), payload: { name: "Lead Perdido " + uid("l"), value: 50 } });
    const id = (r.json() as { id: string }).id;
    const perdido = await app.inject({ method: "PATCH", url: "/api/leads/" + id + "/status", headers: auth(token), payload: { status: "LOST" } });
    expect(perdido.statusCode).toBe(200);
    expect((perdido.json() as { clientName: string | null }).clientName).toBeNull();
    const dup = await app.inject({ method: "PATCH", url: "/api/leads/" + id + "/status", headers: auth(token), payload: { status: "LOST" } });
    expect(dup.statusCode).toBe(400);
    const clientes = await app.inject({ method: "GET", url: "/api/clients?pageSize=100", headers: auth(token) });
    expect((clientes.json() as { meta: { total: number } }).meta.total).toBe(0);
  });

  it("valida nome, valor, e-mail e estagio desconhecido", async () => {
    const { token } = await account("OWNER");
    const curto = await app.inject({ method: "POST", url: "/api/leads", headers: auth(token), payload: { name: "A" } });
    expect(curto.statusCode).toBe(400);
    const negativo = await app.inject({ method: "POST", url: "/api/leads", headers: auth(token), payload: { name: "Lead Valor", value: -10 } });
    expect(negativo.statusCode).toBe(400);
    const emailRuim = await app.inject({ method: "POST", url: "/api/leads", headers: auth(token), payload: { name: "Lead E-mail", email: "sem-arroba" } });
    expect(emailRuim.statusCode).toBe(400);
    const r = await app.inject({ method: "POST", url: "/api/leads", headers: auth(token), payload: { name: "Lead Estagio" } });
    const id = (r.json() as { id: string }).id;
    const statusRuim = await app.inject({ method: "PATCH", url: "/api/leads/" + id + "/status", headers: auth(token), payload: { status: "MAYBE" } });
    expect(statusRuim.statusCode).toBe(400);
    const inexistente = await app.inject({ method: "GET", url: "/api/leads/nao-existe-1", headers: auth(token) });
    expect(inexistente.statusCode).toBe(404);
  });

  it("isola empresas e respeita RBAC do STAFF", async () => {
    const a = await account("OWNER");
    const b = await account("OWNER");
    const r = await app.inject({ method: "POST", url: "/api/leads", headers: auth(a.token), payload: { name: "Lead Empresa A " + uid("l") } });
    const id = (r.json() as { id: string }).id;

    const invasoLista = await app.inject({ method: "GET", url: "/api/leads?pageSize=100", headers: auth(b.token) });
    expect((invasoLista.json() as { meta: { total: number } }).meta.total).toBe(0);
    const invasoDetalhe = await app.inject({ method: "GET", url: "/api/leads/" + id, headers: auth(b.token) });
    expect(invasoDetalhe.statusCode).toBe(404);

    const staff = await account("STAFF");
    const leitura = await app.inject({ method: "GET", url: "/api/leads/pipeline", headers: auth(staff.token) });
    expect(leitura.statusCode).toBe(200);
    const escrita = await app.inject({ method: "POST", url: "/api/leads", headers: auth(staff.token), payload: { name: "Lead Staff" } });
    expect(escrita.statusCode).toBe(403);
  });
});
