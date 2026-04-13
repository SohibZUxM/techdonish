import { useMemo } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { signOut } from "firebase/auth";
import { collection, query, where } from "firebase/firestore";
import { useAuth } from "../auth/AuthContext";
import {
  EmptyState,
  HeaderCard,
  InfoRow,
  MetricCard,
  PrimaryButton,
  Screen,
  SectionTitle,
  SurfaceCard,
} from "../components/ui";
import { auth, db } from "../lib/firebase";
import {
  useRealtimeDocsByIds,
  useRealtimeList,
  useRealtimeWhereIn,
} from "../lib/realtime";
import {
  safePercent,
  toDateLabel,
  toMillis,
  toTimeLabel,
  uniqueStrings,
} from "../lib/utils";
import { colors, radius, rolePalette, spacing } from "../theme";
import { getUserDisplay } from "../types";

function useStudentData() {
  const { user, profile } = useAuth();
  const uid = user?.uid || "";
  const { data: enrollments } = useRealtimeList<any>(
    () => query(collection(db, "enrollments"), where("studentUid", "==", uid)),
    [uid],
    !!uid
  );
  const classIds = useMemo(
    () => uniqueStrings(enrollments.map((item) => item.classId)),
    [enrollments]
  );
  const { data: classes } = useRealtimeDocsByIds<any>(
    "classes",
    classIds,
    classIds.length > 0
  );
  const courseIds = useMemo(
    () => uniqueStrings(classes.map((item) => item.courseId)),
    [classes]
  );
  const { data: courses } = useRealtimeDocsByIds<any>(
    "courses",
    courseIds,
    courseIds.length > 0
  );
  const { data: gradesRaw } = useRealtimeList<any>(
    () => query(collection(db, "grades"), where("studentUid", "==", uid)),
    [uid],
    !!uid
  );
  const { data: attendance } = useRealtimeList<any>(
    () => query(collection(db, "attendance"), where("studentUid", "==", uid)),
    [uid],
    !!uid
  );
  const { data: sessions } = useRealtimeWhereIn<any>(
    "classSessions",
    "classId",
    classIds,
    classIds.length > 0
  );
  const { data: resources } = useRealtimeWhereIn<any>(
    "resources",
    "classId",
    classIds,
    classIds.length > 0
  );

  const classesById = useMemo(
    () => new Map(classes.map((item) => [item.id, item])),
    [classes]
  );
  const coursesById = useMemo(
    () => new Map(courses.map((item) => [item.id, item])),
    [courses]
  );

  const grades = useMemo(
    () =>
      [...gradesRaw]
        .map((item) => ({
          ...item,
          percent: safePercent(item.score, item.maxScore),
        }))
        .sort(
          (a, b) =>
            toMillis(b.date || b.createdAt) - toMillis(a.date || a.createdAt)
        ),
    [gradesRaw]
  );

  const avg = useMemo(() => {
    const percentages = grades
      .map((item) => item.percent)
      .filter((item): item is number => typeof item === "number");
    if (!percentages.length) return "—";
    return `${Math.round(
      percentages.reduce((sum, value) => sum + value, 0) / percentages.length
    )}%`;
  }, [grades]);

  return {
    profile,
    classes,
    courses,
    grades,
    attendance: [...attendance].sort(
      (a, b) => toMillis(b.date || b.updatedAt) - toMillis(a.date || a.updatedAt)
    ),
    sessions: [...sessions].sort((a, b) => toMillis(a.startsAt) - toMillis(b.startsAt)),
    resources: [...resources].sort(
      (a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)
    ),
    classesById,
    coursesById,
    avg,
  };
}

export function StudentDashboardScreen() {
  const data = useStudentData();
  return (
    <Screen>
      <HeaderCard
        title={`Welcome, ${data.profile?.fullName?.split(" ")[0] || "Student"}`}
        subtitle="Track grades, classes, attendance, and resources in one native dashboard."
        colors={rolePalette.student}
      />
      <View style={styles.metricRow}>
        <MetricCard
          label="Classes"
          value={String(data.classes.length)}
          hint="Active enrollments"
        />
        <MetricCard
          label="Average"
          value={data.avg}
          hint="Across recorded grades"
        />
      </View>
      <View style={styles.metricRow}>
        <MetricCard
          label="Sessions"
          value={String(data.sessions.length)}
          hint="Upcoming timetable entries"
        />
        <MetricCard
          label="Resources"
          value={String(data.resources.length)}
          hint="Shared files and links"
        />
      </View>
      <SectionTitle
        title="Recent grades"
        subtitle="Newest assessment results with percentages."
      />
      {data.grades.slice(0, 5).map((item) => (
        <SurfaceCard key={item.id}>
          <Text style={styles.cardTitle}>{item.label || "Grade entry"}</Text>
          <Text style={styles.cardMeta}>
            {data.classesById.get(item.classId)?.name || "Class"} •{" "}
            {item.percent ?? "—"}%
          </Text>
          <Text style={styles.cardMeta}>
            {toDateLabel(item.date || item.createdAt, true)}
          </Text>
        </SurfaceCard>
      ))}
    </Screen>
  );
}

export function StudentCoursesScreen() {
  const data = useStudentData();
  return (
    <Screen>
      <SectionTitle
        title="My courses"
        subtitle="Each course is connected to your current class enrollments."
      />
      {data.classes.length === 0 ? (
        <EmptyState
          title="No classes yet"
          body="Once you are enrolled in classes, they will appear here automatically."
        />
      ) : (
        data.classes.map((cls) => (
          <SurfaceCard key={cls.id}>
            <Text style={styles.cardTitle}>{cls.name || cls.code || "Class"}</Text>
            <Text style={styles.cardMeta}>
              {data.coursesById.get(cls.courseId)?.name || "Course not linked"}
            </Text>
            <Text style={styles.cardMeta}>
              Teacher: {cls.teacherName || "Pending assignment"}
            </Text>
          </SurfaceCard>
        ))
      )}
    </Screen>
  );
}

export function StudentScheduleScreen() {
  const data = useStudentData();
  return (
    <Screen>
      <SectionTitle
        title="Schedule"
        subtitle="Upcoming class sessions ordered by start time."
      />
      {data.sessions.length === 0 ? (
        <EmptyState
          title="No sessions scheduled"
          body="Teachers have not scheduled class sessions yet."
        />
      ) : (
        data.sessions.map((session) => (
          <SurfaceCard key={session.id}>
            <Text style={styles.cardTitle}>
              {data.classesById.get(session.classId)?.name || "Class session"}
            </Text>
            <Text style={styles.cardMeta}>
              {toDateLabel(session.startsAt, true)} •{" "}
              {toTimeLabel(session.startsAt)}
            </Text>
            {session.location ? (
              <Text style={styles.cardBody}>Location: {session.location}</Text>
            ) : null}
            {session.note ? (
              <Text style={styles.cardBody}>{session.note}</Text>
            ) : null}
          </SurfaceCard>
        ))
      )}
    </Screen>
  );
}

export function StudentResourcesScreen() {
  const data = useStudentData();
  return (
    <Screen>
      <SectionTitle
        title="Resources"
        subtitle="Open files and links shared for your classes."
      />
      {data.resources.length === 0 ? (
        <EmptyState
          title="No resources yet"
          body="Teachers can publish links or files here."
        />
      ) : (
        data.resources.map((resource) => (
          <SurfaceCard key={resource.id}>
            <Text style={styles.cardTitle}>
              {resource.title || "Untitled resource"}
            </Text>
            <Text style={styles.cardMeta}>
              {data.classesById.get(resource.classId)?.name || "Class"}
            </Text>
            {resource.description ? (
              <Text style={styles.cardBody}>{resource.description}</Text>
            ) : null}
            <PrimaryButton
              label="Open resource"
              variant="ghost"
              onPress={() => resource.url && Linking.openURL(resource.url)}
            />
          </SurfaceCard>
        ))
      )}
    </Screen>
  );
}

export function StudentProfileScreen() {
  const { profile } = useAuth();
  const data = useStudentData();

  return (
    <Screen>
      <SectionTitle
        title="Profile"
        subtitle="Your role, status, and latest attendance from the shared backend."
      />
      <SurfaceCard>
        <Text style={styles.cardTitle}>{getUserDisplay(profile)}</Text>
        <InfoRow label="Email" value={profile?.email || "—"} />
        <InfoRow label="Role" value={profile?.role || "—"} />
        <InfoRow label="Status" value={profile?.status || "—"} />
        <InfoRow
          label="Attendance entries"
          value={String(data.attendance.length)}
        />
      </SurfaceCard>

      {data.attendance.slice(0, 5).map((item) => (
        <SurfaceCard key={item.id}>
          <Text style={styles.cardTitle}>{item.status || "present"}</Text>
          <Text style={styles.cardMeta}>
            {data.classesById.get(item.classId)?.name || "Class"} •{" "}
            {toDateLabel(item.date || item.updatedAt, true)}
          </Text>
        </SurfaceCard>
      ))}

      <PrimaryButton
        label="Sign out"
        variant="danger"
        onPress={() => signOut(auth)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  metricRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  cardTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 17,
  },
  cardMeta: {
    color: colors.muted,
    lineHeight: 21,
  },
  cardBody: {
    color: colors.text,
    lineHeight: 22,
  },
  inlineChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: colors.surfaceAlt,
  },
});
