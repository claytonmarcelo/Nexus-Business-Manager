import { prisma } from "./prisma";

// T3.2: tentativas de login por endereço de e-mail.
//
// A regra que o prompt de continuação pede é "bloqueio por conta, sem diferença
// mensurável". As duas metades da frase brigam entre si, e a tabela resolve:
//
// - "sem diferença mensurável" quer dizer que a resposta para e-mail inexistente,
//   senha errada e senha certa em conta bloqueada é a mesma palavra, no mesmo
//   status, com o mesmo trabalho de hash no meio. Se a contagem vivesse numa
//   coluna de `users`, quem chutasse um endereço que não existe receberia a
//   resposta mais rápido (sem hash, sem incremento) — e a diferença de tempo
//   diria exatamente quais endereços estão cadastrados, que é a informação que
//   se queria proteger.
// - por isso a contagem mora fora de `users`, chaveada pelo endereço em minúsculas,
//   e existe linha para endereço que não é de ninguém. Bloquear "uma conta que não
//   existe" não custa nada e não entrega nada.
//
// Cinco falhas seguidas dentro de quinze minutos bloqueiam por quinze minutos. Os
// números são escolha de produto, não de protocolo: abaixo de cinco um erro de
// digitação derruba gente demais, acima de dez o ataque por dicionário tem
// paciência de sobra. As três chaves são exportadas porque o teste precisa
// escrever exatamente a mesma régua que o código aplica.
export const FALHAS_PARA_BLOQUEIO = 5;
export const JANELA_DE_CONTAGEM_MS = 15 * 60 * 1000;
export const DURACAO_DO_BLOQUEIO_MS = 15 * 60 * 1000;

// Hash de uma senha que ninguém usa, com o mesmo custo do `lib/password.ts`
// (bcrypt, 12 rondas). Serve para uma coisa só: quando o endereço nem existe, o
// login ainda faz o trabalho do bcrypt antes de responder, para que a resposta de
// "e-mail errado" leve o mesmo tempo que a de "senha errada". Não é credencial de
// nada — é o preço de tempo que se paga de propósito.
export const HASH_DE_ISCACAO = "$2a$12$cBNfuU4HAmD9G1TznTeQquBBDfp/vJZJqypC1WBVOWaXT.nk52..K";

export type ChaveDeEndereco = string;

export function enderecoDaChave(email: string): ChaveDeEndereco {
  return email.trim().toLowerCase();
}

// A decisão em si, separada da leitura do banco: com uma linha na mão e o "agora"
// dado, isto responde se aquela conta está trancada. É a função que o teste unitá
// sem precisar de MySQL, e é a que documenta o comportamento das bordas.
export function estaTrancada(
  linha: { failures: number; lastFailedAt: Date; lockedUntil: Date | null } | null,
  agora: Date,
): boolean {
  if (!linha) return false;
  // Janela de contagem vencida: as falhas antigas já não contam para nada, e o
  // bloqueio que elas provocaram vence junto. É o que devolve o acesso a quem
  // simplesmente esperou, sem ligação com suporte.
  if (agora.getTime() - linha.lastFailedAt.getTime() > JANELA_DE_CONTAGEM_MS) return false;
  if (!linha.lockedUntil) return false;
  return linha.lockedUntil.getTime() > agora.getTime();
}

/**
 * Lê a linha de tentativas descartando o que venceu. Linha velha (fora da janela
 * de contagem e sem bloqueio vigente) é apagada ali mesmo: é assim que a tabela
 * não cresce para sempre com endereços chutados por robô, e é por isso que um
 * login depois de horas de inatividade começa a contagem do zero.
 */
export async function lerTentativas(email: string, agora = new Date()): Promise<{ trancada: boolean }> {
  const chave = enderecoDaChave(email);
  const linha = await prisma.loginAttempt.findUnique({ where: { email: chave } });
  if (!linha) return { trancada: false };
  const trancada = estaTrancada(linha, agora);
  if (!trancada && agora.getTime() - linha.lastFailedAt.getTime() > JANELA_DE_CONTAGEM_MS) {
    await prisma.loginAttempt.delete({ where: { email: chave } });
  }
  return { trancada };
}

/**
 * Registra uma falha. Retorna o estado depois do registro para quem chama decidir
 * o que auditar. Falha que chega depois de a conta já estar trancada soma na
 * contagem mas NÃO empurra o prazo: é o dono da conta tentando entrar enquanto
 * esperava, e esticar o bloqueio a cada clique seria transformar o erro dele em
 * punição sem fim.
 */
export async function registrarFalha(
  email: string,
  agora = new Date(),
): Promise<{ failures: number; bloqueouAgora: boolean }> {
  const chave = enderecoDaChave(email);
  const existente = await prisma.loginAttempt.findUnique({ where: { email: chave } });
  const foraDaJanela = !existente || agora.getTime() - existente.lastFailedAt.getTime() > JANELA_DE_CONTAGEM_MS;

  // Contagem recomeça: a linha anterior já não diz nada do que está acontecendo
  // agora. `firstFailedAt` volta a ser agora pela mesma razão — é o carimbo da
  // sequência, não a data da primeira vez que alguém errou a senha naquela conta.
  const falhas = (foraDaJanela ? 0 : existente!.failures) + 1;
  const iaBloquear = falhas >= FALHAS_PARA_BLOQUEIO;
  const jaTrancada = existente ? estaTrancada(existente, agora) : false;
  const lockedUntil = iaBloquear && !jaTrancada ? new Date(agora.getTime() + DURACAO_DO_BLOQUEIO_MS) : existente?.lockedUntil ?? null;

  await prisma.loginAttempt.upsert({
    where: { email: chave },
    update: { failures: falhas, lastFailedAt: agora, lockedUntil },
    create: {
      email: chave,
      failures: falhas,
      firstFailedAt: agora,
      lastFailedAt: agora,
      lockedUntil,
    },
  });

  // O bloqueio "aconteceu agora" é o que se audita uma única vez: sem este corte,
  // cada tentativa seguintes dentro do bloqueio geraria um evento novo e a
  // auditoria viraria ruído.
  return { failures: falhas, bloqueouAgora: iaBloquear && !jaTrancada };
}

/** Login certo: a contagem some junto. Linha apagada é o estado "sem histórico". */
export async function zerarTentativas(email: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { email: enderecoDaChave(email) } });
}
