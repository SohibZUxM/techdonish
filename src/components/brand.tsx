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

const BRAND_NAME = "TechDonish";
const BRAND_NAME_LOWER = BRAND_NAME.toLowerCase();

export function TechDonishLogo({
  size = 68,
  compact = false,
}: {
  size?: number;
  /** Monogram only — use beside a separate title (e.g. role name). */
  compact?: boolean;
}) {
  const markHeight = size * 0.72;
  const markWidth = compact ? markHeight * 1.05 : size * 0.58;
  const radiusPx = size * 0.14;
  const tdSize = size * (compact ? 0.4 : 0.36);

  const mark = (
    <LinearGradient
      colors={[colors.primary, colors.purple]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.logoMark,
        {
          width: markWidth,
          height: markHeight,
          borderRadius: radiusPx,
        },
      ]}
    >
      <Text style={[styles.logoMarkText, { fontSize: tdSize }]}>TD</Text>
    </LinearGradient>
  );

  if (compact) {
    return (
      <View style={[styles.logoRow, { minHeight: markHeight }]}>{mark}</View>
    );
  }

  const wordSize = Math.max(14, size * 0.2);
  return (
    <View
      style={[
        styles.logoRow,
        {
          minHeight: markHeight,
          maxWidth: size * 1.65,
          gap: spacing.sm,
        },
      ]}
    >
      {mark}
      <View style={styles.logoWordmark}>
        <Text style={[styles.logoTech, { fontSize: wordSize }]}>Tech</Text>
        <Text style={[styles.logoDonish, { fontSize: wordSize }]}>Donish</Text>
      </View>
    </View>
  );
}

export function BrandHeader({
  title = BRAND_NAME,
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
  const showTitle = title.trim().toLowerCase() !== BRAND_NAME_LOWER;
  const showSubtitle = subtitle.trim().length > 0;
  const resolvedLogoSize = logoSize ?? (showTitle ? 88 : 116);
  const logo = (
    <TechDonishLogo size={resolvedLogoSize} compact={showTitle} />
  );

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
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoMark: {
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
    shadowOpacity: 0.12,
  },
  logoMarkText: {
    color: "#ffffff",
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  logoWordmark: {
    justifyContent: "center",
    gap: 0,
  },
  logoTech: {
    color: colors.primary,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  logoDonish: {
    color: colors.text,
    fontWeight: "900",
    letterSpacing: -0.3,
    marginTop: -2,
  },
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
