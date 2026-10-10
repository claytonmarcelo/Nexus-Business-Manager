// Traduz os codigos internos da trilha de auditoria para a linguagem do negocio.
// O log guarda acoes como "sale.cancelled" ou "lead.contacted"; nas telas o
// usuario precisa ler "Venda cancelada", e nao o codigo do sistema.
const ACAO_PRONTA: Record<string, string> = {
  "auth.login": "Login realizado",
  "auth.login.failed": "Tentativa de login recusada",
  "auth.logout": "Sessão encerrada",
  "auth.register": "Conta criada",
  "auth.forgot_password": "Recuperação de senha solicitada",
  "auth.reset_password": "Senha redefinida",
  "auth.switch_company": "Troca de empresa ativa",
  "stock.move": "Movimentação de estoque",
  "user.add": "Usuário adicionado à empresa",
  "user.update_role": "Papel de acesso alterado",
  "user.revoke_session": "Sessão revogada",
  "company.create": "Empresa criada",
  "lead.create": "Lead criado",
  "lead.update": "Lead atualizado",
  "lead.new": "Lead reaberto",
  "lead.contacted": "Contato realizado",
  "lead.proposal": "Proposta enviada",
  "lead.won": "Ganho — virou cliente",
  "lead.lost": "Perdido",
  "sale.confirmed": "Venda confirmada",
  "sale.cancelled": "Venda cancelada",
  "purchase.received": "Compra recebida",
  "purchase.cancelled": "Compra cancelada",
  "finance.paid": "Lançamento pago",
  "finance.cancelled": "Lançamento cancelado",
  "agenda.done": "Compromisso concluído",
  "agenda.cancelled": "Compromisso cancelado",
};

// Nome de cada origem, para as acoes genericas (create/update/delete).
const ORIGEM: Record<string, string> = {
  client: "Cliente",
  product: "Produto",
  category: "Categoria",
  supplier: "Fornecedor",
  sale: "Venda",
  purchase: "Compra",
  finance: "Lançamento",
  "finance-entry": "Lançamento",
  lead: "Lead",
  agenda: "Compromisso",
  "agenda-event": "Compromisso",
  stock: "Estoque",
  user: "Usuário",
  company: "Empresa",
};

const VERBO: Record<string, string> = {
  create: "registro criado",
  update: "registro atualizado",
  delete: "registro removido",
};

// "sale.create" -> "Venda: registro criado"; "stock.move" -> "Movimentação de estoque".
export function descricaoDaAcao(acao: string, entidade?: string): string {
  const pronta = ACAO_PRONTA[acao];
  if (pronta) return pronta;
  const [dominio, verbo] = acao.split(".");
  const origem = ORIGEM[dominio] ?? ORIGEM[entidade ?? ""] ?? dominio;
  const rotuloVerbo = verbo ? VERBO[verbo] : undefined;
  if (rotuloVerbo) return origem + ": " + rotuloVerbo;
  return origem + ": " + (verbo ?? acao).replace(/_/g, " ");
}
