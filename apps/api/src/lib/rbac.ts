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
  ],
  MANAGER: ["user:read", "company:read", "audit:read", "client:read", "client:write", "product:read", "product:write"],
  STAFF: ["company:read", "client:read", "product:read"],
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
