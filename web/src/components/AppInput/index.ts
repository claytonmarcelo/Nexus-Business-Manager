import React from "react";
import { colors, spacing, radius } from "../../theme";

type AppInputProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
};

export function AppInput({ label, value, onChange, placeholder, type = "text", error }: AppInputProps) {
  const containerStyle: React.CSSProperties = {
    marginBottom: spacing.md,
    display: "flex",
    flexDirection: "column",
  };

  const labelStyle: React.CSSProperties = {
    color: colors.ivorySmoke,
    fontSize: 14,
    fontWeight: 500,
    marginBottom: spacing.xs,
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: colors.surface,
    border: `1px solid ${error ? colors.danger : colors.border}`,
    borderRadius: radius.md,
    padding: "12px 16px",
    color: colors.ivorySmoke,
    fontSize: 15,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  const errorStyle: React.CSSProperties = {
    color: colors.danger,
    fontSize: 12,
    marginTop: spacing.xs,
  };

  return (
    <div style={containerStyle}>
      {label && <label style={labelStyle}>{label}</label>}
      <input
        style={inputStyle}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
      />
      {error && <span style={errorStyle}>{error}</span>}
    </div>
  );
}
