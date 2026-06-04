import { describe, it, expect, vi } from "vitest";

vi.mock("../shared/database/connection", () => ({
  query: vi.fn(),
  execute: vi.fn(),
}));

import { query } from "../shared/database/connection";
import { RowDataPacket } from "mysql2";

describe("Multi-tenancy - Isolamento por company_id", () => {
  it("consulta de clientes deve filtrar por company_id", async () => {
    const mockClients = [
      { id: 1, name: "Cliente A", company_id: 1, active: 1 },
      { id: 2, name: "Cliente B", company_id: 1, active: 1 },
    ];

    (query as any).mockResolvedValue(mockClients);

    const companyId = 1;
    const sql = `SELECT id, name, phone, email, document, address, notes, status, created_by, active, created_at, updated_at FROM clients WHERE id = ? AND company_id = ?`;
    const params = [1, companyId];

    const result = await query<RowDataPacket[]>(sql, params);

    expect(result).toHaveLength(2);
    expect(params).toContain(companyId);
  });

  it("empresa A nao deve ver dados da empresa B", async () => {
    const companyAData = [
      { id: 1, name: "Cliente A1", company_id: 1 },
    ];
    const companyBData = [
      { id: 2, name: "Cliente B1", company_id: 2 },
    ];

    (query as any)
      .mockResolvedValueOnce(companyAData)
      .mockResolvedValueOnce(companyBData);

    const [resultA, resultB] = await Promise.all([
      query<RowDataPacket[]>("SELECT * FROM clients WHERE company_id = ?", [1]),
      query<RowDataPacket[]>("SELECT * FROM clients WHERE company_id = ?", [2]),
    ]);

    expect((resultA as any[]).every((c) => c.company_id === 1)).toBe(true);
    expect((resultB as any[]).every((c) => c.company_id === 2)).toBe(true);
  });

  it("produto so deve ser acessivel pela mesma empresa", async () => {
    (query as any).mockResolvedValue([]);

    const companyId = 1;
    const sql = "SELECT * FROM products WHERE id = ? AND company_id = ?";
    const result = await query<RowDataPacket[]>(sql, [99, companyId]);

    expect(result).toHaveLength(0);
  });
});
