import { StyleSheet } from "react-native";
import { colors, spacing, radius } from "../../theme";

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.graphiteWine,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  icon_success: {
    backgroundColor: colors.success,
  },
  icon_error: {
    backgroundColor: colors.danger,
  },
  icon_warning: {
    backgroundColor: colors.warning,
  },
  icon_info: {
    backgroundColor: colors.info,
  },
  iconText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFF",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ivorySmoke,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: colors.ivorySmoke,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.lg,
    opacity: 0.85,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    width: "100%",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: colors.nexusTeal,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: "center",
  },
  confirmText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 15,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.nexusTeal,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: "center",
  },
  cancelText: {
    color: colors.nexusTeal,
    fontWeight: "600",
    fontSize: 15,
  },
});
