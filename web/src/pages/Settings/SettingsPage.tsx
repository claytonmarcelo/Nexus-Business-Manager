import React from "react";
import { colors } from "../../theme";

export function SettingsPage() {
  return (
    <div style={{ padding: 32, background: colors.background, minHeight: "100vh", color: colors.ivorySmoke }}>
      <h1>Configurações</h1>
      <p style={{ color: colors.champagneGold }}>Preferências do sistema</p>
    </div>
  );
}
