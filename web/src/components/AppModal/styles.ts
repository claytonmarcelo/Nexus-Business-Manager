import { colors, radius, spacing } from "../../theme";

export const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
  padding: spacing.lg,
};

export const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 380,
  backgroundColor: colors.graphiteWine,
  borderRadius: radius.lg,
  padding: spacing.xl,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

export const iconContainerStyle = (bg: string): React.CSSProperties => ({
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: bg,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  marginBottom: spacing.md,
});

export const iconTextStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  color: "#FFF",
};

export const titleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: colors.ivorySmoke,
  marginBottom: spacing.sm,
  textAlign: "center",
};

export const messageStyle: React.CSSProperties = {
  fontSize: 14,
  color: colors.ivorySmoke,
  textAlign: "center",
  lineHeight: 20,
  marginBottom: spacing.lg,
  opacity: 0.85,
};

export const actionsStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  gap: spacing.sm,
  width: "100%",
};

export const confirmButtonStyle: React.CSSProperties = {
  flex: 1,
  backgroundColor: colors.nexusTeal,
  borderRadius: radius.md,
  padding: "12px 16px",
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 15,
  color: "#FFF",
  textAlign: "center",
};

export const cancelButtonStyle: React.CSSProperties = {
  flex: 1,
  border: `1px solid ${colors.nexusTeal}`,
  borderRadius: radius.md,
  padding: "12px 16px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 15,
  color: colors.nexusTeal,
  backgroundColor: "transparent",
  textAlign: "center",
};
