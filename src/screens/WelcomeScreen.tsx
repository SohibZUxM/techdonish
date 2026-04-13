import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  BrandHeader,
  FeatureTile,
  HeroImageCard,
  PortalCard,
} from "../components/brand";
import { WebInstallButton } from "../components/WebInstallButton";
import {
  PrimaryButton,
  Screen,
  SectionTitle,
  SurfaceCard,
} from "../components/ui";
import { colors, rolePalette, spacing } from "../theme";
import type { RootStackParamList, Role } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

const portalContent: Array<{
  role: Role;
  title: string;
  body: string;
  icon: string;
  bullets: string[];
}> = [
  {
    role: "student",
    title: "Students",
    body:
      "Access grades, assignments, resources, and announcements in a mobile-first view.",
    icon: "🎓",
    bullets: [
      "View grades and progress",
      "Access learning resources",
      "Track assignments and classes",
    ],
  },
  {
    role: "parent",
    title: "Parents",
    body:
      "Monitor your child’s progress, grades, attendance, and school updates.",
    icon: "👨‍👩‍👧",
    bullets: [
      "Monitor student progress",
      "View grades and reports",
      "Stay updated on school activity",
    ],
  },
  {
    role: "teacher",
    title: "Teachers",
    body:
      "Manage classes, publish resources, grade work, and keep schedules organized.",
    icon: "👩‍🏫",
    bullets: [
      "Upload grades and resources",
      "Create exams and sessions",
      "Track students and attendance",
    ],
  },
];

export function WelcomeScreen({ navigation }: Props) {
  const scrollRef = useRef<ScrollView | null>(null);
  const [portalSectionY, setPortalSectionY] = useState(0);

  const handleExplorePortals = () => {
    scrollRef.current?.scrollTo({
      y: Math.max(portalSectionY - spacing.md, 0),
      animated: true,
    });
  };

  return (
    <Screen scrollRef={scrollRef}>
      <SurfaceCard style={styles.topCard}>
        <BrandHeader logoSize={180} style={styles.homeBrandHeader} />
        <Text style={styles.heroTitle}>
          Empowering <Text style={styles.accent}>Education</Text> for Tomorrow
        </Text>
        <Text style={styles.heroBody}>
          TechDonish brings students, teachers, parents, and administrators into
          one connected mobile experience with realtime academic data and
          role-based tools.
        </Text>
        <View style={styles.actionRow}>
          <PrimaryButton label="Explore Portals" onPress={handleExplorePortals} />
        </View>
        <WebInstallButton />
      </SurfaceCard>

      <HeroImageCard />

      <SurfaceCard onLayout={(event) => setPortalSectionY(event.nativeEvent.layout.y)}>
        <SectionTitle
          title="Access Your Portal"
          subtitle="Choose your role and enter a native-style mobile workspace."
        />
        <View style={styles.portalStack}>
          {portalContent.map((item) => (
            <PortalCard
              key={item.role}
              role={item.role}
              title={item.title}
              body={item.body}
              bullets={item.bullets}
              icon={item.icon}
              onPress={() =>
                navigation.navigate("RoleAuth", { role: item.role })
              }
            />
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <SectionTitle
          title="Why Choose TechDonish?"
          subtitle="Desktop product details carried into a touch-first design."
        />
        <View style={styles.featureGrid}>
          <FeatureTile
            icon="☁️"
            title="Cloud-Based"
            body="Access school data anywhere with secure Firebase-backed sync."
          />
          <FeatureTile
            icon="📱"
            title="Mobile Ready"
            body="Designed for bottom tabs, safe areas, touch targets, and quick access."
          />
          <FeatureTile
            icon="🛡️"
            title="Secure"
            body="Role-gated access keeps student, teacher, parent, and admin data separated."
          />
          <FeatureTile
            icon="🎧"
            title="Always Connected"
            body="Realtime listeners keep grades, attendance, and updates in sync."
          />
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.ctaCard}>
        <Text style={styles.ctaTitle}>Ready to transform education?</Text>
        <Text style={styles.ctaBody}>
          Join thousands of students, teachers, and parents who rely on
          TechDonish to stay connected to their educational journey.
        </Text>
        <PrimaryButton
          label="Get Started"
          onPress={() => navigation.navigate("RoleAuth", { role: "student" })}
        />
      </SurfaceCard>

      <SurfaceCard style={styles.footerCard}>
        <Text style={styles.footerTitle}>TechDonish</Text>
        <Text style={styles.footerBody}>
          Learning Excellence with realtime access to classes, grades,
          resources, approvals, and family updates.
        </Text>
      </SurfaceCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topCard: {
    gap: spacing.md,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  homeBrandHeader: {
    alignSelf: "center",
  },
  heroTitle: {
    color: colors.text,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900",
    textAlign: "center",
  },
  accent: {
    color: colors.primary,
  },
  heroBody: {
    color: colors.muted,
    lineHeight: 22,
    fontSize: 15,
    textAlign: "center",
  },
  actionRow: {
    gap: spacing.sm,
    width: "100%",
  },
  portalStack: {
    gap: spacing.md,
  },
  featureGrid: {
    gap: spacing.sm,
  },
  ctaCard: {
    backgroundColor: rolePalette.student[0],
  },
  ctaTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
  },
  ctaBody: {
    color: "rgba(255,255,255,0.92)",
    lineHeight: 22,
  },
  footerCard: {
    backgroundColor: "#0f172a",
  },
  footerTitle: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 18,
  },
  footerBody: {
    color: "rgba(255,255,255,0.76)",
    lineHeight: 21,
  },
});
