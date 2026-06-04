import { describe, it, expect } from "vitest";
import { AppError } from "../shared/errors/app-error";

const roleHierarchy: Record<string, number> = {
  admin: 4,
  manager: 3,
  operator: 2,
  viewer: 1,
};

function checkAccess(userRole: string, requiredRoles: string[]): boolean {
  const userLevel = roleHierarchy[userRole];
  if (!userLevel) return false;

  const requiredLevel = Math.max(...requiredRoles.map((r) => roleHierarchy[r] || 0));
  return userLevel >= requiredLevel;
}

describe("Permissions - Hierarquia de cargos", () => {
  it("admin deve acessar tudo", () => {
    expect(checkAccess("admin", ["viewer"])).toBe(true);
    expect(checkAccess("admin", ["admin"])).toBe(true);
    expect(checkAccess("admin", ["manager"])).toBe(true);
  });

  it("manager deve acessar recursos de operator e viewer", () => {
    expect(checkAccess("manager", ["viewer"])).toBe(true);
    expect(checkAccess("manager", ["operator"])).toBe(true);
    expect(checkAccess("manager", ["manager"])).toBe(true);
    expect(checkAccess("manager", ["admin"])).toBe(false);
  });

  it("operator deve acessar recursos de viewer mas nao de manager", () => {
    expect(checkAccess("operator", ["viewer"])).toBe(true);
    expect(checkAccess("operator", ["operator"])).toBe(true);
    expect(checkAccess("operator", ["manager"])).toBe(false);
    expect(checkAccess("operator", ["admin"])).toBe(false);
  });

  it("viewer deve acessar apenas recursos de viewer", () => {
    expect(checkAccess("viewer", ["viewer"])).toBe(true);
    expect(checkAccess("viewer", ["operator"])).toBe(false);
    expect(checkAccess("viewer", ["manager"])).toBe(false);
    expect(checkAccess("viewer", ["admin"])).toBe(false);
  });

  it("cargo invalido deve ser negado", () => {
    expect(checkAccess("unknown", ["viewer"])).toBe(false);
  });
});
