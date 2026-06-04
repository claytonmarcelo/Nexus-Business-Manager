import React from "react";
import { colors, spacing, radius } from "../../theme";

type AppCardProps = {
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export function AppCard({ children, style }: AppCardProps) {
  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
    ...style,
  };

  return <div style={cardStyle}>{children}</div>;
}
