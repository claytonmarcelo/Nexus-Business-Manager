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
    "supplier:*",
    "purchase:*",
    "finance:*",
    "crm:*",
    "agenda:*",
  ],
  MANAGER: ["user:read", "company:read", "audit:read", "client:read", "client:write", "product:read", "product:write", "sale:read", "sale:write", "supplier:read", "supplier:write", "purchase:read", "purchase:write", "finance:read", "finance:write", "crm:read", "crm:write", "agenda:read", "agenda:write"],
  STAFF: ["company:read", "client:read", "product:read", "sale:read", "supplier:read", "purchase:read", "finance:read", "crm:read", "agenda:read"],
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
