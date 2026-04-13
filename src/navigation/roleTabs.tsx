import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { colors } from "../theme";
import {
  StudentCoursesScreen,
  StudentDashboardScreen,
  StudentProfileScreen,
  StudentResourcesScreen,
  StudentScheduleScreen,
} from "../features/student";
import {
  TeacherActionsScreen,
  TeacherClassesScreen,
  TeacherDashboardScreen,
  TeacherGradebookScreen,
  TeacherScheduleScreen,
} from "../features/teacher";
import {
  ParentAttendanceScreen,
  ParentChildrenScreen,
  ParentDashboardScreen,
  ParentProfileScreen,
  ParentUpdatesScreen,
} from "../features/parent";
import {
  AdminClassesScreen,
  AdminCoursesScreen,
  AdminDashboardScreen,
  AdminPeopleScreen,
  AdminRequestsScreen,
} from "../features/admin";
import type { Role } from "../types";

const Tab = createBottomTabNavigator();

function roleIcon(routeName: string, focused: boolean) {
  const map: Record<string, keyof typeof Ionicons.glyphMap> = {
    Dashboard: focused ? "home" : "home-outline",
    Courses: focused ? "book" : "book-outline",
    Schedule: focused ? "calendar" : "calendar-outline",
    Resources: focused ? "folder" : "folder-outline",
    Profile: focused ? "person" : "person-outline",
    Classes: focused ? "layers" : "layers-outline",
    Gradebook: focused ? "stats-chart" : "stats-chart-outline",
    Actions: focused ? "flash" : "flash-outline",
    Children: focused ? "people" : "people-outline",
    Attendance: focused ? "checkmark-circle" : "checkmark-circle-outline",
    Updates: focused ? "notifications" : "notifications-outline",
    People: focused ? "people" : "people-outline",
    Requests: focused ? "document-text" : "document-text-outline",
  };
  return (
    <Ionicons
      name={map[routeName] || "ellipse-outline"}
      size={20}
      color={focused ? colors.primary : colors.muted}
    />
  );
}

function tabScreenOptions(_role: Role) {
  return ({ route }: any) => ({
    headerShown: false,
    tabBarStyle: {
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      height: 84,
      paddingBottom: 14,
      paddingTop: 10,
      backgroundColor: colors.surface,
    },
    tabBarLabelStyle: {
      fontWeight: "700" as const,
      fontSize: 11,
    },
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.muted,
    tabBarIcon: ({ focused }: any) => roleIcon(route.name, focused),
  });
}

export function StudentTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions("student")}>
      <Tab.Screen name="Dashboard" component={StudentDashboardScreen} />
      <Tab.Screen name="Courses" component={StudentCoursesScreen} />
      <Tab.Screen name="Schedule" component={StudentScheduleScreen} />
      <Tab.Screen name="Resources" component={StudentResourcesScreen} />
      <Tab.Screen name="Profile" component={StudentProfileScreen} />
    </Tab.Navigator>
  );
}

export function TeacherTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions("teacher")}>
      <Tab.Screen name="Dashboard" component={TeacherDashboardScreen} />
      <Tab.Screen name="Classes" component={TeacherClassesScreen} />
      <Tab.Screen name="Gradebook" component={TeacherGradebookScreen} />
      <Tab.Screen name="Schedule" component={TeacherScheduleScreen} />
      <Tab.Screen name="Actions" component={TeacherActionsScreen} />
    </Tab.Navigator>
  );
}

export function ParentTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions("parent")}>
      <Tab.Screen name="Dashboard" component={ParentDashboardScreen} />
      <Tab.Screen name="Children" component={ParentChildrenScreen} />
      <Tab.Screen name="Attendance" component={ParentAttendanceScreen} />
      <Tab.Screen name="Updates" component={ParentUpdatesScreen} />
      <Tab.Screen name="Profile" component={ParentProfileScreen} />
    </Tab.Navigator>
  );
}

export function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions("admin")}>
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
      <Tab.Screen name="Courses" component={AdminCoursesScreen} />
      <Tab.Screen name="Classes" component={AdminClassesScreen} />
      <Tab.Screen name="People" component={AdminPeopleScreen} />
      <Tab.Screen name="Requests" component={AdminRequestsScreen} />
    </Tab.Navigator>
  );
}
