// Textos de interface centralizados (fonte unica de microcopy pt-BR).
// Evita que cada modulo invente variacoes ("Salvar" vs "Gravar", "Fechar" vs
// "Voltar", "Cliente salvo" vs "Cadastro realizado com sucesso").
// Regra do projeto: nenhuma caixa de dialogo usa alert/confirm/prompt nativos.

export const ACTIONS = {
  save: "Salvar",
  saving: "Salvando…",
  create: "Cadastrar",
  creating: "Cadastrando…",
  send: "Enviar",
  sending: "Enviando…",
  confirm: "Confirmar",
  cancel: "Cancelar",
  close: "Fechar",
  discard: "Descartar",
  add: "Adicionar",
  addItem: "+ Adicionar item",
  remove: "Remover",
  retry: "Tentar novamente",
  edit: "Editar",
  view: "Ver detalhes",
  back: "Voltar",
} as const;

export const MODAL_COPY = {
  requiredHint: "Os campos marcados com * são obrigatórios.",

  discardTitle: "Descartar alterações?",
  discardText: "O que você escreveu ainda não foi salvo.",
  busyTitle: "Processando",
  busyText: "Aguarde, a operação anterior ainda não terminou.",
  closeButton: "Fechar janela",
  dialogBusy: "Salvando, aguarde",
} as const;

export const STATE_COPY = {
  loading: "Carregando…",
  errorTitle: "Não foi possível concluir",
  noPermissionTitle: "Acesso negado",
  noPermissionText: "Seu perfil não tem permissão para ver esta tela. Fale com o administrador da empresa.",
} as const;

// Genero e rotulos por entidade: garante concordancia nas mensagens
// ("Compra registrada." / "Categoria excluída.").
export type EntityKey =
  | "client" | "product" | "sale" | "purchase" | "supplier"
  | "entry" | "category" | "lead" | "event" | "member" | "stock" | "company";

interface EntityCopy {
  label: string;
  gender: "o" | "a";
  newTitle: string;
  editTitle: string;
}

export const ENTITIES: Record<EntityKey, EntityCopy> = {
  client: { label: "Cliente", gender: "o", newTitle: "Novo cliente", editTitle: "Editar cliente" },
  product: { label: "Produto", gender: "o", newTitle: "Novo produto", editTitle: "Editar produto" },
  sale: { label: "Venda", gender: "a", newTitle: "Nova venda", editTitle: "Editar venda" },
  purchase: { label: "Compra", gender: "a", newTitle: "Nova compra", editTitle: "Editar compra" },
  supplier: { label: "Fornecedor", gender: "o", newTitle: "Novo fornecedor", editTitle: "Editar fornecedor" },
  entry: { label: "Lançamento", gender: "o", newTitle: "Novo lançamento", editTitle: "Editar lançamento" },
  category: { label: "Categoria", gender: "a", newTitle: "Nova categoria", editTitle: "Editar categoria" },
  lead: { label: "Lead", gender: "o", newTitle: "Novo lead", editTitle: "Editar lead" },
  event: { label: "Compromisso", gender: "o", newTitle: "Novo compromisso", editTitle: "Editar compromisso" },
  member: { label: "Membro", gender: "o", newTitle: "Novo membro", editTitle: "Editar membro" },
  stock: { label: "Estoque", gender: "o", newTitle: "Movimentar estoque", editTitle: "Movimentar estoque" },
  company: { label: "Empresa", gender: "a", newTitle: "Nova empresa", editTitle: "Editar empresa" },
};

type PastAction = "created" | "saved" | "updated" | "deleted" | "deactivated" | "registered" | "removed";

const PARTICIPLE: Record<PastAction, { o: string; a: string }> = {
  created: { o: "cadastrado", a: "cadastrada" },
  saved: { o: "salvo", a: "salva" },
  updated: { o: "atualizado", a: "atualizada" },
  deleted: { o: "excluído", a: "excluída" },
  deactivated: { o: "desativado", a: "desativada" },
  registered: { o: "registrado", a: "registrada" },
  removed: { o: "removido", a: "removida" },
};

export function notice(entity: EntityKey, action: PastAction): string {
  const e = ENTITIES[entity];
  return e.label + " " + PARTICIPLE[action][e.gender] + ".";
}

export function modalTitle(entity: EntityKey, isNew: boolean): string {
  return isNew ? ENTITIES[entity].newTitle : ENTITIES[entity].editTitle;
}
