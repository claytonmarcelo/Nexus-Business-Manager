import { describe, it, expect, vi } from "vitest";
import { AppError } from "../shared/errors/app-error";

vi.mock("../shared/database/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
  compare: vi.fn(),
  hash: vi.fn(),
}));

import { authenticateUser } from "../modules/auth/auth.service";
import { prisma } from "../shared/database/prisma";
import bcrypt from "bcryptjs";

describe("Auth - authenticateUser", () => {
  it("deve autenticar usuario com credenciais validas", async () => {
    const mockUser = {
      id: 1,
      companyId: 1,
      name: "Admin",
      email: "admin@test.com",
      passwordHash: "$2b$10$hashfake",
      role: "admin",
    };

    (prisma.user.findFirst as any).mockResolvedValue(mockUser);
    (bcrypt.compare as any).mockResolvedValue(true);

    const result = await authenticateUser({
      email: "admin@test.com",
      password: "12345678",
    });

    expect(result).toBeDefined();
    expect(result.id).toBe(1);
    expect(result.email).toBe("admin@test.com");
  });

  it("deve rejeitar credenciais invalidas", async () => {
    (prisma.user.findFirst as any).mockResolvedValue(null);

    await expect(
      authenticateUser({ email: "wrong@test.com", password: "12345678" })
    ).rejects.toThrow(AppError);
  });

  it("deve rejeitar senha incorreta", async () => {
    const mockUser = {
      id: 1,
      companyId: 1,
      name: "Admin",
      email: "admin@test.com",
      passwordHash: "$2b$10$hashfake",
      role: "admin",
    };

    (prisma.user.findFirst as any).mockResolvedValue(mockUser);
    (bcrypt.compare as any).mockResolvedValue(false);

    await expect(
      authenticateUser({ email: "admin@test.com", password: "wrongpass" })
    ).rejects.toThrow(AppError);
  });
});
