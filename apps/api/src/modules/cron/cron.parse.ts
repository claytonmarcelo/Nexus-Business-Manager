// Leitor de expressão cron de 5 campos: minuto hora dia-do-mês mês dia-da-semana.
// Nada de biblioteca externa: o formato aceito é o cron clássico com listas
// (0,15), intervalos (1-5), passo (*​/6, 10-30/5) e curinga. Toda expressão
// guardada na tabela cron_jobs passa por este parser antes de virar execução —
// expressão inválida é rejeitada na entrada (badRequest), nunca descoberta na
// madrugada por um executor mudo.
import { badRequest } from "../../lib/errors";

export interface CronSpec {
  raw: string;
  minute: number[];
  hour: number[];
  dom: number[];
  month: number[];
  dow: number[];
}

// [min, max] de cada campo. O dia da semana aceita 7 como sinônimo de domingo.
const CAMPOS: { nome: string; min: number; max: number }[] = [
  { nome: "minuto", min: 0, max: 59 },
  { nome: "hora", min: 0, max: 23 },
  { nome: "dia do mês", min: 1, max: 31 },
  { nome: "mês", min: 1, max: 12 },
  { nome: "dia da semana", min: 0, max: 7 },
];

function expandirPeça(peça: string, campo: { nome: string; min: number; max: number }, out: Set<number>): void {
  const m = /^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/.exec(peça.trim());
  if (!m) throw badRequest(`Expressão cron inválida no campo "${campo.nome}": ${peça}`);
  const corpo = m[1] as string;
  const temPasso = Boolean(m[2]);
  const passo = m[2] ? Number(m[2]) : 1;
  if (passo < 1) throw badRequest(`Passo inválido no campo "${campo.nome}": ${peça}`);

  let inicio = campo.min;
  let fim = campo.max;
  if (corpo !== "*") {
    const valores = corpo.split("-").map(Number);
    const a = valores[0];
    const b = valores[1];
    if (a === undefined || Number.isNaN(a)) throw badRequest(`Valor inválido no campo "${campo.nome}": ${peça}`);
    if (b !== undefined && Number.isNaN(b)) throw badRequest(`Intervalo inválido no campo "${campo.nome}": ${peça}`);
    inicio = a;
    fim = b !== undefined ? b : temPasso ? campo.max : a; // "10/5" = 10 até o fim, de 5 em 5; "10" = só 10
  }
  if (inicio < campo.min || fim > campo.max || inicio > fim) {
    throw badRequest(`Fora da faixa (${campo.min}–${campo.max}) no campo "${campo.nome}": ${peça}`);
  }
  for (let v = inicio; v <= fim; v += passo) {
    // 7 → 0 (domingo). As demais faixas entram direto.
    out.add(campo.nome === "dia da semana" && v === 7 ? 0 : v);
  }
}

/** Converte "5 0-6 * * 1-5" em conjuntos de valores por campo. Inválido = 400. */
export function parseCron(raw: string): CronSpec {
  const partes = (raw || "").trim().split(/\s+/);
  if (partes.length !== 5) {
    throw badRequest(`Expressão cron precisa ter 5 campos (minuto hora dia mês semana): ${raw}`);
  }
  const valoresDe = (indice: number): number[] => {
    const campoDef = CAMPOS[indice] as { nome: string; min: number; max: number };
    const texto = partes[indice] as string;
    const uniao = new Set<number>();
    for (const p of texto.split(",")) expandirPeça(p, campoDef, uniao);
    return Array.from(uniao).sort((x, y) => x - y);
  };
  const dow = valoresDe(4).includes(7)
    ? [...new Set([...valoresDe(4).filter((v) => v !== 7), 0])].sort((a, b) => a - b)
    : valoresDe(4);
  return {
    raw: raw.trim(),
    minute: valoresDe(0),
    hour: valoresDe(1),
    dom: valoresDe(2),
    month: valoresDe(3),
    dow,
  };
}

// Semântica declarada (documentada no README e nos testes): dia-do-mês e
// dia-da-semana funcionam em E (como no node-cron). Usar os dois restritos ao
// mesmo tempo é raro; quem precisar de "ou" cadastra duas rotinas.
export function cronCombina(spec: CronSpec, d: Date): boolean {
  return (
    spec.minute.includes(d.getMinutes()) &&
    spec.hour.includes(d.getHours()) &&
    spec.dom.includes(d.getDate()) &&
    spec.month.includes(d.getMonth() + 1) &&
    spec.dow.includes(d.getDay())
  );
}

/** Próxima execução estritamente depois de `base`, ou null se não houver em 366 dias. */
export function proximaExecucao(spec: CronSpec, base = new Date()): Date | null {
  const meses = new Set(spec.month);
  const dias = new Set(spec.dom);
  const semanas = new Set(spec.dow);
  const horas = new Set(spec.hour);
  const minutos = new Set(spec.minute);

  const d = new Date(base.getTime());
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 1);
  const limite = base.getTime() + 366 * 86_400_000;

  while (d.getTime() <= limite) {
    if (!meses.has(d.getMonth() + 1)) {
      d.setMonth(d.getMonth() + 1, 1);
      d.setHours(0, 0, 0, 0);
      continue;
    }
    if (!dias.has(d.getDate()) || !semanas.has(d.getDay())) {
      d.setDate(d.getDate() + 1);
      d.setHours(0, 0, 0, 0);
      continue;
    }
    if (!horas.has(d.getHours())) {
      d.setHours(d.getHours() + 1, 0, 0, 0);
      continue;
    }
    if (!minutos.has(d.getMinutes())) {
      d.setMinutes(d.getMinutes() + 1, 0, 0);
      continue;
    }
    return new Date(d.getTime());
  }
  return null;
}

const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function hhmm(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function completo(v: number[], min: number, max: number): boolean {
  return v.length === max - min + 1;
}

/**
 * Tradução pt-BR para a tela. As formas exatas mais comuns (passo de minuto,
 * passo de hora) são lidas do texto; o resto sai da estrutura dos conjuntos.
 * O texto bruto sempre acompanha a descrição, então nada se perde se a frase
 * ficar genérica.
 */
export function agendaLegivel(raw: string): string {
  let spec: CronSpec;
  try {
    spec = parseCron(raw);
  } catch {
    return `agenda ${raw}`;
  }
  const { minute, hour, dom, month, dow } = spec;
  const mesTudo = completo(month, 1, 12);
  const diaTudo = completo(dom, 1, 31);
  const semanaToda = completo(dow, 0, 6);
  const umMinuto = minute.length === 1;
  const m0 = Number(minute[0]); // seguro: só usado quando umMinuto
  const horaToda = completo(hour, 0, 23);

  // "*/15 * * * *" — passo de minutos.
  const mMin = /^\*\/(\d+) \* \* \* \*$/.exec(raw);
  if (mMin) {
    const n = Number(mMin[1]);
    return n === 1 ? "a cada minuto" : `a cada ${n} minutos`;
  }
  // "5 */3 * * *" — passo de horas.
  const mHora = /^\d+ \*\/(\d+) \* \* \*$/.exec(raw);
  if (mHora && umMinuto) {
    return `a cada ${mHora[1]} horas, no minuto ${String(m0).padStart(2, "0")}`;
  }
  if (umMinuto && !horaToda && diaTudo && mesTudo && semanaToda) {
    const horas = hour.map((h) => hhmm(h, m0)).join(" e ");
    return `todos os dias às ${horas}`;
  }
  if (umMinuto && !horaToda && diaTudo && mesTudo && !semanaToda) {
    const dias = dow.map((n) => DIAS_SEMANA[n]).join(", ");
    const horas = hour.map((h) => hhmm(h, m0)).join(" e ");
    return `nos dias ${dias}, às ${horas}`;
  }
  const d0 = Number(dom[0]);
  if (umMinuto && !horaToda && !diaTudo && mesTudo && semanaToda && dom.length === 1) {
    return `no dia ${d0} de cada mês, às ${hhmm(Number(hour[0]), m0)}`;
  }
  return `agenda ${raw}`;
}
