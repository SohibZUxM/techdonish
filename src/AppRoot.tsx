import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { firebaseConfigError } from "./lib/firebase";
import { AdminTabs, ParentTabs, StudentTabs, TeacherTabs } from "./navigation/roleTabs";
import { BootScreen } from "./screens/BootScreen";
import { FirebaseConfigScreen } from "./screens/FirebaseConfigScreen";
import { PendingApprovalScreen } from "./screens/PendingApprovalScreen";
import { RoleAuthScreen } from "./screens/RoleAuthScreen";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { colors } from "./theme";
import type { RootStackParamList } from "./types";

const RootStack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

function RootNavigator() {
  const { initializing, user, profile } = useAuth();

  if (initializing) {
    return <BootScreen />;
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <RootStack.Screen name="Welcome" component={WelcomeScreen} />
          <RootStack.Screen name="RoleAuth" component={RoleAuthScreen} />
        </>
      ) : profile?.status !== "active" ? (
        <RootStack.Screen name="Pending" component={PendingApprovalScreen} />
      ) : profile.role === "student" ? (
        <RootStack.Screen name="StudentApp" component={StudentTabs} />
      ) : profile.role === "teacher" ? (
        <RootStack.Screen name="TeacherApp" component={TeacherTabs} />
      ) : profile.role === "parent" ? (
        <RootStack.Screen name="ParentApp" component={ParentTabs} />
      ) : (
        <RootStack.Screen name="AdminApp" component={AdminTabs} />
      )}
    </RootStack.Navigator>
  );
}

export default function AppRoot() {
  if (firebaseConfigError) {
    return <FirebaseConfigScreen message={firebaseConfigError} />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </NavigationContainer>
  );
}
