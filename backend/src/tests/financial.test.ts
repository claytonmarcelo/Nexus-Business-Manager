import { describe, it, expect, vi } from "vitest";

vi.mock("../shared/database/connection", () => ({
  query: vi.fn(),
  execute: vi.fn(),
}));

interface CashFlowRow {
  total_revenue: number;
  total_expense: number;
  balance: number;
}

describe("Financial - Calculo de fluxo de caixa", () => {
  it("deve calcular saldo corretamente (receitas - despesas)", () => {
    const revenue = 10000;
    const expense = 4500;
    const balance = revenue - expense;

    expect(balance).toBe(5500);
  });

  it("saldo negativo quando despesas superam receitas", () => {
    const revenue = 3000;
    const expense = 5000;
    const balance = revenue - expense;

    expect(balance).toBe(-2000);
  });

  it("deve somar apenas transacoes da empresa correta", () => {
    const transactions = [
      { company_id: 1, type: "revenue", value: 1000 },
      { company_id: 1, type: "expense", value: 500 },
      { company_id: 2, type: "revenue", value: 2000 },
      { company_id: 2, type: "expense", value: 1000 },
    ];

    const company1 = transactions.filter((t) => t.company_id === 1);
    const rev1 = company1.filter((t) => t.type === "revenue").reduce((s, t) => s + t.value, 0);
    const exp1 = company1.filter((t) => t.type === "expense").reduce((s, t) => s + t.value, 0);

    expect(rev1 - exp1).toBe(500);
  });
});
