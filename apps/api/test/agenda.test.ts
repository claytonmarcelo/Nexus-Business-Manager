import { describe, it, expect, afterAll } from "vitest";
import { app, makeAccount, login, cleanup, uid } from "./helpers";

const ISO = (d: Date) => d.toISOString();
const em = (dias: number, hora = 9) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  d.setHours(hora, 0, 0, 0);
  return d;
};

describe("Agenda / compromissos", () => {
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

  async function novoEvento(token: string, payload: Record<string, unknown> = {}) {
    const r = await app.inject({
      method: "POST", url: "/api/agenda/events", headers: auth(token),
      payload: { title: "Visita tecnica " + uid("a"), startAt: ISO(em(1)), ...payload },
    });
    expect(r.statusCode).toBe(201);
    return r.json() as {
      id: string; title: string; status: string; startAt: string; endAt: string | null;
      recorrente: boolean; recorrencia: string; recorrenciaAte: string | null;
    };
  }

  it("cria, lista por periodo e atualiza compromisso com auditoria", async () => {
    const { token } = await account("OWNER");
    const evento = await novoEvento(token, { location: "Rua das Flores 120", description: "Levar amostras", type: "FOLLOW_UP", endAt: ISO(em(1, 11)) });
    expect(evento.status).toBe("SCHEDULED");

    const janela = await app.inject({
      method: "GET",
      url: "/api/agenda/events?from=" + encodeURIComponent(ISO(em(0))) + "&to=" + encodeURIComponent(ISO(em(3))),
      headers: auth(token),
    });
    expect(janela.statusCode).toBe(200);
    const dentro = (janela.json() as Array<{ id: string }>).filter((e) => e.id === evento.id);
    expect(dentro.length).toBe(1);

    const fora = await app.inject({
      method: "GET",
      url: "/api/agenda/events?from=" + encodeURIComponent(ISO(em(30))) + "&to=" + encodeURIComponent(ISO(em(40))),
      headers: auth(token),
    });
    expect((fora.json() as Array<{ id: string }>).some((e) => e.id === evento.id)).toBe(false);

    const edicao = await app.inject({
      method: "PATCH", url: "/api/agenda/events/" + evento.id, headers: auth(token),
      payload: { title: "Visita remarcada", startAt: ISO(em(2, 14)) },
    });
    expect(edicao.statusCode).toBe(200);
    const depois = edicao.json() as { title: string; startAt: string; endAt: string };
    expect(depois.title).toBe("Visita remarcada");
    expect(depois.startAt).toBe(ISO(em(2, 14)));
    // mudando so o inicio, a duracao original (2h) acompanha o novo horario
    expect(depois.endAt).toBe(ISO(em(2, 16)));

    const aud = await app.inject({ method: "GET", url: "/api/audit?entity=agenda-event", headers: auth(token) });
    const acoes = (aud.json() as { data: Array<{ action: string }> }).data.map((a) => a.action);
    expect(acoes).toContain("agenda.create");
    expect(acoes).toContain("agenda.update");
  });

  it("valida titulo, tipo e periodo do compromisso", async () => {
    const { token } = await account("OWNER");

    const curto = await app.inject({ method: "POST", url: "/api/agenda/events", headers: auth(token), payload: { title: "ab", startAt: ISO(em(1)) } });
    expect(curto.statusCode).toBe(400);
    expect((curto.json() as { issues: Array<{ message: string }> }).issues[0]?.message).toContain("3 caracteres");

    const semData = await app.inject({ method: "POST", url: "/api/agenda/events", headers: auth(token), payload: { title: "Sem data certa" } });
    expect(semData.statusCode).toBe(400);

    const invertido = await app.inject({
      method: "POST", url: "/api/agenda/events", headers: auth(token),
      payload: { title: "Periodo invertido", startAt: ISO(em(3)), endAt: ISO(em(1)) },
    });
    expect(invertido.statusCode).toBe(400);
    expect(JSON.stringify(invertido.json())).toContain("depois do início");

    const tipoRuim = await app.inject({ method: "POST", url: "/api/agenda/events", headers: auth(token), payload: { title: "Tipo errado", startAt: ISO(em(1)), type: "PIquenique" } });
    expect(tipoRuim.statusCode).toBe(400);

    const evento = await novoEvento(token);
    const patchInvertido = await app.inject({
      method: "PATCH", url: "/api/agenda/events/" + evento.id, headers: auth(token),
      payload: { startAt: ISO(em(10)), endAt: ISO(em(1)) },
    });
    expect(patchInvertido.statusCode).toBe(400);

    const inexistente = await app.inject({ method: "GET", url: "/api/agenda/events/" + uid("id"), headers: auth(token) });
    expect(inexistente.statusCode).toBe(404);
    expect((inexistente.json() as { message: string }).message).toContain("Compromisso não encontrado");
  });

  it("liga o compromisso a cliente e lead da mesma empresa", async () => {
    const { token } = await account("OWNER");
    const outro = await account("ADMIN");

    const cliente = await app.inject({ method: "POST", url: "/api/clients", headers: auth(token), payload: { name: "Cliente Agenda " + uid("c") } });
    expect(cliente.statusCode).toBe(201);
    const clientId = (cliente.json() as { id: string }).id;

    const lead = await app.inject({ method: "POST", url: "/api/leads", headers: auth(token), payload: { name: "Lead Agenda " + uid("l"), value: 1200 } });
    expect(lead.statusCode).toBe(201);
    const leadId = (lead.json() as { id: string }).id;

    const evento = await novoEvento(token, { clientId, leadId });
    const detalhe = await app.inject({ method: "GET", url: "/api/agenda/events/" + evento.id, headers: auth(token) });
    const corpo = detalhe.json() as { clientId: string; leadId: string; clientName: string; leadName: string };
    expect(corpo.clientId).toBe(clientId);
    expect(corpo.clientName).toContain("Cliente Agenda");
    expect(corpo.leadName).toContain("Lead Agenda");

    const intruso = await app.inject({
      method: "POST", url: "/api/agenda/events", headers: auth(outro.token),
      payload: { title: "Compromisso cruzado", startAt: ISO(em(1)), clientId },
    });
    expect(intruso.statusCode).toBe(400);
    expect((intruso.json() as { message: string }).message).toContain("não pertence a esta empresa");

    const lista = await app.inject({
      method: "GET", url: "/api/agenda/events?from=" + encodeURIComponent(ISO(em(0))) + "&to=" + encodeURIComponent(ISO(em(3))), headers: auth(token),
    });
    const linha = (lista.json() as Array<{ id: string; clientName: string | null }>).find((e) => e.id === evento.id);
    expect(linha?.clientName).toContain("Cliente Agenda");
  });

  it("andai o estado do compromisso e bloqueia repeticao", async () => {
    const { token } = await account("OWNER");
    const evento = await novoEvento(token, { title: "Entrega de torta " + uid("a") });

    const feito = await app.inject({ method: "PATCH", url: "/api/agenda/events/" + evento.id + "/status", headers: auth(token), payload: { status: "DONE" } });
    expect(feito.statusCode).toBe(200);
    expect((feito.json() as { status: string }).status).toBe("DONE");

    const repetido = await app.inject({ method: "PATCH", url: "/api/agenda/events/" + evento.id + "/status", headers: auth(token), payload: { status: "DONE" } });
    expect(repetido.statusCode).toBe(400);
    expect((repetido.json() as { message: string }).message).toContain("já está neste estado");

    const reaberto = await app.inject({ method: "PATCH", url: "/api/agenda/events/" + evento.id + "/status", headers: auth(token), payload: { status: "SCHEDULED" } });
    expect(reaberto.statusCode).toBe(200);
    expect((reaberto.json() as { status: string }).status).toBe("SCHEDULED");

    const cancelado = await app.inject({ method: "PATCH", url: "/api/agenda/events/" + evento.id + "/status", headers: auth(token), payload: { status: "CANCELLED" } });
    expect((cancelado.json() as { status: string }).status).toBe("CANCELLED");

    const estadoRuim = await app.inject({ method: "PATCH", url: "/api/agenda/events/" + evento.id + "/status", headers: auth(token), payload: { status: "ADIADO" } });
    expect(estadoRuim.statusCode).toBe(400);

    const filtrado = await app.inject({ method: "GET", url: "/api/agenda/events?status=CANCELLED", headers: auth(token) });
    expect((filtrado.json() as Array<{ id: string }>).some((e) => e.id === evento.id)).toBe(true);

    const aud = await app.inject({ method: "GET", url: "/api/audit?entity=agenda-event", headers: auth(token) });
    const acoes = (aud.json() as { data: Array<{ action: string }> }).data.map((a) => a.action);
    expect(acoes).toContain("agenda.done");
    expect(acoes).toContain("agenda.cancelled");
  });

  it("isola empresas e nega escrita para STAFF", async () => {
    const a = await account("OWNER");
    const b = await account("ADMIN");
    const evento = await novoEvento(a.token, { title: "Reuniao da empresa A " + uid("a") });

    const listaB = await app.inject({ method: "GET", url: "/api/agenda/events", headers: auth(b.token) });
    expect((listaB.json() as Array<{ id: string }>).some((e) => e.id === evento.id)).toBe(false);

    const lerA = await app.inject({ method: "GET", url: "/api/agenda/events/" + evento.id, headers: auth(b.token) });
    expect(lerA.statusCode).toBe(404);

    const editarA = await app.inject({ method: "PATCH", url: "/api/agenda/events/" + evento.id, headers: auth(b.token), payload: { title: "Tentativa cruzada" } });
    expect(editarA.statusCode).toBe(404);

    const staff = await account("STAFF");
    const negado = await app.inject({ method: "POST", url: "/api/agenda/events", headers: auth(staff.token), payload: { title: "Compromisso do staff", startAt: ISO(em(1)) } });
    expect(negado.statusCode).toBe(403);

    const ler = await app.inject({ method: "GET", url: "/api/agenda/events", headers: auth(staff.token) });
    expect(ler.statusCode).toBe(200);

    const semToken = await app.inject({ method: "GET", url: "/api/agenda/events" });
    expect(semToken.statusCode).toBe(401);
  });

  it("sumariza por estado e exclui o compromisso", async () => {
    const { token } = await account("OWNER");
    await novoEvento(token, { startAt: ISO(em(1)) });
    const segundo = await novoEvento(token, { title: "Entrega fria " + uid("a"), startAt: ISO(em(2)) });
    await app.inject({ method: "PATCH", url: "/api/agenda/events/" + segundo.id + "/status", headers: auth(token), payload: { status: "DONE" } });

    const resumo = await app.inject({
      method: "GET", url: "/api/agenda/summary?from=" + encodeURIComponent(ISO(em(0))) + "&to=" + encodeURIComponent(ISO(em(5))), headers: auth(token),
    });
    expect(resumo.statusCode).toBe(200);
    const corpo = resumo.json() as { total: number; scheduled: number; done: number; cancelled: number };
    expect(corpo.total).toBe(2);
    expect(corpo.scheduled).toBe(1);
    expect(corpo.done).toBe(1);
    expect(corpo.cancelled).toBe(0);

    const busca = await app.inject({ method: "GET", url: "/api/agenda/events?search=" + encodeURIComponent("Entrega fria"), headers: auth(token) });
    expect((busca.json() as Array<{ id: string }>).length).toBe(1);

    const excluir = await app.inject({ method: "DELETE", url: "/api/agenda/events/" + segundo.id, headers: auth(token) });
    expect(excluir.statusCode).toBe(200);
    expect((excluir.json() as { deleted: boolean }).deleted).toBe(true);

    const sumido = await app.inject({ method: "GET", url: "/api/agenda/events/" + segundo.id, headers: auth(token) });
    expect(sumido.statusCode).toBe(404);

    const aud = await app.inject({ method: "GET", url: "/api/audit?entity=agenda-event", headers: auth(token) });
    const acoes = (aud.json() as { data: Array<{ action: string }> }).data.map((a) => a.action);
    expect(acoes).toContain("agenda.delete");

    const depois = await app.inject({
      method: "GET", url: "/api/agenda/summary?from=" + encodeURIComponent(ISO(em(0))) + "&to=" + encodeURIComponent(ISO(em(5))), headers: auth(token),
    });
    expect((depois.json() as { total: number }).total).toBe(1);
  });

  it("expande recorrência diária, semanal e mensal na janela pedida", async () => {
    const { token } = await account("OWNER");
    const local = (s: string) => new Date(s).toISOString();
    const janela = (de: string, ate: string) =>
      "/api/agenda/events?from=" + encodeURIComponent(local(de)) + "&to=" + encodeURIComponent(local(ate));

    const diaria = await novoEvento(token, {
      title: "Revisao da vitrine", startAt: local("2026-11-02T10:00:00"), endAt: local("2026-11-02T11:00:00"),
      recorrencia: "DAILY", recorrenciaAte: local("2026-11-06T23:59:00"),
    });
    const semanas = await app.inject({ method: "GET", url: janela("2026-11-01T00:00:00", "2026-11-30T23:59:00"), headers: auth(token) });
    const linhasDiarias = (semanas.json() as Array<{ id: string; masterId: string; startAt: string; endAt: string | null }>).filter((e) => e.masterId === diaria.id);
    expect(linhasDiarias.length).toBe(5);
    expect(linhasDiarias.every((e) => e.id.includes("--"))).toBe(true);
    expect(new Date(linhasDiarias[1]!.startAt).getDate()).toBe(3);
    // a duracao de uma hora se repete em cada ocorrencia
    expect(new Date(linhasDiarias[0]!.endAt!).getTime() - new Date(linhasDiarias[0]!.startAt).getTime()).toBe(3_600_000);

    // janela cortada: a serie comecou antes, mas so o recorte aparece
    const recorte = await app.inject({ method: "GET", url: janela("2026-11-04T00:00:00", "2026-11-05T23:59:00"), headers: auth(token) });
    const dentro = (recorte.json() as Array<{ masterId: string; ocorrencia: number }>).filter((e) => e.masterId === diaria.id);
    expect(dentro.length).toBe(2);
    expect(dentro.map((e) => e.ocorrencia)).toEqual([2, 3]);

    const semanal = await novoEvento(token, {
      title: "Entrega de tortas", startAt: local("2026-11-03T09:00:00"),
      recorrencia: "WEEKLY", recorrenciaAte: local("2026-11-24T23:59:00"),
    });
    const listaSemanal = await app.inject({ method: "GET", url: janela("2026-11-01T00:00:00", "2026-11-30T23:59:00"), headers: auth(token) });
    const dias = (listaSemanal.json() as Array<{ masterId: string; startAt: string }>)
      .filter((e) => e.masterId === semanal.id)
      .map((e) => new Date(e.startAt).getDate());
    expect(dias).toEqual([3, 10, 17, 24]);

    // mensal no dia 31 encolhe para o ultimo dia do mes curto
    const mensal = await novoEvento(token, {
      title: "Fechamento do caixa", startAt: local("2026-01-31T14:00:00"),
      recorrencia: "MONTHLY", recorrenciaAte: local("2026-04-30T23:59:00"),
    });
    const listaMensal = await app.inject({ method: "GET", url: janela("2026-01-01T00:00:00", "2026-04-30T23:59:00"), headers: auth(token) });
    const datas = (listaMensal.json() as Array<{ masterId: string; startAt: string; ocorrencia: number }>)
      .filter((e) => e.masterId === mensal.id)
      .map((e) => {
        const d = new Date(e.startAt);
        return (d.getMonth() + 1) + "/" + d.getDate();
      });
    expect(datas).toEqual(["1/31", "2/28", "3/31", "4/30"]);
  });

  it("trata a serie inteira, valida a data-final e limpa a recorrencia", async () => {
    const { token } = await account("OWNER");
    const local = (s: string) => new Date(s).toISOString();

    const semSerie = await novoEvento(token, {
      title: "Compromisso simples", startAt: local("2026-12-01T09:00:00"),
      recorrencia: "NONE", recorrenciaAte: local("2026-12-05T09:00:00"),
    });
    expect(semSerie.recorrente).toBe(false);
    expect(semSerie.recorrenciaAte).toBeNull();

    const serie = await novoEvento(token, {
      title: "Manutencao semanal", startAt: local("2026-12-02T08:00:00"),
      recorrencia: "WEEKLY", recorrenciaAte: local("2026-12-30T23:59:00"),
    });

    const dataRuim = await app.inject({
      method: "POST", url: "/api/agenda/events", headers: auth(token),
      payload: { title: "Serie mal definida", startAt: local("2026-12-10T08:00:00"), recorrencia: "DAILY", recorrenciaAte: local("2026-12-01T08:00:00") },
    });
    expect(dataRuim.statusCode).toBe(400);
    expect(JSON.stringify(dataRuim.json())).toContain("recorrência precisa terminar depois");

    const tipoRuim = await app.inject({
      method: "POST", url: "/api/agenda/events", headers: auth(token),
      payload: { title: "Serie errada", startAt: local("2026-12-10T08:00:00"), recorrencia: "TODA_HORA" },
    });
    expect(tipoRuim.statusCode).toBe(400);

    // uma data avulsa da serie nao e editavel nem exclusivel
    const ocorrencia = serie.id + "--1";
    const edicaoAvulsa = await app.inject({ method: "PATCH", url: "/api/agenda/events/" + ocorrencia, headers: auth(token), payload: { title: "So este dia" } });
    expect(edicaoAvulsa.statusCode).toBe(400);
    expect((edicaoAvulsa.json() as { message: string }).message).toContain("série inteira");
    const exclusaoAvulsa = await app.inject({ method: "DELETE", url: "/api/agenda/events/" + ocorrencia, headers: auth(token) });
    expect(exclusaoAvulsa.statusCode).toBe(400);

    // mas a serie inteira aceita edicao e aparece com o novo titulo em todas as datas
    const edicao = await app.inject({
      method: "PATCH", url: "/api/agenda/events/" + serie.id, headers: auth(token),
      payload: { title: "Manutencao quinzenal", recorrencia: "NONE" },
    });
    expect(edicao.statusCode).toBe(200);
    const depois = edicao.json() as { recorrente: boolean; recorrenciaAte: string | null; title: string };
    expect(depois.recorrente).toBe(false);
    expect(depois.recorrenciaAte).toBeNull();
    expect(depois.title).toBe("Manutencao quinzenal");

    const lista = await app.inject({
      method: "GET", url: "/api/agenda/events?from=" + encodeURIComponent(local("2026-12-01T00:00:00")) + "&to=" + encodeURIComponent(local("2026-12-31T23:59:00")),
      headers: auth(token),
    });
    const daSerie = (lista.json() as Array<{ masterId: string; title: string }>).filter((e) => e.masterId === serie.id);
    expect(daSerie.length).toBe(1);
    expect(daSerie[0]!.title).toBe("Manutencao quinzenal");

    const excluir = await app.inject({ method: "DELETE", url: "/api/agenda/events/" + serie.id, headers: auth(token) });
    expect(excluir.statusCode).toBe(200);
    const sumido = await app.inject({ method: "GET", url: "/api/agenda/events/" + serie.id, headers: auth(token) });
    expect(sumido.statusCode).toBe(404);
  });
});
