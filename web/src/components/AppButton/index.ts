import React from "react";
import { colors, radius } from "../../theme";

type AppButtonProps = {
  title: string;
  onClick: () => void;
  variant?: "primary" | "outline";
  disabled?: boolean;
};

export function AppButton({ title, onClick, variant = "primary", disabled }: AppButtonProps) {
  const base: React.CSSProperties = {
    borderRadius: radius.md,
    padding: "12px 24px",
    border: variant === "outline" ? `1px solid ${colors.nexusTeal}` : "none",
    backgroundColor: variant === "outline" ? "transparent" : colors.nexusTeal,
    color: variant === "outline" ? colors.nexusTeal : "#FFF",
    fontWeight: 700,
    fontSize: 15,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    textAlign: "center",
  };

  return (
    <button style={base} onClick={onClick} disabled={disabled}>
      {title}
    </button>
  );
}
