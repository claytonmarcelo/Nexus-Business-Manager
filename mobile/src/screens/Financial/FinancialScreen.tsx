import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme";

export function FinancialScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Financeiro</Text>
      <Text style={styles.subtitle}>Fluxo de caixa</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: { fontSize: 28, fontWeight: "700", color: colors.ivorySmoke },
  subtitle: { fontSize: 16, color: colors.champagneGold, marginTop: 8 },
});
