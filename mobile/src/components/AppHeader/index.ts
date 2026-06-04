import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing } from "../../theme";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
};

export function AppHeader({ title, subtitle }: AppHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.ivorySmoke,
  },
  subtitle: {
    fontSize: 14,
    color: colors.champagneGold,
    marginTop: spacing.xs,
  },
});
