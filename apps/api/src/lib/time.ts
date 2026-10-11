import { prisma } from "./prisma";

// A meia-noite é da empresa, não do servidor (Fase 3c da auditoria).
//
// O relógio de dentro do Node é um só, e ele não pertence a ninguém: numa API
// com empresas em três fusos, "hoje" calculado com `new Date()` + `setHours` ou
// `setUTCHours` é o hoje do datacenter. Para um cliente em America/Sao_Paulo
// isso tem duas pontas: às 21h de Brasília o servidor já virou o dia, e o
// movimento do dia corrente saía do mês agregado do relatório; num fuso à frente
// de Greenwich o problema é o oposto — o dia que lá ainda não começou já entrou
// na conta daqui. Esta é a única casa da regra: quem precisa da borda do dia
// pergunta ao fuso da empresa, nunca ao processo.
//
// Duas bordas, porque duas espécies de coluna:
//
//  - `meiaNoiteNoFuso` devolve o INSTANTE da meia-noite local. É a fronteira
//    para colunas DATETIME (createdAt, startAt, paidAt), que gravam instante.
//  - `calendarioDaEmpresa` devolve o DIA DE CALENDÁRIO ancorado à meia-noite
//    UTC. É a fronteira para colunas `@db.Date` (dueDate), que não gravam
//    instante nenhum: o que a pessoa escreveu na tela foi "11/10", e o banco
//    guardou 2026-10-11T00:00:00Z. Aplicar a meia-noite do fuso a essas colunas
//    deslocaria a fronteira três horas para a frente e uma conta que vence hoje
//    acordaria vencida — por isso o rótulo delas se lê em UTC
//    (`diaDeCalendario`) e só se compara dia com dia.
//
// Por que o deslocamento é lido duas vezes em vez de somar um offset fixo:
// deslocamento de fuso não é constante — o Brasil já viveu horário de verão e
// ainda há quem o tenha no cadastro. Lido pelo `Intl.DateTimeFormat` com o
// `timeZone`, o instante que sai daqui é a meia-noite exata daquela data
// NAQUELE fuso, transição incluída: a janela do dia de uma virada de horário de
// verão tem 23 ou 25 horas porque é isso que o dia tem.

const HORA_MS = 3_600_000;
const DIA_MS = 86_400_000;

/** Deslocamento do fuso no instante dado, em ms (positivo = à frente de UTC). */
function deslocamentoMs(utcMs: number, timeZone: string): number {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3,
  }).formatToParts(new Date(utcMs));
  const parte = (tipo: string): number => {
    const achada = partes.find((p) => p.type === tipo);
    return Number(achada?.value ?? "0");
  };
  const comoUtc = Date.UTC(
    parte("year"),
    parte("month") - 1,
    parte("day"),
    parte("hour"),
    parte("minute"),
    parte("second"),
    parte("fractionalSecond"),
  );
  // round ao segundo: o relógio do fuso tem essa resolução, e 900ms de
  // arredondamento não significam nada em deslocamento de fuso horário.
  return Math.round((comoUtc - utcMs) / 1000) * 1000;
}

export function isValidoFuso(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Fuso para as contas de tempo. Inválido cai em UTC de propósito: a escrita já
 * é barrada no cadastro (`fusoValido`), e uma coluna envelhecida não pode
 * derrubar o painel inteiro nem o sino de avisos.
 */
function fusoParaUso(timeZone: string): string {
  return isValidoFuso(timeZone) ? timeZone : "UTC";
}

/** "AAAA-MM-DD" como a empresa enxerga o instante — para chaves e rótulos. */
export function diaNoFuso(timeZone: string, base: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: fusoParaUso(timeZone),
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(base);
  const campo = (tipo: Intl.DateTimeFormatPartTypes): string =>
    partes.find((p) => p.type === tipo)?.value ?? "00";
  // Monta em vez de cortar a string formatada: o separador do locale varia com
  // a versão do ICU (en-CA já devolveu barra em alguns builds), e daqui sai
  // sempre a mesma chave AAAA-MM-DD que o cron e os baldes esperam.
  return `${campo("year")}-${campo("month")}-${campo("day")}`;
}

/** AAAA-MM-DD da empresa — a etiqueta do mês corrente do resumo financeiro. */
export function mesNoFuso(timeZone: string, base: Date = new Date()): string {
  return diaNoFuso(timeZone, base).slice(0, 7);
}

/** O dia de calendário lido como o banco o guarda (coluna `@db.Date`). */
export function diaDeCalendario(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function rotuloEmPartes(rotulo: string): [number, number, number] {
  return [Number(rotulo.slice(0, 4)), Number(rotulo.slice(5, 7)), Number(rotulo.slice(8, 10))];
}

/**
 * Instante (UTC) da meia-noite do dia `ano/mês(1-based)/dia` dentro do fuso.
 * O instante procurado é o `t` em que o relógio do fuso marca 00:00 daquele
 * dia, isto é `t = rotuloUtc - des(t)`. Como `des` só muda em degraus de uma
 * hora, a segunda leitura já fecha a conta; o laço de três passadas existe só
 * para não oscilar no caso raro em que a transição de horário de verão cai
 * exatamente na meia-noite (o dia não tem 00:00) — aí qualquer uma das
 * passadas é uma meia-noite válida, e a que vale é a última.
 */
export function meiaNoiteDoDia(timeZone: string, ano: number, mes: number, dia: number): Date {
  const tz = fusoParaUso(timeZone);
  const rotuloUtc = Date.UTC(ano, mes - 1, dia);
  let alvo = rotuloUtc;
  for (let i = 0; i < 3; i++) {
    const candidato = rotuloUtc - deslocamentoMs(alvo, tz);
    if (candidato === alvo) break;
    alvo = candidato;
  }
  return new Date(alvo);
}

/**
 * Instante (UTC) da meia-noite do dia em que `base` vive dentro de `timeZone`.
 * Borda de coluna DATETIME: às 21:30UTC de ontem uma empresa em São Paulo já
 * está no dia de hoje, e a meia-noite desse dia é 03:00UTC de hoje.
 */
export function meiaNoiteNoFuso(timeZone: string, base: Date = new Date()): Date {
  const [ano, mes, dia] = rotuloEmPartes(diaNoFuso(timeZone, base));
  return meiaNoiteDoDia(timeZone, ano, mes, dia);
}

/**
 * Instante (UTC) da meia-noite do ANTERIOR ao dia em que `base` vive. Doze
 * horas ANTES da meia-noite de hoje, relida de novo no fuso: é o meio-dia de
 * ontem local, e a meia-noite que dele sai é a de ontem mesmo quando o dia teve
 * 23 ou 25 horas por horário de verão. Somar 12h (ou subtrair 24h fixas) daria
 * o dia errado em fuso atrasado — foi assim que a primeira versão nasceu.
 */
export function ontemNoFuso(timeZone: string, base: Date = new Date()): Date {
  const hoje = meiaNoiteNoFuso(timeZone, base);
  return meiaNoiteNoFuso(timeZone, new Date(hoje.getTime() - 12 * HORA_MS));
}

/**
 * O dia de calendário da empresa ancorado à meia-noite UTC. Borda de coluna
 * `@db.Date`: soma/descontar dias aqui é aritmética de calendário, sem fuso no
 * meio, e por isso o fluxo de caixa não pode duplicar um dia de transição.
 */
export function calendarioDaEmpresa(timeZone: string, base: Date = new Date()): Date {
  return new Date(`${diaNoFuso(timeZone, base)}T00:00:00.000Z`);
}

/** Meia-noite local `dias` antes do dia da empresa — janela traseira de série. */
export function diasAtrasNoCalendario(timeZone: string, dias: number, base: Date = new Date()): Date {
  return new Date(calendarioDaEmpresa(timeZone, base).getTime() - dias * DIA_MS);
}

/** O fuso registrado no cadastro; empresa que não existe mais é UTC. */
export async function fusoDaEmpresa(companyId: string): Promise<string> {
  const empresa = await prisma.company.findUnique({
    where: { id: companyId },
    select: { timezone: true },
  });
  return empresa?.timezone ?? "UTC";
}
