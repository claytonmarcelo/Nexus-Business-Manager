// N58 (T5.3, regra 2 do G1): nenhum request HTTP fica esperando provedor de e-mail.
//
// Até aqui os três envios do produto eram `await mailer().enviar(...)` dentro do
// handler — `auth.service.ts`, `verificacao.service.ts` e `segundo-fator.service.ts`.
// Medido antes desta mudança, com um entregador de 250 ms injetado no lugar do SMTP:
// o `POST /api/auth/forgot-password` respondeu em 320 ms, porque a pessoa pagava o
// tempo do servidor de e-mail numa tela de "esqueci a senha". A porta de entrega
// estava certa; o que faltava era o chão embaixo dela.
//
// O que esta fila é, e o que ela não é:
//  - memória do processo, um consumidor só, uma mensagem por vez. Ela não sobrevive
//    a reinício e não é distribuída. Persistir no banco estava fora de cogitação:
//    a mensagem de recuperação e a de verificação carregam o código em texto puro
//    (é o que a pessoa digita), e gravar a fila seria escrever token em claro na
//    tabela de fila — o projeto guarda esses códigos só como HMAC. A consequência
//    aceita está no ADR-0020: o que está na fila na hora do desligue se perde, e o
//    reenvio continua sendo a saída do usuário.
//  - entrega com retentativa e recuo exponencial, e é ela — não o request — que
//    carimba a auditoria de falha, depois da última tentativa.
//  - teto por tentativa (`MAIL_TIMEOUT_MS`) e teto de tamanho (`MAIL_FILA_MAXIMA`).
//    Passou do teto, a mensagem é recusada com auditoria; encher a RAM do processo
//    para entregar uma mensagem a mais não é troca.
//  - nenhum relógio ligado no boot: o worker só existe quando há mensagem, do mesmo
//    jeito do agendador de rotinas, que mora em `server.ts`. Uma ferramenta de
//    linha de comando que importa o mailer não fica com um timer pendurado.
//
// Regra permanente do projeto, e esta linha não é exceção: nenhum endereço inteiro,
// token ou credencial sai em log daqui. O que se escreve é o resumo redigido da
// falha (`resumoDaFalha`), o mesmo texto que vai para a auditoria.

import { env } from "../../config/env";
import { mailer } from "./index";
import { resumoDaFalha } from "./porta";
import type { MensagemDeMail } from "./porta";

/** O resultado com que o worker devolve uma mensagem a quem a enfileirou. */
export interface ResultadoDeEntrega {
  /** A mensagem saiu pelo entregador do ambiente. */
  ok: boolean;
  /** Quantas tentativas chegaram a ser executadas (1 quando a primeira entrega). */
  tentativas: number;
  /** O erro da última tentativa; presente quando `ok` é falso. */
  erro?: unknown;
}

/**
 * Aviso de conclusão. Ele roda no worker, depois da última tentativa, e é dele a
 * responsabilidade de registrar o que aconteceu (auditoria). Um aviso que falha
 * não derruba a fila: a fila é o caminho das mensagens, não o dono do banco.
 */
export type ConclusaoDeEntrega = (resultado: ResultadoDeEntrega) => void | Promise<void>;

interface Tarefa {
  mensagem: MensagemDeMail;
  aoConcluir?: ConclusaoDeEntrega;
  /** Tentativas já executadas desta mensagem. */
  feitas: number;
  /** Quando existe, a mensagem nunca sai: a fila estava cheia quando chegou. */
  recusa?: Error;
}

const fila: Tarefa[] = [];

/** Mensagens vivas: na fila, em entrega ou no meio de um recuo de espera. */
let vivas = 0;
let trabalhando = false;

/** Quem chamou `aguardarFilaDeMail()` e ainda está esperando. */
const despertadores = new Set<() => void>();

/**
 * Tempo que `aguardarFilaDeMail()` tolera antes de denunciar. Cinco segundos é o
 * bastante para as três tentativas padrão com recuo de meio segundo, e é o que o
 * desligue do processo pode esperar sem brigar com o `docker stop`.
 */
export const AGUARDAR_FILA_PADRAO_MS = 5_000;

/**
 * Avisa quem está esperando — mas só quando a fila está em repouso de verdade:
 * nenhuma mensagem viva, nada na espera e nenhum worker no meio do laço.
 *
 * O `trabalhando` no meio do caminho não é preciosismo. `concluir()` devolve com o
 * worker ainda dentro de `bombear()`, e acordar o `aguardarFilaDeMail()` ali faria
 * quem espera ler `estadoDaFilaDeMail()` e ver `trabalhando: true` numa fila que o
 * próprio teste acabou de esvaziar. O aviso sai do `finally` de `bombear()` (e do
 * tratamento de pane, abaixo), que é o ponto em que não há mais nada a fazer.
 */
function avisarFilaVazia(): void {
  if (vivas > 0 || fila.length > 0 || trabalhando) return;
  for (const despertar of [...despertadores]) {
    despertadores.delete(despertar);
    despertar();
  }
}

function atrasar(ms: number): Promise<void> {
  return new Promise((resolve) => {
    // `unref`: uma retentativa agendada não pode ser o motivo de o processo não
    // terminar. Em servidor tem handle de escuta sobrando; em ferramenta de linha
    // de comando e em teste o que segura o loop é o `aguardarFilaDeMail()`.
    setTimeout(resolve, ms).unref();
  });
}

/**
 * Os quatro números da política são lidos com `Number()` de propósito: o zod de
 * `config/env.ts` já garantiu o formato na subida, mas `comFlag` dos testes escreve
 * string no objeto validado, e uma comparação ou exponencial sobre texto é o tipo
 * de erro que passa em tudo e entrega a mensagem na ordem errada.
 */
function numero(valor: number | string): number {
  return Number(valor);
}

/** Recuo exponencial: base, 2x, 4x — com o expoente sendo o que já falhou. */
function recuoDaTentativa(tentativasFeitas: number): number {
  return numero(env.MAIL_BACKOFF_BASE_MS) * 2 ** (tentativasFeitas - 1);
}

/**
 * Coloca a mensagem na fila e devolve na hora. É a única chamada que um handler de
 * HTTP faz; o resto do tempo é do worker.
 */
export function enfileirarMail(mensagem: MensagemDeMail, aoConcluir?: ConclusaoDeEntrega): void {
  const capacidade = numero(env.MAIL_FILA_MAXIMA);
  if (vivas >= capacidade) {
    fila.push({
      mensagem,
      aoConcluir,
      feitas: 0,
      recusa: new Error("a fila de e-mail está cheia (" + capacidade + " mensagens na espera)"),
    });
  } else {
    fila.push({ mensagem, aoConcluir, feitas: 0 });
  }
  vivas += 1;
  acionarWorker();
}

function acionarWorker(): void {
  if (trabalhando || fila.length === 0) return;
  // `setImmediate` em vez de começar aqui mesmo: o handler que enfileirou precisa
  // poder fechar a resposta. É exatamente isso que o achado cobra.
  setImmediate(() => {
    void bombear().catch((erro) => {
      // Só chega aqui se o próprio `bombear()` quebrar por fora do try/finally, o
      // que não acontece no caminho normal. Se acontecer, o motivo vai para o log e
      // o worker fica livre para a próxima mensagem. Não religar no mesmo turno é
      // decisão: um erro que se repete em cada tentativa de bomba viraria um laço
      // quente dentro do processo, e o que a fila tem que proteger é o request, não
      // o próprio recorde. O `aguardarFilaDeMail()` correspondente estoura o teto e
      // denuncia — fila parada não passa por fila vazia.
      process.stdout.write("[mail:fila] o worker parou: " + resumoDaFalha(erro) + "\n");
      trabalhando = false;
      avisarFilaVazia();
    });
  });
}

async function bombear(): Promise<void> {
  if (trabalhando) return;
  trabalhando = true;
  try {
    while (fila.length > 0) {
      const tarefa = fila.shift();
      if (tarefa) await processar(tarefa);
    }
  } finally {
    // Primeiro para o laço, depois avisa: é esta a ordem que faz um `await` em
    // `aguardarFilaDeMail()` acordar numa fila que já está parada de fato.
    trabalhando = false;
    avisarFilaVazia();
  }
}

async function processar(tarefa: Tarefa): Promise<void> {
  const limite = numero(env.MAIL_TENTATIVAS);
  let ultimoErro: unknown;

  // Fila cheia: a mensagem chega aqui já recusada, e o que se entrega é a recusa
  // pela mesma porta de conclusão de uma entrega que falhou. Nada é tentado.
  if (tarefa.recusa) {
    await concluir(tarefa, { ok: false, tentativas: 0, erro: tarefa.recusa });
    return;
  }

  while (tarefa.feitas < limite) {
    tarefa.feitas += 1;
    try {
      await entregarComTeto(tarefa.mensagem, numero(env.MAIL_TIMEOUT_MS));
      await concluir(tarefa, { ok: true, tentativas: tarefa.feitas });
      return;
    } catch (erro) {
      ultimoErro = erro;
      // O recuo só existe se ainda houver tentativa pela frente: a última falha
      // não deixa o worker dormindo à toa por mais meio segundo.
      if (tarefa.feitas < limite) await atrasar(recuoDaTentativa(tarefa.feitas));
    }
  }

  await concluir(tarefa, { ok: false, tentativas: tarefa.feitas, erro: ultimoErro });
}

/**
 * Uma tentativa com teto. O `Promise.race` não cancela a entrega que estourou o
 * tempo — o que ele cancela é a espera da fila. O `catch` órfão abaixo existe para
 * aquela entrega tardia não virar rejeição sem dono quando ela falhar depois; o
 * race já trata o erro que chegar primeiro.
 */
async function entregarComTeto(mensagem: MensagemDeMail, tetoMs: number): Promise<void> {
  const entrega = mailer().enviar(mensagem);
  if (tetoMs <= 0) {
    await entrega;
    return;
  }
  entrega.catch(() => {});
  let cronometro: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      entrega,
      new Promise<never>((_resolve, rejeita) => {
        cronometro = setTimeout(
          () => rejeita(new Error("a entrega de e-mail não respondeu em " + tetoMs + " ms")),
          tetoMs,
        );
        cronometro.unref();
      }),
    ]);
  } finally {
    if (cronometro) clearTimeout(cronometro);
  }
}

async function concluir(tarefa: Tarefa, resultado: ResultadoDeEntrega): Promise<void> {
  try {
    if (tarefa.aoConcluir) await tarefa.aoConcluir(resultado);
  } catch (erro) {
    // O aviso de conclusão é o auditor da entrega. Se ele falha, o que se perde é o
    // registro daquela mensagem, nunca a fila das outras.
    process.stdout.write("[mail:fila] o aviso de conclusao falhou: " + resumoDaFalha(erro) + "\n");
  }
  vivas -= 1;
  avisarFilaVazia();
}

/**
 * Espera a fila esvaziar. Usado no desligue limpo do servidor e pelos testes que
 * leem caixa de e-mail ou auditoria de entrega.
 *
 * Estourar o teto é denúncia, não silêncio: um `await` que devolve com a fila
 * ainda cheia faria um teste ler uma caixa vazia e aprovar. O desligue captura o
 * erro e segue; o teste deixa cair.
 */
export function aguardarFilaDeMail(esperaMaximaMs: number = AGUARDAR_FILA_PADRAO_MS): Promise<void> {
  if (vivas === 0) return Promise.resolve();
  return new Promise<void>((resolve, rejeita) => {
    const cronometro = setTimeout(() => {
      despertadores.delete(despertar);
      rejeita(
        new Error(
          "a fila de e-mail não esvaziou em " + esperaMaximaMs + " ms — " + vivas + " mensagem(ns) pendente(s)",
        ),
      );
    }, esperaMaximaMs);
    function despertar(): void {
      clearTimeout(cronometro);
      despertadores.delete(despertar);
      resolve();
    }
    despertadores.add(despertar);
  });
}

/** Leitura do estado da fila para teste e para quem opera o processo. */
export function estadoDaFilaDeMail(): { naFila: number; vivas: number; trabalhando: boolean } {
  return { naFila: fila.length, vivas, trabalhando };
}
