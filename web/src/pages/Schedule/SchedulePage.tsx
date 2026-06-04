import React from "react";
import { colors } from "../../theme";

export function SchedulePage() {
  return (
    <div style={{ padding: 32, background: colors.background, minHeight: "100vh", color: colors.ivorySmoke }}>
      <h1>Agendamentos</h1>
      <p style={{ color: colors.champagneGold }}>Calendário e eventos</p>
    </div>
  );
}
