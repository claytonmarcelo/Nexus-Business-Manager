import React from "react";
import { colors } from "../../theme";

export function StockPage() {
  return (
    <div style={{ padding: 32, background: colors.background, minHeight: "100vh", color: colors.ivorySmoke }}>
      <h1>Estoque</h1>
      <p style={{ color: colors.champagneGold }}>Controle de produtos</p>
    </div>
  );
}
