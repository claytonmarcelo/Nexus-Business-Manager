import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { audit, ESCOPO_PLATAFORMA } from "../../lib/audit";

// ===== T6.5 (F7) — retenção configurável da trilha de auditoria =====
//
// A trilha de auditoria é dado pessoal: cada linha diz quem praticou a ação, de
// onde a pessoa veio e o que mudou. Conservá-la para sempre é guarda sem fim —
// e a LGPD (art. 16, II e III) pede o contrário: conservar só pelo tempo
// necessário, e eliminar o que passou do prazo. O produto precisa oferecer as
// duas metades: a janela é **configurável**, e o que é apagado fica contado.
//
// Quatro decisões, todas reversíveis:
//
//  1. **o padrão é desligado.** `AUDIT_RETENTION_DIAS=0` significa "não apaga
//     nada". Uma instalação que não sabe quanto guarda é uma instalação que
//     guarda tudo — e a primeira decisão de quem opera tem de ser reversível
//     sem custo.
//  2. **a janela é da plataforma, não da empresa.** A trilha atravessa todas as
//     casas; a política de guarda também. Uma empresa não escolhe por quantos
//     dias a prova de que ela mesma mexeu em dado de alguém fica guardada.
//  3. **o expurgo em lote.** A tabela de auditoria é a maior da instalação
//     (a do dono tinha mais de sessenta mil linhas). Apagar tudo numa instrução
//     só segura a tabela inteira por um instante; o corte vai em lotes de mil,
//     com um teto de lotes por corrida para que a madrugada não vire um
//     apagador de horas.
//  4. **o apagamento também é auditado — mas só quando apaga.** Uma corrida que
//     não encontrou nada não escreve linha: o registro de que nada aconteceu
//     enche a trilha de ruído e ainda ocupa espaço. O que o operador precisa
//     ver — "quando apaguei, quantas linhas" — fica na própria linha do
//     expurgo, com a contagem.
//
// Limitação declarada, e não escondida: a retenção apaga também as linhas que
// provam o exercício de um direito da LGPD (o `lgpd.export`, o `lgpd.anonymize`,
// o `lgpd.delete`). A trilha é a prova; se a prova precisa durar mais que a
// janela, a janela é a que tem de ser maior. Quem quiser guardar essa prova
// por mais tempo escolhe um prazo maior — ou exporta a auditoria antes.

/** A janela configurada, em dias. Zero (ou valor inválido) = desligado. */
export function janelaDeRetencao(): number {
  const bruto = Number(env.AUDIT_RETENTION_DIAS);
  if (!Number.isFinite(bruto) || bruto <= 0) return 0;
  return Math.min(Math.trunc(bruto), 3650);
}

/** Quantas linhas caem por instrução de delete. */
const LOTE = 1000;
/** Teto de lotes por corrida: duzentas mil linhas. O que sobrar fica para a
 *  corrida do dia seguinte, e a contagem da mensagem diz o que sobrou. */
const TETO_DE_LOTES = 200;

export interface ResultadoDoExpurgo {
  /** A retenção estava ligada? */
  ligado: boolean;
  /** A janela em dias (0 quando desligado). */
  dias: number;
  /** Quantas linhas foram apagadas — o número exato, contado no banco. */
  apagadas: number;
  /** O instante de corte: tudo que nasceu antes disso foi apagado. */
  corte: string | null;
  /** Quantas instruções de delete foram feitas. */
  lotes: number;
  /** A frase que explica o que aconteceu, para a coluna de estado da rotina. */
  motivo: string;
}

/**
 * Apaga as linhas de auditoria mais velhas que a janela configurada.
 *
 * O corte é `<` (estritamente antes): uma linha que nasceu exatamente no
 * instante de corte é da janela, não é do passado. Sem isso, uma linha criada
 * no mesmo milissegundo do corte poderia cair por conta da arredondação do relógio.
 */
export async function expurgarAuditoria(agora: Date = new Date()): Promise<ResultadoDoExpurgo> {
  const dias = janelaDeRetencao();
  if (dias === 0) {
    return {
      ligado: false,
      dias: 0,
      apagadas: 0,
      corte: null,
      lotes: 0,
      motivo: "Retenção desligada (AUDIT_RETENTION_DIAS=0): nenhuma linha foi apagada.",
    };
  }

  const corte = new Date(agora.getTime() - dias * 24 * 60 * 60 * 1000);
  let apagadas = 0;
  let lotes = 0;

  while (lotes < TETO_DE_LOTES) {
    const lote = await prisma.auditLog.findMany({
      where: { createdAt: { lt: corte } },
      orderBy: { createdAt: "asc" },
      take: LOTE,
      select: { id: true },
    });
    if (lote.length === 0) break;
    const apagadasAgora = await prisma.auditLog.deleteMany({
      where: { id: { in: lote.map((l) => l.id) } },
    });
    apagadas += apagadasAgora.count;
    lotes += 1;
    if (lote.length < LOTE) break;
  }

  // Só há registro quando houve apagamento. A rotina "não achou nada" fica
  // na coluna de estado da tela de Rotinas, que é onde o operador olha.
  if (apagadas > 0) {
    await audit({
      scope: ESCOPO_PLATAFORMA,
      action: "ops.audit_purge",
      entity: "audit_log",
      metadata: { dias, apagadas, corte: corte.toISOString(), lotes },
    });
  }

  const sobrou = lotes >= TETO_DE_LOTES;
  return {
    ligado: true,
    dias,
    apagadas,
    corte: corte.toISOString(),
    lotes,
    motivo: sobrou
      ? `${apagadas} linhas apagadas (a corrida atingiu o teto de lotes; o que sobrou fica para a próxima).`
      : `${apagadas} ${apagadas === 1 ? "linha apagada" : "linhas apagadas"} da trilha de auditoria.`,
  };
}
