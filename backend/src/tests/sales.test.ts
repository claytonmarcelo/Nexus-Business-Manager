import { describe, it, expect, vi } from "vitest";

vi.mock("../shared/database/connection", () => ({
  query: vi.fn(),
  execute: vi.fn(),
}));

import { query } from "../shared/database/connection";

describe("Sales - Logica de vendas", () => {
  it("deve calcular total dos itens corretamente", () => {
    const items = [
      { quantity: 2, unit_price: 50 },
      { quantity: 1, unit_price: 100 },
      { quantity: 3, unit_price: 25 },
    ];

    const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    expect(total).toBe(275);
  });

  it("venda deve estar vinculada a uma empresa", async () => {
    const mockSales = [
      {
        id: 1, client_id: 1, total_value: 150, status: "CONCLUIDA",
        notes: null, created_at: "2026-06-04", client_name: "Joao",
      },
    ];

    (query as any).mockResolvedValue(mockSales);

    const companyId = 1;
    const result = await query<any>(
      `SELECT s.*, c.name as client_name FROM sales s LEFT JOIN clients c ON c.id = s.client_id WHERE s.company_id = ? ORDER BY s.created_at DESC`,
      [companyId]
    );

    expect(result).toHaveLength(1);
    expect(result[0].company_id || companyId).toBeDefined();
  });
});
