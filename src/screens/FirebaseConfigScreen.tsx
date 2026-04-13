import { Platform, StyleSheet, Text, View } from "react-native";
import { Screen, SurfaceCard } from "../components/ui";
import { colors, spacing } from "../theme";

export function FirebaseConfigScreen({ message }: { message: string }) {
  return (
    <Screen scroll={false}>
      <View style={styles.centerBlock}>
        <Text style={styles.centerTitle}>Firebase setup required</Text>
        <Text style={styles.centerBody}>{message}</Text>
        <SurfaceCard>
          <Text style={styles.codeText}>
            {Platform.OS === "web"
              ? "Add the same EXPO_PUBLIC_FIREBASE_* keys to your hosting provider environment variables, then rebuild and republish the site."
              : "Create a .env file in techdonish-mobile using the EXPO_PUBLIC_FIREBASE_* keys from the desktop app."}
          </Text>
        </SurfaceCard>
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
  codeText: {
    color: colors.text,
    lineHeight: 22,
  },
});
