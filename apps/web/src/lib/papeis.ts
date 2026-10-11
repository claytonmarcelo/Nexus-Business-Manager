// Espelho, do lado da tela, da hierarquia de papéis que o servidor passou a
// centralizar em `apps/api/src/lib/rbac.ts` (`podeAtribuirPapel`, A1 do prompt
// de mercado). Não é substituto da guarda do backend — a autoridade é sempre a
// dele —, e sim a honestidade da interface: um ADMIN não pode ver a opção
// "OWNER" no select se o servidor vai responder 403 para ela, e a própria
// pessoa nunca aparece com um seletor de papel que ela não pode usar.
export const PAPEIS = ["OWNER", "ADMIN", "MANAGER", "STAFF"] as const;
export type Papel = (typeof PAPEIS)[number];

const PAPEIS_DE_LIDERANCA: readonly string[] = ["OWNER", "ADMIN"];
const PAPEIS_DO_ADMIN: readonly Papel[] = ["MANAGER", "STAFF"];

// Papéis que `ator` pode entregar a um membro novo.
export function papeisQuePossoDar(ator?: string): Papel[] {
  if (ator === "OWNER") return [...PAPEIS];
  if (ator === "ADMIN") return [...PAPEIS_DO_ADMIN];
  return [];
}

// Posso mexer no papel desta pessoa? A regra do próprio papel vale para
// qualquer um, inclusive o OWNER: ninguém se auto-rebaixa nem se auto-promove.
export function podeMexerNoPapelDe(args: {
  ator?: string;
  alvo?: string;
  ehProprio: boolean;
}): boolean {
  if (!args.ator || !PAPEIS_DE_LIDERANCA.includes(args.ator)) return false;
  if (args.ehProprio) return false;
  if (args.ator === "ADMIN") return PAPEIS_DO_ADMIN.includes(args.alvo as Papel);
  return true;
}

// O motivo que a tela mostra quando o papel aparece trancado — sempre o mesmo
// texto que o servidor usaria se a tentativa fosse feita na mão.
export function motivoDoCadeado(args: {
  ator?: string;
  alvo?: string;
  ehProprio: boolean;
}): string {
  if (args.ehProprio) return "Você não pode alterar o seu próprio papel.";
  if (!args.ator || !PAPEIS_DE_LIDERANCA.includes(args.ator)) {
    return "Quem cuida da equipe é o administrador ou o proprietário.";
  }
  if (args.ator === "ADMIN") return "O administrador cuida só de gerentes e atendentes.";
  return "Só o proprietário mexe no papel de proprietário.";
}
