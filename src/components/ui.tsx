import type { ComponentProps, ReactNode, RefObject } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, shadow, spacing } from "../theme";

export function Screen({
  children,
  scroll = true,
  keyboard = false,
  scrollRef,
}: {
  children: ReactNode;
  scroll?: boolean;
  keyboard?: boolean;
  scrollRef?: RefObject<ScrollView | null>;
}) {
  const content = scroll ? (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.scrollContent}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={keyboard ? (Platform.OS === "ios" ? "padding" : undefined) : undefined}
        style={styles.keyboardWrap}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function HeaderCard({
  title,
  subtitle,
  colors: gradientColors,
}: {
  title: string;
  subtitle: string;
  colors: readonly [string, string];
}) {
  return (
    <LinearGradient colors={gradientColors as [string, string]} style={styles.headerCard}>
      <Text style={styles.headerEyebrow}>TechDonish</Text>
      <Text style={styles.headerTitle}>{title}</Text>
      <Text style={styles.headerSubtitle}>{subtitle}</Text>
    </LinearGradient>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionTitleText}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function SurfaceCard({
  children,
  style,
  ...props
}: {
  children: ReactNode;
  style?: any;
  onLayout?: ComponentProps<typeof View>["onLayout"];
}) {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
}: {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
}) {
  const variants = {
    primary: [colors.primary, "#4f46e5"] as const,
    secondary: [colors.accent, "#ea580c"] as const,
    ghost: ["#ffffff", "#ffffff"] as const,
    danger: [colors.danger, "#b91c1c"] as const,
  };

  const textStyle =
    variant === "ghost" ? { color: colors.text } : { color: "#ffffff" };

  return (
    <Pressable onPress={disabled ? undefined : onPress}>
      <LinearGradient colors={variants[variant] as [string, string]} style={[styles.button, disabled && styles.buttonDisabled]}>
        <Text style={[styles.buttonText, textStyle]}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <SurfaceCard style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {hint ? <Text style={styles.metricHint}>{hint}</Text> : null}
    </SurfaceCard>
  );
}

export function PillSelector<T extends string>({
  value,
  onChange,
  options,
  scrollable = true,
}: {
  value: T | null;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  scrollable?: boolean;
}) {
  const pills = options.map((option) => {
    const active = option.value === value;
    return (
      <Pressable
        key={option.value}
        onPress={() => onChange(option.value)}
        style={[styles.pill, active && styles.pillActive]}
      >
        <Text style={[styles.pillText, active && styles.pillTextActive]}>{option.label}</Text>
      </Pressable>
    );
  });

  if (!scrollable) {
    return <View style={[styles.pillRow, styles.pillRowStatic]}>{pills}</View>;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
      {pills}
    </ScrollView>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

export function FormInput(props: ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor="#94a3b8" {...props} style={[styles.input, props.style]} />;
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <SurfaceCard>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </SurfaceCard>
  );
}

export function InfoRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export function LoadingBlock({ label = "Loading..." }: { label?: string }) {
  return (
    <View style={styles.loadingWrap}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardWrap: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.md,
  },
  headerCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  headerEyebrow: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.92)",
    lineHeight: 22,
  },
  sectionTitle: {
    gap: 4,
  },
  sectionTitleText: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  sectionSubtitle: {
    color: colors.muted,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadow.card,
  },
  button: {
    borderRadius: radius.md,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.72,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  metricCard: {
    minWidth: 160,
    flex: 1,
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
  },
  metricHint: {
    color: colors.muted,
    lineHeight: 20,
  },
  pillRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  pillRowStatic: {
    flexWrap: "wrap",
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    color: colors.muted,
    fontWeight: "700",
  },
  pillTextActive: {
    color: "#ffffff",
  },
  fieldLabel: {
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.text,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
  },
  emptyBody: {
    color: colors.muted,
    lineHeight: 21,
  },
  loadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
    paddingVertical: 24,
  },
  loadingText: {
    color: colors.muted,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    alignItems: "center",
  },
  infoLabel: {
    color: colors.muted,
    fontWeight: "700",
    flex: 1,
  },
  infoValue: {
    color: colors.text,
    fontWeight: "700",
    flex: 1,
    textAlign: "right",
  },
});
