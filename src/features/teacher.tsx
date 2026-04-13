import { useMemo, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import {
  addDoc,
  collection,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import * as Haptics from "expo-haptics";
import { useAuth } from "../auth/AuthContext";
import {
  MetricCard,
  PrimaryButton,
  Screen,
  SectionTitle,
  SurfaceCard,
  PillSelector,
  FormInput,
  EmptyState,
} from "../components/ui";
import { db, storage } from "../lib/firebase";
import {
  useRealtimeDocsByIds,
  useRealtimeWhereIn,
} from "../lib/realtime";
import { toDateLabel, toMillis, toTimeLabel, uniqueStrings } from "../lib/utils";
import { colors, rolePalette, spacing } from "../theme";
import { getUserDisplay } from "../types";
import { HeaderCard } from "../components/ui";

function useTeacherData() {
  const { user, profile, isLocalDemoSession } = useAuth();
  const teacherLookupIds = useMemo(
    () => uniqueStrings([user?.uid, profile?.id]),
    [profile?.id, user?.uid]
  );
  const firestoreLive =
    !isLocalDemoSession && teacherLookupIds.length > 0;
  const { data: classes } = useRealtimeWhereIn<any>(
    "classes",
    "teacherUid",
    teacherLookupIds,
    firestoreLive
  );
  const classIds = useMemo(
    () => uniqueStrings(classes.map((item) => item.id)),
    [classes]
  );
  const { data: exams } = useRealtimeWhereIn<any>(
    "exams",
    "teacherUid",
    teacherLookupIds,
    firestoreLive
  );
  const { data: grades } = useRealtimeWhereIn<any>(
    "grades",
    "teacherUid",
    teacherLookupIds,
    firestoreLive
  );
  const { data: attendance } = useRealtimeWhereIn<any>(
    "attendance",
    "teacherUid",
    teacherLookupIds,
    firestoreLive
  );
  const { data: sessions } = useRealtimeWhereIn<any>(
    "classSessions",
    "teacherUid",
    teacherLookupIds,
    firestoreLive
  );
  const { data: resources } = useRealtimeWhereIn<any>(
    "resources",
    "teacherUid",
    teacherLookupIds,
    firestoreLive
  );
  const { data: enrollments } = useRealtimeWhereIn<any>(
    "enrollments",
    "classId",
    classIds,
    firestoreLive && classIds.length > 0
  );
  const studentIds = useMemo(
    () => uniqueStrings(enrollments.map((item) => item.studentUid)),
    [enrollments]
  );
  const { data: users } = useRealtimeDocsByIds<any>(
    "users",
    studentIds,
    firestoreLive && studentIds.length > 0
  );
  const students = users.filter((item) => item.role === "student");
  const studentMap = useMemo(
    () => new Map(students.map((item) => [item.id, item])),
    [students]
  );
  const classMap = useMemo(
    () => new Map(classes.map((item) => [item.id, item])),
    [classes]
  );

  return {
    user,
    profile,
    isLocalDemoSession,
    classes: [...classes].sort(
      (a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)
    ),
    exams: [...exams].sort(
      (a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)
    ),
    grades: [...grades].sort(
      (a, b) => toMillis(b.date || b.createdAt) - toMillis(a.date || a.createdAt)
    ),
    attendance: [...attendance].sort(
      (a, b) => toMillis(b.date || b.updatedAt) - toMillis(a.date || a.updatedAt)
    ),
    sessions: [...sessions].sort((a, b) => toMillis(a.startsAt) - toMillis(b.startsAt)),
    resources: [...resources].sort(
      (a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)
    ),
    enrollments,
    students,
    studentMap,
    classMap,
  };
}

export function TeacherDashboardScreen() {
  const data = useTeacherData();
  return (
    <Screen>
      <HeaderCard
        title={`Welcome, ${data.profile?.fullName?.split(" ")[0] || "Teacher"}`}
        subtitle="Manage classes, scheduling, grades, and resources in a native workflow."
        colors={rolePalette.teacher}
      />
      <View style={styles.metricRow}>
        <MetricCard
          label="Classes"
          value={String(data.classes.length)}
          hint="Assigned to you"
        />
        <MetricCard
          label="Students"
          value={String(data.students.length)}
          hint="Across your classes"
        />
      </View>
      <View style={styles.metricRow}>
        <MetricCard
          label="Exams"
          value={String(data.exams.length)}
          hint="Published assessments"
        />
        <MetricCard
          label="Resources"
          value={String(data.resources.length)}
          hint="Shared files and links"
        />
      </View>
      <SectionTitle title="Latest grading activity" />
      {data.grades.slice(0, 5).map((grade) => (
        <SurfaceCard key={grade.id}>
          <Text style={styles.cardTitle}>{grade.label || "Grade entry"}</Text>
          <Text style={styles.cardMeta}>
            {data.studentMap.get(grade.studentUid)?.fullName || grade.studentUid}
            {" • "}
            {data.classMap.get(grade.classId)?.name || "Class"}
          </Text>
          <Text style={styles.cardMeta}>
            {grade.score}/{grade.maxScore} •{" "}
            {toDateLabel(grade.date || grade.createdAt, true)}
          </Text>
        </SurfaceCard>
      ))}
    </Screen>
  );
}

export function TeacherClassesScreen() {
  const data = useTeacherData();
  return (
    <Screen>
      <SectionTitle
        title="My classes"
        subtitle="Each class shows assigned students and teacher-owned data."
      />
      {data.classes.length === 0 ? (
        <EmptyState
          title="No classes assigned"
          body="Ask your school to assign you to classes."
        />
      ) : (
        data.classes.map((cls) => {
          const classStudents = data.enrollments.filter(
            (item) => item.classId === cls.id
          );
          return (
            <SurfaceCard key={cls.id}>
              <Text style={styles.cardTitle}>{cls.name || cls.code || "Class"}</Text>
              <Text style={styles.cardMeta}>{cls.code || "No class code"}</Text>
              <Text style={styles.cardMeta}>
                Students: {classStudents.length}
              </Text>
              <View style={styles.inlineList}>
                {classStudents.slice(0, 6).map((item) => (
                  <View key={`${cls.id}-${item.studentUid}`} style={styles.inlineChip}>
                    <Text style={styles.inlineChipText}>
                      {data.studentMap.get(item.studentUid)?.fullName ||
                        item.studentUid}
                    </Text>
                  </View>
                ))}
              </View>
            </SurfaceCard>
          );
        })
      )}
    </Screen>
  );
}

export function TeacherGradebookScreen() {
  const data = useTeacherData();
  return (
    <Screen>
      <SectionTitle
        title="Gradebook"
        subtitle="Recent grade entries and attendance records generated by your teaching account."
      />
      {data.grades.slice(0, 8).map((grade) => (
        <SurfaceCard key={grade.id}>
          <Text style={styles.cardTitle}>{grade.label || "Grade entry"}</Text>
          <Text style={styles.cardMeta}>
            {data.studentMap.get(grade.studentUid)?.fullName || grade.studentUid}
            {" • "}
            {grade.score}/{grade.maxScore}
          </Text>
        </SurfaceCard>
      ))}
      <SectionTitle title="Attendance" />
      {data.attendance.slice(0, 6).map((item) => (
        <SurfaceCard key={item.id}>
          <Text style={styles.cardTitle}>
            {data.studentMap.get(item.studentUid)?.fullName || item.studentUid}
          </Text>
          <Text style={styles.cardMeta}>
            {item.status || "present"} •{" "}
            {toDateLabel(item.date || item.updatedAt, true)}
          </Text>
        </SurfaceCard>
      ))}
    </Screen>
  );
}

export function TeacherScheduleScreen() {
  const data = useTeacherData();
  return (
    <Screen>
      <SectionTitle
        title="Schedule & resources"
        subtitle="Sessions and resources authored by this teacher account."
      />
      {data.sessions.map((session) => (
        <SurfaceCard key={session.id}>
          <Text style={styles.cardTitle}>
            {data.classMap.get(session.classId)?.name || "Class session"}
          </Text>
          <Text style={styles.cardMeta}>
            {toDateLabel(session.startsAt, true)} • {toTimeLabel(session.startsAt)}
          </Text>
          {session.location ? (
            <Text style={styles.cardBody}>Location: {session.location}</Text>
          ) : null}
        </SurfaceCard>
      ))}
      {data.resources.map((resource) => (
        <SurfaceCard key={resource.id}>
          <Text style={styles.cardTitle}>{resource.title || "Resource"}</Text>
          <Text style={styles.cardMeta}>
            {data.classMap.get(resource.classId)?.name || "Class"}
          </Text>
          {resource.url ? (
            <PrimaryButton
              label="Open link"
              variant="ghost"
              onPress={() => Linking.openURL(resource.url)}
            />
          ) : null}
        </SurfaceCard>
      ))}
    </Screen>
  );
}

export function TeacherActionsScreen() {
  const { signOutUser } = useAuth();
  const data = useTeacherData();
  const [examClassId, setExamClassId] = useState<string | null>(null);
  const [examTitle, setExamTitle] = useState("");
  const [gradeClassId, setGradeClassId] = useState<string | null>(null);
  const [gradeStudentId, setGradeStudentId] = useState<string | null>(null);
  const [gradeScore, setGradeScore] = useState("");
  const [gradeLabel, setGradeLabel] = useState("");
  const [resourceClassId, setResourceClassId] = useState<string | null>(null);
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [sessionClassId, setSessionClassId] = useState<string | null>(null);
  const [sessionLocation, setSessionLocation] = useState("");
  const [pickedFile, setPickedFile] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [helperText, setHelperText] = useState("");

  const classOptions = data.classes.map((item) => ({
    label: item.name || item.code || "Class",
    value: item.id,
  }));
  const studentOptions = data.students.map((item) => ({
    label: getUserDisplay(item),
    value: item.id,
  }));

  const addExam = async () => {
    if (data.isLocalDemoSession) {
      setHelperText("Demo mode: data is offline preview only.");
      return;
    }
    if (!examClassId || !examTitle.trim()) return;
    await addDoc(collection(db, "exams"), {
      classId: examClassId,
      title: examTitle.trim(),
      maxScore: 100,
      teacherUid: data.user?.uid || null,
      createdAt: serverTimestamp(),
    });
    setExamTitle("");
    setHelperText("Exam created.");
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const addGrade = async () => {
    if (data.isLocalDemoSession) {
      setHelperText("Demo mode: data is offline preview only.");
      return;
    }
    if (!gradeClassId || !gradeStudentId || !gradeScore.trim()) return;
    await addDoc(collection(db, "grades"), {
      classId: gradeClassId,
      studentUid: gradeStudentId,
      label: gradeLabel.trim() || "Assessment",
      score: Number(gradeScore),
      maxScore: 100,
      teacherUid: data.user?.uid || null,
      date: new Date(),
      createdAt: serverTimestamp(),
    });
    setGradeScore("");
    setGradeLabel("");
    setHelperText("Grade recorded.");
  };

  const addResourceLink = async () => {
    if (data.isLocalDemoSession) {
      setHelperText("Demo mode: data is offline preview only.");
      return;
    }
    if (!resourceClassId || !resourceTitle.trim() || !resourceUrl.trim()) return;
    await addDoc(collection(db, "resources"), {
      classId: resourceClassId,
      title: resourceTitle.trim(),
      url: resourceUrl.trim(),
      resourceType: "link",
      teacherUid: data.user?.uid || null,
      createdAt: serverTimestamp(),
    });
    setResourceTitle("");
    setResourceUrl("");
    setHelperText("Link resource published.");
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (!result.canceled) {
      setPickedFile(result.assets[0]);
      setHelperText("");
    }
  };

  const uploadFileResource = async () => {
    if (data.isLocalDemoSession) {
      setHelperText("Demo mode: data is offline preview only.");
      return;
    }
    if (!resourceClassId || !pickedFile) return;

    const response = await fetch(pickedFile.uri);
    const blob = await response.blob();
    const fileRef = ref(
      storage,
      `resources/${Date.now()}_${pickedFile.name || "resource"}`
    );
    await uploadBytes(fileRef, blob, {
      contentType: pickedFile.mimeType || "application/octet-stream",
    });
    const url = await getDownloadURL(fileRef);

    await addDoc(collection(db, "resources"), {
      classId: resourceClassId,
      title: resourceTitle.trim() || pickedFile.name || "Uploaded resource",
      url,
      resourceType: "file",
      fileName: pickedFile.name || null,
      teacherUid: data.user?.uid || null,
      createdAt: serverTimestamp(),
    });

    setPickedFile(null);
    setResourceTitle("");
    setHelperText("File uploaded and shared.");
  };

  const addSession = async () => {
    if (data.isLocalDemoSession) {
      setHelperText("Demo mode: data is offline preview only.");
      return;
    }
    if (!sessionClassId) return;
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    const endsAt = new Date(now.getTime() + 60 * 60 * 1000);
    await addDoc(collection(db, "classSessions"), {
      classId: sessionClassId,
      startsAt: now,
      endsAt,
      location: sessionLocation.trim() || "Main classroom",
      teacherUid: data.user?.uid || null,
      createdAt: serverTimestamp(),
    });
    setSessionLocation("");
    setHelperText("Next class session created.");
  };

  return (
    <Screen keyboard>
      <SectionTitle
        title="Teacher actions"
        subtitle="Create the same core records used by the current web platform."
      />
      <SurfaceCard>
        <Text style={styles.cardTitle}>Create exam</Text>
        <PillSelector value={examClassId} onChange={setExamClassId} options={classOptions} />
        <FormInput
          value={examTitle}
          onChangeText={setExamTitle}
          placeholder="Midterm, Quiz, Assignment"
        />
        <PrimaryButton label="Add exam" onPress={addExam} />
      </SurfaceCard>
      <SurfaceCard>
        <Text style={styles.cardTitle}>Record grade</Text>
        <PillSelector value={gradeClassId} onChange={setGradeClassId} options={classOptions} />
        <PillSelector
          value={gradeStudentId}
          onChange={setGradeStudentId}
          options={studentOptions}
        />
        <FormInput
          value={gradeLabel}
          onChangeText={setGradeLabel}
          placeholder="Assessment label"
        />
        <FormInput
          value={gradeScore}
          onChangeText={setGradeScore}
          keyboardType="numeric"
          placeholder="Score / 100"
        />
        <PrimaryButton label="Save grade" onPress={addGrade} />
      </SurfaceCard>
      <SurfaceCard>
        <Text style={styles.cardTitle}>Share resource</Text>
        <PillSelector
          value={resourceClassId}
          onChange={setResourceClassId}
          options={classOptions}
        />
        <FormInput
          value={resourceTitle}
          onChangeText={setResourceTitle}
          placeholder="Resource title"
        />
        <FormInput
          value={resourceUrl}
          onChangeText={setResourceUrl}
          placeholder="https://..."
          autoCapitalize="none"
        />
        <PrimaryButton label="Publish link" onPress={addResourceLink} />
        <PrimaryButton
          label={pickedFile ? `Selected: ${pickedFile.name}` : "Choose file"}
          variant="ghost"
          onPress={pickFile}
        />
        <PrimaryButton
          label="Upload selected file"
          variant="secondary"
          onPress={uploadFileResource}
          disabled={!pickedFile}
        />
      </SurfaceCard>
      <SurfaceCard>
        <Text style={styles.cardTitle}>Schedule class</Text>
        <PillSelector
          value={sessionClassId}
          onChange={setSessionClassId}
          options={classOptions}
        />
        <FormInput
          value={sessionLocation}
          onChangeText={setSessionLocation}
          placeholder="Room, Zoom, Lab..."
        />
        <PrimaryButton label="Create next session" onPress={addSession} />
      </SurfaceCard>
      {helperText ? (
        <SurfaceCard>
          <Text style={styles.cardMeta}>{helperText}</Text>
        </SurfaceCard>
      ) : null}
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
  cardBody: {
    color: colors.text,
    lineHeight: 22,
  },
  inlineList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  inlineChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: colors.surfaceAlt,
  },
  inlineChipText: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 12,
  },
});
