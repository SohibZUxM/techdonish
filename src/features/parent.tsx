import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
import {
  useRealtimeDocsByIds,
  useRealtimeWhereIn,
} from "../lib/realtime";
import {
  safePercent,
  toDateLabel,
  toMillis,
  toTimeLabel,
  uniqueStrings,
} from "../lib/utils";
import { colors, rolePalette, spacing } from "../theme";
import { getUserDisplay } from "../types";

function useParentData() {
  const { profile } = useAuth();
  const childIds = useMemo(
    () => uniqueStrings(profile?.childStudentIds || []),
    [profile?.childStudentIds]
  );
  const { data: linkedUsers } = useRealtimeDocsByIds<any>(
    "users",
    childIds,
    childIds.length > 0
  );
  const students = linkedUsers.filter((item) => item.role === "student");
  const { data: enrollments } = useRealtimeWhereIn<any>(
    "enrollments",
    "studentUid",
    childIds,
    childIds.length > 0
  );
  const { data: grades } = useRealtimeWhereIn<any>(
    "grades",
    "studentUid",
    childIds,
    childIds.length > 0
  );
  const { data: attendance } = useRealtimeWhereIn<any>(
    "attendance",
    "studentUid",
    childIds,
    childIds.length > 0
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
  const { data: resources } = useRealtimeWhereIn<any>(
    "resources",
    "classId",
    classIds,
    classIds.length > 0
  );
  const { data: sessions } = useRealtimeWhereIn<any>(
    "classSessions",
    "classId",
    classIds,
    classIds.length > 0
  );

  const classMap = useMemo(
    () => new Map(classes.map((item) => [item.id, item])),
    [classes]
  );
  const courseMap = useMemo(
    () => new Map(courses.map((item) => [item.id, item])),
    [courses]
  );

  return {
    profile,
    students,
    enrollments,
    grades,
    attendance,
    resources,
    sessions,
    classMap,
    courseMap,
  };
}

export function ParentDashboardScreen() {
  const data = useParentData();
  return (
    <Screen>
      <HeaderCard
        title={`Hello, ${data.profile?.fullName?.split(" ")[0] || "Parent"}`}
        subtitle="Monitor your linked children with the same live backend data as the web portal."
        colors={rolePalette.parent}
      />
      <View style={styles.metricRow}>
        <MetricCard
          label="Children"
          value={String(data.students.length)}
          hint="Linked student accounts"
        />
        <MetricCard
          label="Resources"
          value={String(data.resources.length)}
          hint="Available shared materials"
        />
      </View>
      <SectionTitle title="Children snapshot" />
      {data.students.map((student) => {
        const studentGrades = data.grades.filter(
          (item) => item.studentUid === student.id
        );
        const percents = studentGrades
          .map((item) => safePercent(item.score, item.maxScore))
          .filter((item): item is number => typeof item === "number");
        const avg = percents.length
          ? `${Math.round(
              percents.reduce((sum, value) => sum + value, 0) / percents.length
            )}%`
          : "—";
        return (
          <SurfaceCard key={student.id}>
            <Text style={styles.cardTitle}>{getUserDisplay(student)}</Text>
            <Text style={styles.cardMeta}>Average score: {avg}</Text>
            <Text style={styles.cardMeta}>
              Attendance records:{" "}
              {data.attendance.filter((item) => item.studentUid === student.id).length}
            </Text>
          </SurfaceCard>
        );
      })}
    </Screen>
  );
}

export function ParentChildrenScreen() {
  const data = useParentData();
  const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);

  const handleToggleClass = (studentId: string, classId?: string) => {
    if (!classId) return;
    const nextKey = `${studentId}:${classId}`;
    setSelectedClassKey((current) => (current === nextKey ? null : nextKey));
  };

  return (
    <Screen>
      <SectionTitle
        title="Child details"
        subtitle="Tap a class to expand and view detailed grades."
      />
      {data.students.map((student) => {
        const enrollments = data.enrollments.filter(
          (item) => item.studentUid === student.id
        );
        const studentGrades = [...data.grades]
          .filter((item) => item.studentUid === student.id)
          .sort(
            (a, b) =>
              toMillis(b.date || b.createdAt) - toMillis(a.date || a.createdAt)
          );

        return (
          <SurfaceCard key={student.id}>
            <Text style={styles.cardTitle}>{getUserDisplay(student)}</Text>

            {enrollments.map((enrollment) => {
              const cls = data.classMap.get(enrollment.classId);
              const course = data.courseMap.get(cls?.courseId);
              const classGrades = studentGrades.filter(
                (grade) => grade.classId === enrollment.classId
              );
              const classExpanded =
                selectedClassKey === `${student.id}:${enrollment.classId}`;

              return (
                <View key={enrollment.id} style={styles.dividerRow}>
                  <Pressable
                    onPress={() => handleToggleClass(student.id, enrollment.classId)}
                    style={styles.pressableBlock}
                  >
                    <Text style={styles.cardMetaStrong}>
                      {cls?.name || cls?.code || "Class"}
                    </Text>
                    <Text style={styles.cardMeta}>{course?.name || "Course"}</Text>
                    <Text style={styles.cardMeta}>
                      {classExpanded ? "Hide class grades" : "Show class grades"}
                    </Text>
                  </Pressable>

                  {classExpanded ? (
                    <View style={styles.classGradeBlock}>
                      {classGrades.length === 0 ? (
                        <Text style={styles.cardMeta}>
                          No grades recorded for this class yet.
                        </Text>
                      ) : (
                        classGrades.map((grade) => {
                          const percent = safePercent(grade.score, grade.maxScore);
                          return (
                            <View key={grade.id} style={styles.subtleDivider}>
                              <Text style={styles.cardTitleSmall}>
                                {grade.label || "Grade entry"}
                              </Text>
                              <Text style={styles.cardMeta}>
                                Score: {grade.score ?? "—"} / {grade.maxScore ?? "—"}
                                {typeof percent === "number" ? ` • ${percent}%` : ""}
                              </Text>
                              <Text style={styles.cardMeta}>
                                {toDateLabel(grade.date || grade.createdAt, true)}
                              </Text>
                            </View>
                          );
                        })
                      )}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </SurfaceCard>
        );
      })}
    </Screen>
  );
}

export function ParentAttendanceScreen() {
  const data = useParentData();
  return (
    <Screen>
      <SectionTitle
        title="Attendance"
        subtitle="Latest attendance status updates for your children."
      />
      {data.attendance.length === 0 ? (
        <EmptyState
          title="No attendance records"
          body="Teacher-submitted attendance will appear here."
        />
      ) : (
        [...data.attendance]
          .sort(
            (a, b) =>
              toMillis(b.date || b.updatedAt) - toMillis(a.date || a.updatedAt)
          )
          .slice(0, 12)
          .map((item) => (
            <SurfaceCard key={item.id}>
              <Text style={styles.cardTitle}>
                {getUserDisplay(
                  data.students.find((student) => student.id === item.studentUid)
                )}
              </Text>
              <Text style={styles.cardMeta}>
                {item.status || "present"} •{" "}
                {toDateLabel(item.date || item.updatedAt, true)}
              </Text>
            </SurfaceCard>
          ))
      )}
    </Screen>
  );
}

export function ParentUpdatesScreen() {
  const data = useParentData();
  return (
    <Screen>
      <SectionTitle
        title="Updates"
        subtitle="Sessions and resources related to your linked children."
      />
      {data.sessions.slice(0, 6).map((session) => (
        <SurfaceCard key={session.id}>
          <Text style={styles.cardTitle}>
            {data.classMap.get(session.classId)?.name || "Session"}
          </Text>
          <Text style={styles.cardMeta}>
            {toDateLabel(session.startsAt, true)} • {toTimeLabel(session.startsAt)}
          </Text>
        </SurfaceCard>
      ))}
      {data.resources.slice(0, 6).map((resource) => (
        <SurfaceCard key={resource.id}>
          <Text style={styles.cardTitle}>{resource.title || "Resource"}</Text>
          <Text style={styles.cardMeta}>
            {data.classMap.get(resource.classId)?.name || "Class"}
          </Text>
        </SurfaceCard>
      ))}
    </Screen>
  );
}

export function ParentProfileScreen() {
  const { profile, signOutUser } = useAuth();

  return (
    <Screen>
      <SurfaceCard>
        <Text style={styles.cardTitle}>{getUserDisplay(profile)}</Text>
        <InfoRow label="Email" value={profile?.email || "—"} />
        <InfoRow
          label="Linked children"
          value={String(profile?.childStudentIds?.length || 0)}
        />
      </SurfaceCard>
      <PrimaryButton
        label="Sign out"
        variant="danger"
        onPress={() => signOutUser()}
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
  cardMetaStrong: {
    color: colors.text,
    lineHeight: 21,
    fontWeight: "700",
  },
  cardTitleSmall: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 15,
  },
  pressableBlock: {
    gap: spacing.xs,
  },
  classGradeBlock: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  dividerRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  subtleDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    marginTop: spacing.xs,
  },
});
