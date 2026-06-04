import { describe, it, expect, vi } from "vitest";
import { AppError } from "../shared/errors/app-error";

vi.mock("../shared/database/connection", () => ({
  query: vi.fn(),
  execute: vi.fn(),
}));

import { query, execute } from "../shared/database/connection";

function updateProductStock(
  productId: number,
  type: string,
  quantity: number,
  currentQty: number
): number {
  const newQty = type === "in" ? currentQty + quantity : currentQty - quantity;
  if (newQty < 0) throw new AppError("Estoque insuficiente para esta saida", 400);
  return newQty;
}

describe("Stock - Atualizacao de estoque", () => {
  it("entrada deve aumentar quantidade", () => {
    const result = updateProductStock(1, "in", 10, 5);
    expect(result).toBe(15);
  });

  it("saida deve diminuir quantidade", () => {
    const result = updateProductStock(1, "out", 3, 10);
    expect(result).toBe(7);
  });

  it("saida com estoque insuficiente deve lancar erro", () => {
    expect(() => updateProductStock(1, "out", 10, 3)).toThrow(AppError);
  });

  it("saida com estoque zerado deve lancar erro", () => {
    expect(() => updateProductStock(1, "out", 1, 0)).toThrow(AppError);
  });
});
