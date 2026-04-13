import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { BrandHeader } from "../components/brand";
import {
  FieldLabel,
  FormInput,
  PrimaryButton,
  Screen,
  SurfaceCard,
  PillSelector,
} from "../components/ui";
import { useAuth } from "../auth/AuthContext";
import { colors, rolePalette, spacing } from "../theme";
import { roleTitles, type RootStackParamList } from "../types";
import { useState } from "react";

type Props = NativeStackScreenProps<RootStackParamList, "RoleAuth">;

export function RoleAuthScreen({ navigation, route }: Props) {
  const { role } = route.params;
  const { authenticateForRole } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isLogin = mode === "login";
  const useScrollableLayout = Platform.OS !== "web";
  const portalTintStyle = {
    backgroundColor: `${rolePalette[role][0]}14` as const,
    gap: spacing.sm,
  };
  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate("Welcome");
  };

  const handleSubmit = async () => {
    setBusy(true);
    setError("");

    try {
      await authenticateForRole({
        role,
        mode,
        fullName,
        email,
        password,
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen keyboard scroll={useScrollableLayout}>
      <Pressable
        onPress={handleGoBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={styles.backButton}
      >
        <Text style={styles.backButtonText}>Back</Text>
      </Pressable>

      <SurfaceCard style={styles.brandCard}>
        <BrandHeader
          title={roleTitles[role]}
          subtitle="Secure role-based access"
          onPressLogo={() => navigation.navigate("Welcome")}
        />
        <Text style={styles.title}>
          {isLogin ? "Welcome back" : "Create your account"}
        </Text>
        <Text style={styles.subtitle}>
          {isLogin
            ? "Sign in to continue into your mobile workspace."
            : "Fill in your details and request access for this portal."}
        </Text>
      </SurfaceCard>

      <SurfaceCard style={portalTintStyle}>
        <PillSelector
          value={mode}
          onChange={(value) => {
            setMode(value);
            setError("");
          }}
          scrollable={false}
          options={[
            { label: "Sign in", value: "login" },
            { label: "Create account", value: "signup" },
          ]}
        />

        {!isLogin ? (
          <>
            <FieldLabel>Full name</FieldLabel>
            <FormInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
            />
          </>
        ) : null}

        <FieldLabel>Email address</FieldLabel>
        <FormInput
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
        />

        <FieldLabel>Password</FieldLabel>
        <FormInput
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder={isLogin ? "Enter your password" : "Create a password"}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <PrimaryButton
          label={busy ? "Please wait..." : isLogin ? "Continue" : "Create account"}
          onPress={handleSubmit}
          disabled={busy}
        />
      </SurfaceCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  backButtonText: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 15,
  },
  brandCard: {
    gap: spacing.sm,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.text,
  },
  subtitle: {
    color: colors.muted,
    lineHeight: 22,
  },
  errorText: {
    color: colors.danger,
    fontWeight: "600",
  },
});
