import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/ui";
import { colors, spacing } from "../theme";

export function BootScreen() {
  return (
    <Screen scroll={false}>
      <View style={styles.centerBlock}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.centerTitle}>Loading Hamsafar</Text>
        <Text style={styles.centerBody}>
          Preparing your mobile workspace and realtime data.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  centerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
  },
  centerBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    textAlign: "center",
  },
});
