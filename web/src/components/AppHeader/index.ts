import React from "react";
import { colors, spacing } from "../../theme";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
};

export function AppHeader({ title, subtitle }: AppHeaderProps) {
  const containerStyle: React.CSSProperties = {
    padding: `${spacing.md}px`,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 22,
    fontWeight: 700,
    color: colors.ivorySmoke,
    margin: 0,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: 14,
    color: colors.champagneGold,
    marginTop: spacing.xs,
  };

  return (
    <header style={containerStyle}>
      <h1 style={titleStyle}>{title}</h1>
      {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
    </header>
  );
}
