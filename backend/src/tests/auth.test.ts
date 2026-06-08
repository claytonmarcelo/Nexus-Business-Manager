import { describe, it, expect, vi } from "vitest";
import { AppError } from "../shared/errors/app-error";

vi.mock("../shared/database/connection", () => ({
  query: vi.fn(),
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
import * as connection from "../shared/database/connection";
import bcrypt from "bcryptjs";

describe("Auth - authenticateUser", () => {
  it("deve autenticar usuario com credenciais validas", async () => {
    const mockUser = [{
      id: 1,
      company_id: 1,
      name: "Admin",
      email: "admin@test.com",
      password: "$2b$10$hashfake",
      role: "admin",
      avatar_url: null,
      theme_preference: "dark",
    }];

    (connection.query as any).mockResolvedValue(mockUser);
    (bcrypt.compare as any).mockResolvedValue(true);

    const result = await authenticateUser({
      email: "admin@test.com",
      password: "123456",
    });

    expect(result).toBeDefined();
    expect(result!.email).toBe("admin@test.com");
    expect(result!.role).toBe("admin");
  });

  it("deve lancar erro com credenciais invalidas", async () => {
    (connection.query as any).mockResolvedValue([]);

    await expect(
      authenticateUser({ email: "wrong@test.com", password: "wrong" })
    ).rejects.toThrow(AppError);
  });

  it("deve lancar erro quando senha nao confere", async () => {
    const mockUser = [{
      id: 1,
      company_id: 1,
      name: "Admin",
      email: "admin@test.com",
      password: "$2b$10$hashfake",
      role: "admin",
      avatar_url: null,
      theme_preference: "dark",
    }];

    (connection.query as any).mockResolvedValue(mockUser);
    (bcrypt.compare as any).mockResolvedValue(false);

    await expect(
      authenticateUser({ email: "admin@test.com", password: "wrong" })
    ).rejects.toThrow(AppError);
  });
});
