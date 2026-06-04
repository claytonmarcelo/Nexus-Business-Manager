import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { colors, radius } from "../../theme";

type AppButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "outline";
  disabled?: boolean;
};

export function AppButton({ title, onPress, variant = "primary", disabled }: AppButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.base, variant === "outline" ? styles.outline : styles.primary, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.text, variant === "outline" ? styles.outlineText : styles.primaryText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: colors.roseGold,
  },
  outline: {
    borderWidth: 1,
    borderColor: colors.roseGold,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 15,
    fontWeight: "700",
  },
  primaryText: {
    color: "#FFF",
  },
  outlineText: {
    color: colors.roseGold,
  },
});
