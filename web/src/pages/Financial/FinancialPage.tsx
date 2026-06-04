import React from "react";
import { colors } from "../../theme";

export function FinancialPage() {
  return (
    <div style={{ padding: 32, background: colors.background, minHeight: "100vh", color: colors.ivorySmoke }}>
      <h1>Financeiro</h1>
      <p style={{ color: colors.champagneGold }}>Fluxo de caixa</p>
    </div>
  );
}
