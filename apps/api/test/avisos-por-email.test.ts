import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app, cleanup, login, makeAccount, uid, type Fixture } from "./helpers";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";
import { consoleMailer, definirMailer, estadoDoCanalDeEmail } from "../src/lib/mail";
import { fakeMailer, type MailerDeTeste } from "../src/lib/mail/fake";
import { aguardarFilaDeMail } from "../src/lib/mail/fila";
import { registrarJobsPadrao } from "../src/modules/cron/cron.service";
import { env } from "../src/config/env";

// N59 (T5.4): o sino e o relatório diário têm que chamar alguém por e-mail, e a
// tela de preferências tem que dizer a verdade sobre o canal.
//
// O módulo de avisos (seção 44) gravava a linha no banco e o `emailChannel`
// ficava guardado sem nunca ser lido por ninguém. O comentário do serviço dizia
// "o canal de e-mail é apenas preferência guardada", e a tela tinha um quadro com
// a caixa desabilitada por dentro e a frase "Indisponível: não há servidor de
// e-mail (SMTP) configurado nesta instalação" escrita em pedra — verdade no
// desenvolvimento, mentira na produção com SMTP ligado, porque a frase não
// dependia de estado nenhum. Estas provas amarram as três pontas:
//   1. ligado o canal e havendo entregador que entrega, a mensagem sai pelo mesmo
//      aviso que entrou no sino, uma vez por aviso e não uma vez por leitura;
//   2. o e-mail é cópia do aviso gravado: quem desligou o sino não recebe
//      mensagem, porque o aviso não nasce — é isso que fecha a porta do spam
//      diário na varredura de contas vencidas, cuja chave antiduplicação mora na
//      linha do sino;
//   3. sem entregador real nada é enfileirado, e a rota de preferências diz qual
//      é o entregador desta instalação — é esse estado, e não um `disabled` fixo,
//      que a tela passa a mostrar.
//
// O entregador é sempre a caixa de memória (D1 + regra 4): nenhuma conexão de rede
// sai destes testes, e nenhum endereço real aparece aqui — as caixas postais são
// `<uid>@nexus.test`, geradas pelo `uid()` da fábrica de fixtures.

const SENHA = "SenhaForte123!";

const auth = (token: string) => ({ authorization: `Bearer ${token}` });

interface Linha {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  priority: string;
  lida: boolean;
}

async function avisos(token: string, filtro = ""): Promise<{ data: Linha[]; meta: { total: number } }> {
  const r = await app.inject({ method: "GET", url: "/api/notifications?pageSize=50" + filtro, headers: auth(token) });
  expect(r.statusCode).toBe(200);
  return r.json() as { data: Linha[]; meta: { total: number } };
}

function avisosNoBanco(userId: string, kind: string): Promise<number> {
  return prisma.notification.count({ where: { userId, kind } });
}

/** Mensagens da caixa endereçadas a um dos nossos endereços de teste. */
function paraQuem(caixa: MailerDeTeste, endereco: string) {
  const esperado = endereco.toLowerCase();
  return caixa.caixa.filter((m) => m.para.toLowerCase() === esperado);
}

let criado: { userIds: string[]; companyIds: string[]; emails: string[] } = {
  userIds: [], companyIds: [], emails: [],
};

async function contaDe(role: "OWNER" | "ADMIN" | "STAFF", opts?: { plataforma?: boolean }) {
  const f = await makeAccount(role, opts);
  criado.userIds.push(f.userId);
  criado.companyIds.push(f.companyId);
  criado.emails.push(f.email);
  return { f, token: await login(f.email, f.password) };
}

// Um segundo membro ativo na MESMA empresa: é ele quem recebe o aviso de uma ação
// praticada pela conta principal do teste. As preferências são salvas pela rota
// real, para a prova não depender de nenhuma escrita direta no banco.
async function colegaDeEquipe(empresa: Fixture, prefs: Record<string, boolean>) {
  const email = uid("aviso") + "@nexus.test";
  const user = await prisma.user.create({
    data: { email, name: "Colega de equipe", passwordHash: await hashPassword(SENHA) },
  });
  await prisma.companyUser.create({ data: { userId: user.id, companyId: empresa.companyId, role: "STAFF" } });
  criado.userIds.push(user.id);
  criado.emails.push(email);
  const token = await login(email, SENHA);
  const gravadas = await app.inject({
    method: "PUT", url: "/api/notifications/preferences", headers: auth(token),
    payload: {
      saleAlerts: true, lowStock: true, dailyReport: false, overdueBills: true, newLead: true,
      emailChannel: false, inAppChannel: true, ...prefs,
    },
  });
  expect(gravadas.statusCode).toBe(200);
  return { userId: user.id, email, token };
}

// Produto monitorado + cliente + venda confirmada por `token`. Mínimo 0 desliga o
// aviso de estoque, para a prova contar só a venda.
async function vendaConfirmada(token: string, estoque: number, minimo: number, quantidade = estoque) {
  const prod = await app.inject({
    method: "POST", url: "/api/products", headers: auth(token),
    payload: { name: "Item Aviso Email " + uid("p"), salePrice: 25, stockQuantity: estoque, minStock: minimo },
  });
  expect(prod.statusCode).toBe(201);
  const productId = (prod.json() as { id: string }).id;

  const cli = await app.inject({
    method: "POST", url: "/api/clients", headers: auth(token),
    payload: { name: "Cliente Aviso Email " + uid("c") },
  });
  expect(cli.statusCode).toBe(201);

  const pend = await app.inject({
    method: "POST", url: "/api/sales", headers: auth(token),
    payload: { clientId: (cli.json() as { id: string }).id, items: [{ productId, quantity: quantidade, unitPrice: 25 }] },
  });
  expect(pend.statusCode).toBe(201);
  const saleId = (pend.json() as { id: string }).id;

  const conf = await app.inject({
    method: "PATCH", url: `/api/sales/${saleId}/status`, headers: auth(token), payload: { status: "CONFIRMED" },
  });
  expect(conf.statusCode).toBe(200);
  return { saleId, productId };
}

beforeAll(async () => {
  // A rotina de relatório diário só existe na tabela depois do registro das
  // definições; `registrarJobsPadrao` é um upsert e pode rodar mais de uma vez.
  await registrarJobsPadrao();
});

beforeEach(() => {
  definirMailer(undefined);
});

afterEach(async () => {
  // Nada sai daqui com mensagem pendente: a fila é memória deste processo, e o
  // arquivo de teste seguinte teria que adivinhar se uma entrega atrasada é dele.
  await aguardarFilaDeMail();
  definirMailer(undefined);
});

afterAll(async () => {
  await cleanup(criado);
  criado = { userIds: [], companyIds: [], emails: [] };
  await app.close();
});

describe("Avisos por e-mail (N59)", () => {
  it("ligado o canal com entregador real, o aviso que entra no sino também sai por e-mail", async () => {
    const { f, token } = await contaDe("OWNER");
    const colega = await colegaDeEquipe(f, { emailChannel: true, saleAlerts: true });
    const entregador = fakeMailer({ entregaDeVerdade: true });
    definirMailer(entregador);

    await vendaConfirmada(token, 5, 0);
    await aguardarFilaDeMail();

    const mensagens = paraQuem(entregador, colega.email);
    expect(mensagens).toHaveLength(1);
    const m = mensagens[0]!;
    expect(m.rotulo).toBe("aviso-de-notificacao");
    expect(m.assunto).toContain("confirmada");
    // O corpo do aviso vai na mensagem, e o link do sino vira endereço absoluto:
    // dentro do painel o clique é local, numa caixa de e-mail precisa levar ao
    // endereço do produto (`WEB_BASE_URL`) — a mesma base do link de verificação.
    expect(m.texto).toContain("Estoque baixado");
    const base = env.WEB_BASE_URL.replace(/\/+$/, "");
    expect(m.texto).toContain(base + "/app/vendas");
    expect(m.html ?? "").toContain(base + "/app/vendas");
    // Copy de produto: quem abre a mensagem sabe quem fala e sobre o que é.
    expect(m.texto).toContain("Olá, Colega");
    const empresa = await prisma.company.findUnique({ where: { id: f.companyId }, select: { name: true } });
    expect(m.texto).toContain(empresa!.name);
    // A mesma frase está no sino: as duas pontas descrevem o mesmo aviso.
    const lista = await avisos(colega.token, "&kind=sale");
    expect(lista.data).toHaveLength(1);
    expect(lista.data[0]!.title).toBe(m.assunto);

    // Quem provocou o evento não recebe o próprio aviso — nem no sino, nem por
    // e-mail: a regra do módulo vale para o canal novo sem exceção.
    expect(paraQuem(entregador, f.email)).toHaveLength(0);
    expect(await avisosNoBanco(f.userId, "sale")).toBe(0);
  });

  it("sem o canal ligado ninguém é incomodado, e o sino continua entregando", async () => {
    const { f, token } = await contaDe("OWNER");
    const colega = await colegaDeEquipe(f, { emailChannel: false, saleAlerts: true });
    const entregador = fakeMailer({ entregaDeVerdade: true });
    definirMailer(entregador);

    await vendaConfirmada(token, 5, 0);
    await aguardarFilaDeMail();

    expect(paraQuem(entregador, colega.email)).toHaveLength(0);
    expect((await avisos(colega.token, "&kind=sale")).data).toHaveLength(1);
    expect(entregador.caixa).toHaveLength(0);
  });

  it("desligar o tipo silencia o e-mail daquele tipo, e só dele", async () => {
    const { f, token } = await contaDe("OWNER");
    const colega = await colegaDeEquipe(f, { emailChannel: true, saleAlerts: true, lowStock: false });
    const entregador = fakeMailer({ entregaDeVerdade: true });
    definirMailer(entregador);

    // saldo 3, mínimo 5, vende os 3: zerou o estoque de propósito
    await vendaConfirmada(token, 3, 5);
    await aguardarFilaDeMail();

    const mensagens = paraQuem(entregador, colega.email);
    expect(mensagens).toHaveLength(1);
    expect(mensagens[0]!.assunto).toContain("confirmada");
    // A mesma chave de tipo que silencia o sino silencia a mensagem: não há
    // "e-mail de estoque" por fora da preferência de estoque.
    expect((await avisos(colega.token, "&kind=stock")).data).toHaveLength(0);
    expect(paraQuem(entregador, colega.email).filter((m) => m.assunto.includes("Estoque"))).toHaveLength(0);
    expect((await avisos(colega.token, "&kind=sale")).data).toHaveLength(1);
  });

  it("o mesmo aviso da varredura não vira e-mail repetido", async () => {
    const { f, token } = await contaDe("OWNER");
    const colega = await colegaDeEquipe(f, { emailChannel: true, overdueBills: true });
    const entregador = fakeMailer({ entregaDeVerdade: true });
    definirMailer(entregador);

    const lanc = await app.inject({
      method: "POST", url: "/api/finance/entries", headers: auth(token),
      payload: { type: "EXPENSE", description: "Aluguel vencido " + uid("f"), amount: 1500, dueDate: "2026-01-05", paid: false },
    });
    expect(lanc.statusCode).toBe(201);

    const primeira = await app.inject({ method: "POST", url: "/api/notifications/scan", headers: auth(token), payload: {} });
    expect(primeira.statusCode).toBe(200);
    await aguardarFilaDeMail();
    const corpo = primeira.json() as { criadas: number; emails: number };
    // Dois avisos gravados (dono e colega), uma mensagem enviada (só o colega ligou
    // o canal). A rota passa a dizer os dois números porque a tela de rotinas e quem
    // opera precisam saber se o e-mail saiu.
    expect(corpo.criadas).toBe(2);
    expect(corpo.emails).toBe(1);
    expect(paraQuem(entregador, colega.email)).toHaveLength(1);
    expect(paraQuem(entregador, f.email)).toHaveLength(0);

    const segunda = await app.inject({ method: "POST", url: "/api/notifications/scan", headers: auth(token), payload: {} });
    await aguardarFilaDeMail();
    const repetida = segunda.json() as { criadas: number; emails: number };
    expect(repetida.criadas).toBe(0);
    expect(repetida.emails).toBe(0);
    expect(paraQuem(entregador, colega.email)).toHaveLength(1);
  });

  it("o e-mail não é canal solitário: sem linha no sino não há mensagem", async () => {
    const { f, token } = await contaDe("OWNER");
    // sino desligado, e-mail ligado: o aviso não nasce, então não há cópia nenhuma
    const colega = await colegaDeEquipe(f, { emailChannel: true, saleAlerts: true, inAppChannel: false });
    const entregador = fakeMailer({ entregaDeVerdade: true });
    definirMailer(entregador);

    await vendaConfirmada(token, 5, 0);
    await aguardarFilaDeMail();

    expect(entregador.caixa).toHaveLength(0);
    expect(await avisosNoBanco(colega.userId, "sale")).toBe(0);
  });

  it("sem entregador que entrega nada é enfileirado, e a rota diz quem é o entregador", async () => {
    const { f, token } = await contaDe("OWNER");
    const colega = await colegaDeEquipe(f, { emailChannel: true, saleAlerts: true });

    // Caixa de teste que NÃO afirma entregar: o padrão seguro de um entregador que
    // não declara capacidade, como o console de desenvolvimento.
    const simulacro = fakeMailer();
    definirMailer(simulacro);

    const leitura = await app.inject({ method: "GET", url: "/api/notifications/preferences", headers: auth(colega.token) });
    expect(leitura.statusCode).toBe(200);
    const corpo = leitura.json() as {
      emailChannel: boolean;
      email: { disponivel: boolean; transporte: string; motivo: string | null };
    };
    expect(corpo.emailChannel).toBe(true);
    expect(corpo.email.disponivel).toBe(false);
    expect(corpo.email.transporte).toBe("fake");
    expect((corpo.email.motivo ?? "").length).toBeGreaterThan(0);

    await vendaConfirmada(token, 5, 0);
    await aguardarFilaDeMail();
    // A preferência continua salva como está — a escrita não é recusada, o gate é
    // no envio e na tela. Mas nada foi enfileirado: um entregador que não entrega
    // não recebe mensagem nenhuma.
    expect(simulacro.caixa).toHaveLength(0);
    expect((await avisos(colega.token, "&kind=sale")).data).toHaveLength(1);

    // O console, que é o entregador desta máquina enquanto não há SMTP, também não
    // afirma entrega: escreve no log do servidor, não na caixa postal da pessoa.
    definirMailer(consoleMailer(() => undefined));
    expect(estadoDoCanalDeEmail().disponivel).toBe(false);
    expect(estadoDoCanalDeEmail().transporte).toBe("console");
    expect(estadoDoCanalDeEmail().motivo).toContain("servidor de e-mail");

    // Com um entregador que afirma entregar, a mesma rota devolve o contrário — e é
    // essa leitura, não um `disabled` fixo, que a tela de preferências vai usar.
    const real = fakeMailer({ entregaDeVerdade: true });
    definirMailer(real);
    const ligado = await app.inject({ method: "GET", url: "/api/notifications/preferences", headers: auth(colega.token) });
    expect(ligado.json()).toMatchObject({ email: { disponivel: true, transporte: "fake", motivo: null } });
  });

  it("a entrega que falha vira uma linha de auditoria e não apaga o aviso do sino", async () => {
    const { f, token } = await contaDe("OWNER");
    const colega = await colegaDeEquipe(f, { emailChannel: true, saleAlerts: true });
    const entregador = fakeMailer({ entregaDeVerdade: true });
    entregador.falharApos(0);
    definirMailer(entregador);

    await vendaConfirmada(token, 5, 0);
    await aguardarFilaDeMail();

    // O aviso aconteceu: falha de entrega não derruba a operação de negócio nem o
    // registro do sino (mesma política do módulo).
    expect((await avisos(colega.token, "&kind=sale")).data).toHaveLength(1);
    expect(entregador.caixa).toHaveLength(0);

    const eventos = await prisma.auditLog.findMany({
      where: { userId: colega.userId, action: "notification.entrega_falhou" },
    });
    expect(eventos).toHaveLength(1);
    const metadata = eventos[0]!.metadata as {
      rotulo?: string; tentativas?: number; motivo?: string; para?: string;
    };
    expect(metadata.rotulo).toBe("aviso-de-notificacao");
    expect(metadata.tentativas).toBe(3);
    expect(metadata.motivo).toContain("caixa de teste");
    // Endereço mascarado, nunca a caixa postal inteira, e nenhum código longo
    // atravessando a trilha de auditoria.
    expect(metadata.para).toContain("***@");
    const bruto = JSON.stringify(eventos[0]!.metadata ?? {});
    expect(bruto).not.toMatch(/[0-9a-f]{32,}/);
    expect(bruto).not.toContain(colega.email.toLowerCase());
  });

  it("o relatório diário da rotina chama alguém por e-mail e diz isso na última execução", async () => {
    const { f, token } = await contaDe("ADMIN", { plataforma: true });
    const colega = await colegaDeEquipe(f, { emailChannel: true, dailyReport: true });
    const entregador = fakeMailer({ entregaDeVerdade: true });
    definirMailer(entregador);

    // "Ontem" no meio do dia, como na prova da rotina sem e-mail: é a janela que o
    // fechamento de ontem alcança no fuso padrão da empresa de teste.
    const ontemMeio = new Date();
    ontemMeio.setHours(12, 0, 0, 0);
    ontemMeio.setDate(ontemMeio.getDate() - 1);
    await prisma.sale.create({
      data: { companyId: f.companyId, userId: f.userId, status: "CONFIRMED", total: "90.00", createdAt: ontemMeio },
    });

    const run = await app.inject({
      method: "POST", url: "/api/ops/jobs/relatorio-diario/run", headers: auth(token),
    });
    expect(run.statusCode).toBe(200);
    await aguardarFilaDeMail();
    const corpo = run.json() as { status: string; mensagem: string };
    expect(corpo.status).toBe("ok");
    // A coluna "última execução" da tela de Rotinas deixa de falar só do sino.
    expect(corpo.mensagem).toMatch(/· \d+ e-mails?/);

    const mensagens = paraQuem(entregador, colega.email);
    expect(mensagens).toHaveLength(1);
    expect(mensagens[0]!.assunto).toMatch(/^Relatório de \d{2}\/\d{2}\/\d{4}$/);
    expect(mensagens[0]!.texto).toContain("1 venda confirmada");
    expect(mensagens[0]!.rotulo).toBe("aviso-de-notificacao");

    // Segunda rodada no mesmo dia: a chave antiduplicação do dia segura o aviso e,
    // com ele, a mensagem. O relatório não vira spam de teste de rotina.
    const segunda = await app.inject({
      method: "POST", url: "/api/ops/jobs/relatorio-diario/run", headers: auth(token),
    });
    await aguardarFilaDeMail();
    expect((segunda.json() as { mensagem: string }).mensagem).toMatch(/· 0 e-mails?/);
    expect(paraQuem(entregador, colega.email)).toHaveLength(1);
  });
});
