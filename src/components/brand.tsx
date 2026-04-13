import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { colors, radius, shadow, spacing } from "../theme";
import type { Role } from "../types";

export const heroImageUri =
  "https://images.pexels.com/photos/1181395/pexels-photo-1181395.jpeg?auto=compress&cs=tinysrgb&w=1600";
const brandLogoSource = require("../../assets/brand-logo.png");

export function HamsafarLogo({
  size = 68,
}: {
  size?: number;
}) {
  return (
    <Image
      source={brandLogoSource}
      contentFit="contain"
      transition={200}
      style={{ width: size * 1.5, height: size }}
    />
  );
}

export function BrandHeader({
  title = "Hamsafar",
  subtitle = "",
  onPressLogo,
  logoSize,
  style,
}: {
  title?: string;
  subtitle?: string;
  onPressLogo?: () => void;
  logoSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const showTitle = title.trim().toLowerCase() !== "hamsafar";
  const showSubtitle = subtitle.trim().length > 0;
  const resolvedLogoSize = logoSize ?? (showTitle ? 88 : 116);
  const logo = <HamsafarLogo size={resolvedLogoSize} />;

  return (
    <View style={[styles.brandRow, style]}>
      {onPressLogo ? (
        <Pressable
          onPress={onPressLogo}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go to homepage"
          style={styles.logoPressable}
        >
          {logo}
        </Pressable>
      ) : (
        logo
      )}
      {showTitle || showSubtitle ? (
        <View style={styles.brandTextBlock}>
          {showTitle ? <Text style={styles.brandTitle}>{title}</Text> : null}
          {showSubtitle ? <Text style={styles.brandSubtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

export function HeroImageCard() {
  return (
    <View style={styles.heroWrap}>
      <Image
        source={heroImageUri}
        contentFit="cover"
        transition={250}
        style={styles.heroImage}
      />
    </View>
  );
}

export function PortalCard({
  role,
  title,
  body,
  bullets,
  icon,
  onPress,
}: {
  role: Role;
  title: string;
  body: string;
  bullets: string[];
  icon: string;
  onPress: () => void;
}) {
  const gradients: Record<Role, [string, string]> = {
    student: ["#dbeafe", "#eff6ff"],
    teacher: ["#ccfbf1", "#f0fdfa"],
    parent: ["#ede9fe", "#faf5ff"],
    admin: ["#e2e8f0", "#f8fafc"],
  };

  return (
    <Pressable onPress={onPress}>
      <LinearGradient colors={gradients[role]} style={styles.portalCard}>
        <View style={styles.portalIconCircle}>
          <Text style={styles.portalIconText}>{icon}</Text>
        </View>
        <Text style={styles.portalTitle}>{title}</Text>
        <Text style={styles.portalBody}>{body}</Text>
        {bullets.map((bullet) => (
          <Text key={bullet} style={styles.portalBullet}>
            {`\u2022 ${bullet}`}
          </Text>
        ))}
      </LinearGradient>
    </Pressable>
  );
}

export function FeatureTile({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.featureTile}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    alignSelf: "flex-start",
  },
  logoPressable: {
    alignSelf: "flex-start",
  },
  brandTextBlock: {
    flex: 1,
    gap: 2,
  },
  brandTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  brandSubtitle: {
    color: colors.muted,
    fontWeight: "700",
  },
  heroWrap: {
    borderRadius: radius.lg,
    overflow: "hidden",
    ...shadow.card,
  },
  heroImage: {
    width: "100%",
    height: 220,
    borderRadius: radius.lg,
  },
  portalCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  portalIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  portalIconText: {
    fontSize: 24,
  },
  portalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  portalBody: {
    color: colors.muted,
    lineHeight: 21,
  },
  portalBullet: {
    color: colors.text,
    lineHeight: 22,
    fontWeight: "600",
  },
  featureTile: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    gap: spacing.xs,
  },
  featureIcon: {
    fontSize: 22,
  },
  featureTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 16,
  },
  featureBody: {
    color: colors.muted,
    lineHeight: 20,
  },
});
