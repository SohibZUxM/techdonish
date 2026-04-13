import { Text } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { HeaderCard, PrimaryButton, Screen, SurfaceCard } from "../components/ui";
import { rolePalette } from "../theme";
import { getUserDisplay } from "../types";

export function PendingApprovalScreen() {
  const { profile, refreshProfile, signOutUser } = useAuth();
  const disabled = profile?.status === "disabled";

  return (
    <Screen>
      <HeaderCard
        title={disabled ? "Account Disabled" : "Approval Pending"}
        subtitle={
          disabled
            ? "An administrator has temporarily disabled this account. Contact your school admin to restore access."
            : "Your account exists, but an administrator still needs to activate the correct role."
        }
        colors={rolePalette.parent}
      />
      <SurfaceCard>
        <Text style={{ fontSize: 22, fontWeight: "800", color: "#0f172a" }}>
          Hi {getUserDisplay(profile)}
        </Text>
        <Text style={{ color: "#64748b", lineHeight: 22 }}>
          {disabled
            ? "Your account is currently marked as disabled. Once an administrator re-enables it, reopen the app or tap refresh below."
            : `Requested role: ${profile?.requestedRole || profile?.role || "pending"}. Once activated, reopen the app or tap refresh below.`}
        </Text>
        <PrimaryButton label="Refresh status" onPress={refreshProfile} />
      </SurfaceCard>
      <SurfaceCard>
        <PrimaryButton
          label="Sign out"
          variant="ghost"
          onPress={signOutUser}
        />
      </SurfaceCard>
    </Screen>
  );
}
