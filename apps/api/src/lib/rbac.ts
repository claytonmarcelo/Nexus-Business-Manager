import type { Role } from "@prisma/client";
import { forbidden } from "./errors";

// Definição centralizada de papéis e permissões (seção 34).
// Recurso:ação. "*" permite tudo naquele recurso.
export type Permission = string;

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  OWNER: ["*"],
  ADMIN: [
    "user:read", "user:write",
    "company:read", "company:write",
    "audit:read",
    "settings:read", "settings:write",
    "client:*",
    "product:*",
    "sale:*",
    "service_order:*",
    "supplier:*",
    "purchase:*",
    "finance:*",
    "crm:*",
    "agenda:*",
  ],
  MANAGER: ["user:read", "company:read", "audit:read", "client:read", "client:write", "product:read", "product:write", "sale:read", "sale:write", "service_order:read", "service_order:write", "supplier:read", "supplier:write", "purchase:read", "purchase:write", "finance:read", "finance:write", "crm:read", "crm:write", "agenda:read", "agenda:write"],
  STAFF: ["company:read", "client:read", "product:read", "sale:read", "service_order:read", "supplier:read", "purchase:read", "finance:read", "crm:read", "agenda:read"],
};

export function rolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function can(role: Role, permission: Permission): boolean {
  const perms = rolePermissions(role);
  if (perms.includes("*")) return true;
  if (perms.includes(permission)) return true;
  const [resource] = permission.split(":");
  return perms.includes(`${resource}:*`);
}

export function assertPermission(role: Role, permission: Permission): void {
  if (!can(role, permission)) {
    throw forbidden(`Permissão insuficiente: ${permission}`);
  }
}

// ---- Hierarquia de papéis (A1 do prompt de mercado) ----
//
// Toda escrita de papel — convidar um membro (POST /users) ou trocar o papel de
// quem já é membro (PATCH /users/:id/role) — passa por esta função. Ela existe
// porque a regra estava espalhada: o convite olhava só o papel NOVO e a troca
// olhava só o papel NOVO também, de modo que um ADMIN rebaixava o OWNER que já
// era OWNER e assumia a empresa. Um lugar só, seis regras, na ordem em que fazem
// sentido para quem lê a resposta:
//
//  1. quem cuida da equipe é OWNER e ADMIN; MANAGER e STAFF não gerenciam ninguém;
//  2. ninguém mexe no próprio papel (e se esse papel for o último OWNER da
//     empresa, o motivo honesto é a empresa ficar sem dono: 409);
//  3. papel de OWNER só existe e só sai das mãos de um OWNER;
//  4. ADMIN cria e altera somente MANAGER e STAFF — outro ADMIN e o OWNER estão
//     fora do alcance dele;
//  5. a empresa nunca pode ficar sem pelo menos um OWNER (409);
//  6. o administrador da plataforma (trava própria, no serviço) continua
//     intocável: nada aqui o rebaixa.
export interface JulgamentoPapel {
  // Papel de quem está pedindo a mudança.
  ator: Role;
  // Papel atual do alvo; ausente quando o alvo está sendo criado (convite).
  alvoAtual?: Role;
  // Papel que se quer entregar ao alvo.
  novoPapel: Role;
  // O alvo é a própria pessoa que pede? (só o PATCH pode dizer sim)
  alvoEhOProprioAtor?: boolean;
  // Quantos OWNERs continuariam na empresa depois da mudança. Só importa quando
  // o alvo é OWNER e está saindo do papel; quem cria membro não precisa passar.
  donosRestantes?: number;
}

export type DecisaoPapel = { ok: true } | { ok: false; status: 403 | 409; mensagem: string };

const PAPEIS_DE_LIDERANCA: Role[] = ["OWNER", "ADMIN"];
const PAPEIS_DO_ADMIN: Role[] = ["MANAGER", "STAFF"];

export function podeAtribuirPapel(args: JulgamentoPapel): DecisaoPapel {
  const { ator, alvoAtual, novoPapel, alvoEhOProprioAtor, donosRestantes } = args;

  if (!PAPEIS_DE_LIDERANCA.includes(ator)) {
    return {
      ok: false,
      status: 403,
      mensagem: "Quem cuida da equipe é o administrador ou o proprietário.",
    };
  }

  const alvoSaindoDeOwner = alvoAtual === "OWNER" && novoPapel !== "OWNER";
  const deixariaSemDono = alvoSaindoDeOwner && donosRestantes !== undefined && donosRestantes <= 0;

  if (alvoEhOProprioAtor) {
    if (deixariaSemDono) {
      return {
        ok: false,
        status: 409,
        mensagem: "A empresa precisa continuar com pelo menos um proprietário.",
      };
    }
    return {
      ok: false,
      status: 403,
      mensagem: "Você não pode alterar o seu próprio papel.",
    };
  }

  if (ator !== "OWNER" && (alvoAtual === "OWNER" || novoPapel === "OWNER")) {
    return {
      ok: false,
      status: 403,
      mensagem:
        alvoAtual === undefined
          ? "Só o proprietário pode criar um proprietário."
          : "Só o proprietário pode criar ou rebaixar um proprietário.",
    };
  }

  if (
    ator === "ADMIN" &&
    (!PAPEIS_DO_ADMIN.includes(novoPapel) ||
      (alvoAtual !== undefined && !PAPEIS_DO_ADMIN.includes(alvoAtual)))
  ) {
    // ADMIN criando ADMIN, ADMIN tocando em outro ADMIN — o alcance dele são os
    // dois papéis de execução, tanto no que entrega quanto em quem recebe.
    return {
      ok: false,
      status: 403,
      mensagem: "O administrador cuida só de gerentes e atendentes.",
    };
  }

  if (deixariaSemDono) {
    return {
      ok: false,
      status: 409,
      mensagem: "A empresa precisa continuar com pelo menos um proprietário.",
    };
  }

  return { ok: true };
}


// ---- Leitura da matriz para a aba Permissoes (RBAC) da tela de Usuarios ----
const PAPEIS = Object.keys(ROLE_PERMISSIONS) as Role[];

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  STAFF: "Atendente",
};

export const ROLE_DESCRICOES: Record<Role, string> = {
  OWNER: "Dono da empresa. Pode tudo, inclusive transferir a propriedade.",
  ADMIN: "Gestão completa da empresa: cadastros, operações, equipe e configurações.",
  MANAGER: "Opera o dia a dia e vê a equipe, mas não mexe em permissões nem na empresa.",
  STAFF: "Consulta os módulos; cria e edita o que está no seu escopo de atendimento.",
};

const RECURSOS: { recurso: string; rotulo: string }[] = [
  { recurso: "client", rotulo: "Clientes" },
  { recurso: "product", rotulo: "Produtos e estoque" },
  { recurso: "sale", rotulo: "Vendas" },
  { recurso: "service_order", rotulo: "Ordens de serviço" },
  { recurso: "supplier", rotulo: "Fornecedores" },
  { recurso: "purchase", rotulo: "Compras" },
  { recurso: "finance", rotulo: "Financeiro" },
  { recurso: "crm", rotulo: "CRM e leads" },
  { recurso: "agenda", rotulo: "Agenda" },
  { recurso: "user", rotulo: "Equipe e acessos" },
  { recurso: "company", rotulo: "Empresa" },
  { recurso: "audit", rotulo: "Auditoria" },
  { recurso: "settings", rotulo: "Configurações" },
  // O site público é da plataforma, não da empresa: content:read/write ficam
  // com quem responde pela vitrine inteira (OWNER, que segura "*").
  { recurso: "content", rotulo: "Site público (CMS)" },
];

export function matrizPermissoes() {
  const papeis = PAPEIS.map((role) => ({
    role,
    rotulo: ROLE_LABELS[role],
    descricao: ROLE_DESCRICOES[role],
    total: ROLE_PERMISSIONS[role].length,
  }));
  const celulas: { recurso: string; acao: string; roles: Role[] }[] = [];
  for (const { recurso } of RECURSOS) {
    for (const acao of ["read", "write"]) {
      celulas.push({ recurso, acao, roles: PAPEIS.filter((r) => can(r, recurso + ":" + acao)) });
    }
  }
  return { papeis, celulas, recursos: RECURSOS };
}
