import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "./ui";
import { colors, spacing } from "../theme";

type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function getStandaloneState() {
  if (typeof window === "undefined") return false;

  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

function getMobilePlatform() {
  if (typeof navigator === "undefined") return "other" as const;

  const userAgent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(userAgent)) return "ios" as const;
  if (/android/.test(userAgent)) return "android" as const;
  if (/mobile/.test(userAgent)) return "mobile" as const;
  return "other" as const;
}

export function WebInstallButton() {
  const [installPrompt, setInstallPrompt] =
    useState<DeferredInstallPrompt | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const syncInstalled = () => setIsInstalled(getStandaloneState());
    const mediaQuery = window.matchMedia("(display-mode: standalone)");

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as DeferredInstallPrompt);
      syncInstalled();
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      setShowHelp(false);
      syncInstalled();
    };

    syncInstalled();
    mediaQuery.addEventListener("change", syncInstalled);
    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener
    );
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      mediaQuery.removeEventListener("change", syncInstalled);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener
      );
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const mobilePlatform = useMemo(getMobilePlatform, []);
  const canShow = Platform.OS === "web" && !isInstalled && mobilePlatform !== "other";

  if (!canShow) {
    return null;
  }

  const helpText =
    mobilePlatform === "ios"
      ? "Open this site in Safari, tap Share, then choose Add to Home Screen."
      : "Open your browser menu and choose Install app or Add to Home screen.";

  const handleInstall = async () => {
    if (!installPrompt) {
      setShowHelp((current) => !current);
      return;
    }

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstallPrompt(null);
      }
    } catch {
      setShowHelp(true);
    }
  };

  return (
    <View style={styles.wrap}>
      <PrimaryButton
        label={installPrompt ? "Install app" : "Add to Home Screen"}
        variant="secondary"
        onPress={handleInstall}
      />
      <Pressable onPress={() => setShowHelp((current) => !current)}>
        <Text style={styles.linkText}>
          {showHelp ? "Hide install steps" : "Show install steps"}
        </Text>
      </Pressable>
      {showHelp ? <Text style={styles.helpText}>{helpText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  linkText: {
    color: colors.primary,
    fontWeight: "700",
  },
  helpText: {
    color: colors.muted,
    lineHeight: 20,
    fontSize: 13,
  },
});
