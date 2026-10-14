import { describe, it, expect, afterAll, beforeEach, afterEach } from "vitest";
import { app, makeAccount, cleanup, comFlag, uid, type Fixture } from "./helpers";
import { prisma } from "../src/lib/prisma";
import { definirMailer } from "../src/lib/mail";
import { AGUARDAR_FILA_PADRAO_MS, aguardarFilaDeMail, enfileirarMail, estadoDaFilaDeMail } from "../src/lib/mail/fila";
import type { ResultadoDeEntrega } from "../src/lib/mail/fila";
import type { MailerPort, MensagemDeMail, RotuloDeMail } from "../src/lib/mail/porta";

// T5.3 (achado N58, regra 2 do G1): nenhum request HTTP fica esperando provedor
// de e-mail.
//
// O que este arquivo prova, na ordem:
//   1. a resposta HTTP volta ANTES de a entrega terminar. Vermelho medido antes da
//      mudança, com um entregador de 250 ms no lugar do SMTP: o
//      `POST /api/auth/forgot-password` respondeu em 320 ms — `expected 320 to be
//      less than 250` — porque a pessoa pagava o tempo do servidor de e-mail numa
//      tela de "esqueci a senha";
//   2. a mensagem chega ao entregador mesmo assim, e a fila é a única coisa que
//      espera;
//   3. a retentativa existe, o recuo cresce (base, 2x), e é o worker que carimba a
//      auditoria de falha — uma linha só, depois da última tentativa, dizendo
//      quantas houve;
//   4. o tempo por tentativa tem teto (`MAIL_TIMEOUT_MS`): um SMTP que aceita a
//      conexão e nunca entrega é cortado, em vez de segurar a fila;
//   5. a fila tem teto de tamanho (`MAIL_FILA_MAXIMA`), e o que não entra vira
//      auditoria de entrega que não aconteceu — RAM do processo não é fila infinita;
//   6. a fila é FIFO e uma entrega por vez, e `aguardarFilaDeMail()` denuncia em vez
//      de devolver a fila ainda cheia, porque espera é a única coisa que um teste
//      tem para não aprovar uma caixa vazia por engano.
//
// Os entregadores abaixo são `MailerPort` declarados aqui, com o atraso, a falha ou
// o travamento que a prova precisa: nenhuma conexão de rede sai do teste, e o que
// cada um registra é a lista de mensagens recebidas e a hora de cada tentativa — o
// mesmo contrato da caixa de memória da D1.

// O atraso é maior do que o SMTP lento do achado pede de propósito: com 250 ms um
// soluço de agendamento do Windows (uma corrida desta janela marcou 259 ms no
// pedido aquecido, outra marcou 7 ms) é indistinguível de "o request pagou a
// entrega". Com 600 ms o pedido aquecido precisa voltar numa fração do tempo do
// provedor, que é exatamente o que a regra 2 do G1 cobra — e a margem não enfraquece
// nada: a entrega aguardada do mesmo entregador custa 600 ms ou mais.
const DELAY_DE_PROVA_MS = 600;
const BASE_DE_RECUO_MS = 40;

/** Entregador que demora de propósito: é o SMTP lento do achado, em miniatura. */
function entregadorLento(atrasoMs: number): MailerPort & { recebidas: MensagemDeMail[] } {
  const recebidas: MensagemDeMail[] = [];
  return {
    nome: "lento-de-prova",
    recebidas,
    async enviar(mensagem: MensagemDeMail): Promise<void> {
      await new Promise((resolve) => setTimeout(resolve, atrasoMs).unref());
      recebidas.push(mensagem);
    },
  };
}

/**
 * Entregador que falha sempre e anota o relógio de cada tentativa. É o objeto da
 * prova de retentativa: sem as horas não há como medir o recuo, e sem falha nunca
 * há segunda tentativa.
 */
function entregadorQueFalha(): MailerPort & { tentativas: number; horas: number[] } {
  const horas: number[] = [];
  const port: MailerPort & { tentativas: number; horas: number[] } = {
    nome: "falho-de-prova",
    tentativas: 0,
    horas,
    async enviar(): Promise<void> {
      port.tentativas += 1;
      horas.push(Date.now());
      throw new Error("o servidor de e-mail recusou a entrega (entregador de prova)");
    },
  };
  return port;
}

/** Entregador que nunca responde: é o SMTP que aceita a conexão e fica mudo. */
function entregadorTravado(): MailerPort & { recebidas: MensagemDeMail[]; soltar(): void } {
  const recebidas: MensagemDeMail[] = [];
  let libertar: () => void = () => {};
  const barreira = new Promise<void>((resolve) => {
    libertar = resolve;
  });
  return {
    nome: "travado-de-prova",
    recebidas,
    soltar() {
      libertar();
    },
    async enviar(mensagem: MensagemDeMail): Promise<void> {
      await barreira;
      recebidas.push(mensagem);
    },
  };
}

/** Entregador rápido que só registra a ordem em que recebeu. */
function entregadorDeOrdem(): MailerPort & { recebidas: string[] } {
  const recebidas: string[] = [];
  return {
    nome: "ordem-de-prova",
    recebidas,
    async enviar(mensagem: MensagemDeMail): Promise<void> {
      recebidas.push(mensagem.assunto);
    },
  };
}

function mensagem(assunto: string, rotulo: RotuloDeMail = "recuperacao-de-senha"): MensagemDeMail {
  return {
    para: uid("fila") + "@nexus.test",
    assunto,
    texto: "corpo de prova — " + assunto,
    rotulo,
  };
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

async function pedirRecuperacao(email: string): Promise<{ status: number; corpo: string; ms: number }> {
  const inicio = Date.now();
  const res = await app.inject({ method: "POST", url: "/api/auth/forgot-password", payload: { email } });
  return { status: res.statusCode, corpo: res.body, ms: Date.now() - inicio };
}

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

describe("Fila de entrega de e-mail (N58)", () => {
  it("o request volta antes de a entrega terminar, e a fila espera por ela", async () => {
    // Aquecimento, medido e não suposto: neste processo o PRIMEIRO request de
    // recuperação chega a custar ~1,3 s (numa corrida, `responseTime` 1269 ms; na
    // seguinte, o mesmo custo apareceu em `makeAccount`, 1 708 ms), e ele não é da
    // entrega — com a caixa de memória do `vitest.config.ts` o caminho frio custa o
    // mesmo, e o que sobe é a primeira conexão extra do pool do Prisma com o MySQL
    // da prova. Medir o pedido já aquecido é o que deixa o número abaixo dizendo uma
    // coisa só: o tempo do provedor de e-mail.
    const aquecimento = registrou(await makeAccount("OWNER"));
    await pedirRecuperacao(aquecimento.email);
    await aguardarFilaDeMail();

    const conta = registrou(await makeAccount("ADMIN"));
    const entregador = entregadorLento(DELAY_DE_PROVA_MS);
    definirMailer(entregador);

    const pedido = await pedirRecuperacao(conta.email);
    expect(pedido.status).toBe(200);
    // A resposta é a de sempre: `{ ok: true }`, sem código e sem detalhe de entrega.
    expect(JSON.parse(pedido.corpo)).toEqual({ ok: true });
    expect(pedido.corpo).not.toMatch(/[0-9a-f]{32,}/);

    // O número que a regra 2 do G1 cobrava: com `await mailer().enviar(...)` dentro
    // do handler isto era 320 ms contra os 250 ms do entregador (vermelho medido).
    // Com a fila, o mesmo pedido aquecido respondeu em 9 ms (medido nesta janela).
    expect(pedido.ms).toBeLessThan(DELAY_DE_PROVA_MS);
    // E no instante em que a resposta voltou a entrega ainda estava no ar — é o que
    // significa "fila", provado em vez de suposto. Esta asserção não depende de
    // relógio nenhum: se o handler esperasse, a caixa estaria cheia aqui.
    expect(entregador.recebidas).toHaveLength(0);
    expect(estadoDaFilaDeMail().vivas).toBe(1);

    // A asserção acima só vale se o entregador for lento de verdade, então a
    // lentidão é medida no mesmo processo, no mesmo instante, sem fila no meio: a
    // entrega aguardada custa o atraso. É um entregador à parte justamente para não
    // sujar a caixa do pedido acima, que é o que se conta logo depois.
    const contraste = entregadorLento(DELAY_DE_PROVA_MS);
    const inicioEntrega = Date.now();
    await contraste.enviar(mensagem("entrega aguardada de prova"));
    expect(Date.now() - inicioEntrega).toBeGreaterThanOrEqual(DELAY_DE_PROVA_MS);

    await aguardarFilaDeMail();
    expect(entregador.recebidas).toHaveLength(1);
    expect(entregador.recebidas[0]!.rotulo).toBe("recuperacao-de-senha");
    expect(entregador.recebidas[0]!.para.toLowerCase()).toBe(conta.email.toLowerCase());
    expect(estadoDaFilaDeMail()).toEqual({ naFila: 0, vivas: 0, trabalhando: false });
  });

  it("a retentativa recua, e a auditoria de falha vem uma vez só, depois da última tentativa", async () => {
    const conta = registrou(await makeAccount("OWNER"));
    const entregador = entregadorQueFalha();
    definirMailer(entregador);

    await comFlag("MAIL_BACKOFF_BASE_MS", String(BASE_DE_RECUO_MS), async () => {
      const pedido = await pedirRecuperacao(conta.email);
      expect(pedido.status).toBe(200);
      await aguardarFilaDeMail();
    });

    // Três tentativas no padrão, e o recuo é exponencial: a segunda espera começa
    // depois da base, a terceira depois do dobro — medido no relógio do entregador.
    expect(entregador.tentativas).toBe(3);
    const primeira = entregador.horas[1]! - entregador.horas[0]!;
    const segunda = entregador.horas[2]! - entregador.horas[1]!;
    expect(primeira).toBeGreaterThanOrEqual(BASE_DE_RECUO_MS - 5);
    expect(segunda).toBeGreaterThanOrEqual(primeira);
    expect(segunda).toBeGreaterThanOrEqual(BASE_DE_RECUO_MS * 2 - 5);

    // Uma linha de auditoria, não três: quem lê a tela de auditoria precisa saber
    // que a entrega falhou, e repetir o mesmo fato por tentativa é ruído.
    const eventos = await prisma.auditLog.findMany({
      where: { userId: conta.userId, action: "auth.forgot_password_entrega_falhou" },
    });
    expect(eventos).toHaveLength(1);
    const metadata = eventos[0]!.metadata as { rotulo?: string; motivo?: string; tentativas?: number };
    expect(metadata.rotulo).toBe("recuperacao-de-senha");
    expect(metadata.tentativas).toBe(3);
    expect(metadata.motivo).toContain("recusou a entrega");
    // O texto redigido continua sem segredo nenhum.
    expect(JSON.stringify(eventos[0]!.metadata ?? {})).not.toMatch(/[0-9a-f]{32,}/);

    // Pedindo de novo com a mesma conta: a segunda entrega tem a segunda linha.
    const outro = await pedirRecuperacao(conta.email);
    expect(outro.status).toBe(200);
    await aguardarFilaDeMail();
    expect(await prisma.auditLog.count({ where: { userId: conta.userId, action: "auth.forgot_password_entrega_falhou" } })).toBe(2);
  });

  it("o teto por tentativa corta o SMTP que aceita a conexão e nunca entrega", async () => {
    const conta = registrou(await makeAccount("OWNER"));
    const entregador = entregadorTravado();
    definirMailer(entregador);

    const TETO_MS = 80;
    const inicio = Date.now();
    await comFlag("MAIL_TIMEOUT_MS", String(TETO_MS), async () => {
      await comFlag("MAIL_TENTATIVAS", "1", async () => {
        const pedido = await pedirRecuperacao(conta.email);
        expect(pedido.status).toBe(200);
        await aguardarFilaDeMail(2_000);
      });
    });
    const duracaoMs = Date.now() - inicio;

    // Sem o teto a fila esperaria o `MAIL_TIMEOUT_MS` padrão, e sem o teto
    // nenhum, o socket do nodemailer: dez minutos de inatividade é o padrão dele.
    expect(duracaoMs).toBeLessThan(2_000);
    const evento = await prisma.auditLog.findFirst({
      where: { userId: conta.userId, action: "auth.forgot_password_entrega_falhou" },
      orderBy: { createdAt: "desc" },
    });
    expect(evento).not.toBeNull();
    const motivo = (evento!.metadata as { motivo?: string }).motivo ?? "";
    expect(motivo).toContain("não respondeu em " + TETO_MS + " ms");
    expect(entregador.recebidas).toHaveLength(0);
    entregador.soltar();
  });

  it("a fila recusa o que passa do teto de memória, com auditoria e tentativa zero", async () => {
    const entregador = entregadorDeOrdem();
    definirMailer(entregador);
    const resultados: ResultadoDeEntrega[] = [];

    await comFlag("MAIL_FILA_MAXIMA", "2", async () => {
      // Sem `await` no meio: é por isso que a recusa é determinística — o worker só
      // aciona no próximo turninho do event loop, então as três mensagens são
      // contadas vivas antes de qualquer entrega começar.
      enfileirarMail(mensagem("primeira"), (r) => void resultados.push(r));
      enfileirarMail(mensagem("segunda"), (r) => void resultados.push(r));
      enfileirarMail(mensagem("terceira"), (r) => void resultados.push(r));
      await aguardarFilaDeMail();
    });

    expect(resultados).toHaveLength(3);
    expect(resultados.filter((r) => r.ok)).toHaveLength(2);
    const recusada = resultados.find((r) => !r.ok)!;
    expect(recusada.tentativas).toBe(0);
    expect(String((recusada.erro as Error).message)).toContain("a fila de e-mail está cheia (2 mensagens na espera)");
    expect(entregador.recebidas).toEqual(["primeira", "segunda"]);
  });

  it("a fila é FIFO, uma entrega por vez, e o desligue espera o esvaziamento", async () => {
    const entregador = entregadorTravado();
    definirMailer(entregador);

    enfileirarMail(mensagem("um", "verificacao-de-email"));
    enfileirarMail(mensagem("dois", "verificacao-de-email"));
    enfileirarMail(mensagem("tres", "verificacao-de-email"));
    expect(estadoDaFilaDeMail().vivas).toBe(3);

    // `aguardarFilaDeMail` denuncia, não devolve a conta pela metade: um `await` que
    // passasse com a fila cheia faria o teste abaixo ler caixa vazia e aprovar.
    await expect(aguardarFilaDeMail(30)).rejects.toThrow(/não esvaziou em 30 ms/);
    expect(estadoDaFilaDeMail().vivas).toBe(3);

    entregador.soltar();
    await aguardarFilaDeMail();
    // Uma entrega por vez, na ordem: a fila não embaralha recuperação com verificação.
    expect(entregador.recebidas.map((m) => m.assunto)).toEqual(["um", "dois", "tres"]);

    // O teto de espera padrão é o que o desligue do servidor usa, e ele é dito aqui
    // em vez de ficar espalhado em número mágico nos dois chamadores.
    expect(AGUARDAR_FILA_PADRAO_MS).toBe(5_000);
  });
});
