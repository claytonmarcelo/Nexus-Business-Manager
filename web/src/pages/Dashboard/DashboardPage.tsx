import React from "react";
import { colors } from "../../theme";

export function DashboardPage() {
  return (
    <div style={{ padding: 32, background: colors.background, minHeight: "100vh", color: colors.ivorySmoke }}>
      <h1>Dashboard</h1>
      <p style={{ color: colors.champagneGold }}>Indicadores e gráficos</p>
    </div>
  );
}
