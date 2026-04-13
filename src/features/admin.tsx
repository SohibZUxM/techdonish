import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { signOut } from "firebase/auth";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  orderBy,
} from "firebase/firestore";
import { useAuth } from "../auth/AuthContext";
import {
  EmptyState,
  HeaderCard,
  MetricCard,
  PillSelector,
  PrimaryButton,
  Screen,
  SectionTitle,
  SurfaceCard,
  FormInput,
} from "../components/ui";
import { auth, db } from "../lib/firebase";
import { useRealtimeList } from "../lib/realtime";
import { colors, rolePalette, spacing } from "../theme";
import { getUserDisplay, type UserProfile, type UserStatus } from "../types";

type ManagedRole = "student" | "parent";
type FeedbackState = { tone: "success" | "error"; message: string } | null;

type ManagedUser = UserProfile;
type CourseRecord = {
  id: string;
  name?: string;
  code?: string;
};
type ClassRecord = {
  id: string;
  name?: string;
  code?: string;
  courseId?: string | null;
  teacherUid?: string | null;
  teacherName?: string | null;
};
type EnrollmentRecord = {
  id: string;
  studentUid?: string;
  classId?: string;
};

const sortUsers = <T extends ManagedUser>(users: T[]) =>
  [...users].sort((a, b) => getUserDisplay(a).localeCompare(getUserDisplay(b)));

function useAdminData() {
  const { user, profile } = useAuth();
  const { data: courses } = useRealtimeList<CourseRecord>(
    () => query(collection(db, "courses"), orderBy("createdAt", "desc")),
    []
  );
  const { data: classes } = useRealtimeList<ClassRecord>(
    () => query(collection(db, "classes"), orderBy("createdAt", "desc")),
    []
  );
  const { data: pendingUsers } = useRealtimeList<ManagedUser>(
    () => query(collection(db, "users"), where("status", "==", "pending")),
    []
  );
  const { data: students } = useRealtimeList<ManagedUser>(
    () => query(collection(db, "users"), where("role", "==", "student")),
    []
  );
  const { data: activeTeachers } = useRealtimeList<ManagedUser>(
    () =>
      query(
        collection(db, "users"),
        where("role", "==", "teacher"),
        where("status", "==", "active")
      ),
    []
  );
  const { data: parents } = useRealtimeList<ManagedUser>(
    () => query(collection(db, "users"), where("role", "==", "parent")),
    []
  );
  const { data: enrollments } = useRealtimeList<EnrollmentRecord>(
    () => query(collection(db, "enrollments"), orderBy("createdAt", "desc")),
    []
  );

  const activeStudents = useMemo(
    () => sortUsers(students.filter((item) => item.status === "active")),
    [students]
  );
  const activeParents = useMemo(
    () => sortUsers(parents.filter((item) => item.status === "active")),
    [parents]
  );

  const logActivity = async (type: string, message: string) => {
    await addDoc(collection(db, "adminActivity"), {
      type,
      message,
      createdAt: serverTimestamp(),
      createdBy: user?.uid || null,
    });
  };

  const approveUser = async (target: ManagedUser) => {
    await updateDoc(doc(db, "users", target.id), {
      role: target.requestedRole || "student",
      status: "active",
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid || null,
    });
    await logActivity("approval", `Approved ${target.email || target.id}`);
  };

  const saveManagedUser = async (
    targetId: string,
    updates: { fullName: string; email: string }
  ) => {
    await updateDoc(doc(db, "users", targetId), {
      fullName: updates.fullName.trim(),
      email: updates.email.trim().toLowerCase(),
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid || null,
    });
    await logActivity("user-edit", `Updated profile details for ${targetId}`);
  };

  const setManagedUserStatus = async (
    target: ManagedUser,
    status: UserStatus
  ) => {
    await updateDoc(doc(db, "users", target.id), {
      status,
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid || null,
    });
    await logActivity(
      "user-status",
      `${status === "disabled" ? "Disabled" : "Activated"} ${getUserDisplay(target)}`
    );
  };

  const linkParentToStudent = async (parentId: string, studentId: string) => {
    await updateDoc(doc(db, "users", parentId), {
      childStudentIds: arrayUnion(studentId),
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid || null,
    });
    await logActivity("family-link", `Linked parent ${parentId} to student ${studentId}`);
  };

  const unlinkParentFromStudent = async (
    parentId: string,
    studentId: string
  ) => {
    await updateDoc(doc(db, "users", parentId), {
      childStudentIds: arrayRemove(studentId),
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid || null,
    });
    await logActivity(
      "family-unlink",
      `Removed student ${studentId} from parent ${parentId}`
    );
  };

  return {
    user,
    profile,
    courses,
    classes,
    pendingUsers,
    students,
    parents,
    activeStudents,
    activeTeachers,
    activeParents,
    enrollments,
    approveUser,
    saveManagedUser,
    setManagedUserStatus,
    linkParentToStudent,
    unlinkParentFromStudent,
  };
}

export function AdminDashboardScreen() {
  const data = useAdminData();
  return (
    <Screen>
      <HeaderCard
        title="Admin control"
        subtitle="Monitor course setup, approvals, people, and enrollments from the native admin workspace."
        colors={rolePalette.admin}
      />
      <View style={styles.metricRow}>
        <MetricCard
          label="Courses"
          value={String(data.courses.length)}
          hint="Configured in Firestore"
        />
        <MetricCard
          label="Classes"
          value={String(data.classes.length)}
          hint="Live class records"
        />
      </View>
      <View style={styles.metricRow}>
        <MetricCard
          label="Pending"
          value={String(data.pendingUsers.length)}
          hint="Awaiting approval"
        />
        <MetricCard
          label="Enrollments"
          value={String(data.enrollments.length)}
          hint="Student-to-class links"
        />
      </View>
      <SectionTitle title="Pending approvals" />
      {data.pendingUsers.slice(0, 5).map((item) => (
        <SurfaceCard key={item.id}>
          <Text style={styles.cardTitle}>{item.fullName || item.email || item.id}</Text>
          <Text style={styles.cardMeta}>
            Requested role: {item.requestedRole || "unknown"}
          </Text>
          <PrimaryButton label="Approve" onPress={() => data.approveUser(item)} />
        </SurfaceCard>
      ))}
    </Screen>
  );
}

export function AdminCoursesScreen() {
  const data = useAdminData();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const createCourse = async () => {
    if (!name.trim() || !code.trim()) return;
    await addDoc(collection(db, "courses"), {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      createdAt: serverTimestamp(),
      createdBy: data.user?.uid || null,
    });
    setName("");
    setCode("");
  };

  return (
    <Screen keyboard>
      <SurfaceCard>
        <Text style={styles.cardTitle}>Create course</Text>
        <FormInput value={name} onChangeText={setName} placeholder="Course name" />
        <FormInput
          value={code}
          onChangeText={setCode}
          placeholder="Course code"
          autoCapitalize="characters"
        />
        <PrimaryButton label="Add course" onPress={createCourse} />
      </SurfaceCard>
      {data.courses.map((course) => (
        <SurfaceCard key={course.id}>
          <Text style={styles.cardTitle}>{course.name}</Text>
          <Text style={styles.cardMeta}>{course.code}</Text>
        </SurfaceCard>
      ))}
    </Screen>
  );
}

export function AdminClassesScreen() {
  const data = useAdminData();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [courseId, setCourseId] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);

  const createClass = async () => {
    if (!name.trim() || !code.trim() || !courseId) return;
    await addDoc(collection(db, "classes"), {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      courseId,
      teacherUid: null,
      teacherName: null,
      createdAt: serverTimestamp(),
      createdBy: data.user?.uid || null,
    });
    setName("");
    setCode("");
  };

  const assignTeacher = async () => {
    if (!classId) return;
    const teacher = data.activeTeachers.find((item) => item.id === teacherId);
    await updateDoc(doc(db, "classes", classId), {
      teacherUid: teacherId || null,
      teacherName: teacher ? getUserDisplay(teacher) : null,
      updatedAt: serverTimestamp(),
      updatedBy: data.user?.uid || null,
    });
  };

  return (
    <Screen keyboard>
      <SurfaceCard>
        <Text style={styles.cardTitle}>Create class</Text>
        <PillSelector
          value={courseId}
          onChange={setCourseId}
          options={data.courses.map((item) => ({
            label: item.code || item.name,
            value: item.id,
          }))}
        />
        <FormInput value={name} onChangeText={setName} placeholder="Class name" />
        <FormInput
          value={code}
          onChangeText={setCode}
          placeholder="Class code"
          autoCapitalize="characters"
        />
        <PrimaryButton label="Add class" onPress={createClass} />
      </SurfaceCard>
      <SurfaceCard>
        <Text style={styles.cardTitle}>Assign teacher</Text>
        <PillSelector
          value={classId}
          onChange={setClassId}
          options={data.classes.map((item) => ({
            label: item.name || item.code,
            value: item.id,
          }))}
        />
        <PillSelector
          value={teacherId}
          onChange={setTeacherId}
          options={data.activeTeachers.map((item) => ({
            label: getUserDisplay(item),
            value: item.id,
          }))}
        />
        <PrimaryButton label="Save assignment" onPress={assignTeacher} />
      </SurfaceCard>
      {data.classes.map((cls) => (
        <SurfaceCard key={cls.id}>
          <Text style={styles.cardTitle}>{cls.name}</Text>
          <Text style={styles.cardMeta}>{cls.code}</Text>
          <Text style={styles.cardMeta}>
            Teacher: {cls.teacherName || "Unassigned"}
          </Text>
        </SurfaceCard>
      ))}
    </Screen>
  );
}

export function AdminPeopleScreen() {
  const data = useAdminData();
  const [enrollmentStudentId, setEnrollmentStudentId] = useState<string | null>(
    null
  );
  const [classId, setClassId] = useState<string | null>(null);
  const [linkParentId, setLinkParentId] = useState<string | null>(null);
  const [linkStudentId, setLinkStudentId] = useState<string | null>(null);
  const [unlinkParentId, setUnlinkParentId] = useState<string | null>(null);
  const [unlinkStudentId, setUnlinkStudentId] = useState<string | null>(null);
  const [manageRole, setManageRole] = useState<ManagedRole>("student");
  const [managedUserId, setManagedUserId] = useState<string | null>(null);
  const [managedFullName, setManagedFullName] = useState("");
  const [managedEmail, setManagedEmail] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const managedUsers = useMemo(
    () => sortUsers(manageRole === "student" ? data.students : data.parents),
    [data.parents, data.students, manageRole]
  );
  const selectedManagedUser =
    managedUsers.find((item) => item.id === managedUserId) || null;
  const linkedParents = useMemo(
    () =>
      sortUsers(data.parents.filter((item) => (item.childStudentIds?.length || 0) > 0)),
    [data.parents]
  );
  const selectedUnlinkParent =
    linkedParents.find((item) => item.id === unlinkParentId) || null;
  const studentMap = useMemo(
    () => new Map(data.students.map((item) => [item.id, item])),
    [data.students]
  );
  const unlinkableStudents = useMemo(
    () =>
      sortUsers(
        (selectedUnlinkParent?.childStudentIds || [])
          .map((id) => studentMap.get(id))
          .filter((item): item is ManagedUser => Boolean(item))
      ),
    [selectedUnlinkParent?.childStudentIds, studentMap]
  );
  const disabledStudentCount = data.students.filter(
    (item) => item.status === "disabled"
  ).length;
  const disabledParentCount = data.parents.filter(
    (item) => item.status === "disabled"
  ).length;

  useEffect(() => {
    if (!managedUsers.find((item) => item.id === managedUserId)) {
      setManagedUserId(managedUsers[0]?.id || null);
    }
  }, [managedUserId, managedUsers]);

  useEffect(() => {
    setManagedFullName(selectedManagedUser?.fullName || "");
    setManagedEmail(selectedManagedUser?.email || "");
  }, [selectedManagedUser?.id]);

  useEffect(() => {
    if (!linkedParents.find((item) => item.id === unlinkParentId)) {
      setUnlinkParentId(linkedParents[0]?.id || null);
    }
  }, [linkedParents, unlinkParentId]);

  useEffect(() => {
    if (!unlinkableStudents.find((item) => item.id === unlinkStudentId)) {
      setUnlinkStudentId(unlinkableStudents[0]?.id || null);
    }
  }, [unlinkStudentId, unlinkableStudents]);

  const runAction = async (
    key: string,
    action: () => Promise<void>,
    successMessage: string
  ) => {
    setBusyAction(key);
    setFeedback(null);
    try {
      await action();
      setFeedback({ tone: "success", message: successMessage });
    } catch (error: any) {
      console.error(error);
      setFeedback({
        tone: "error",
        message: error?.message || "The action could not be completed.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const enrollStudent = async () => {
    if (!enrollmentStudentId || !classId) {
      setFeedback({
        tone: "error",
        message: "Select a student and class before creating the enrollment.",
      });
      return;
    }

    await runAction(
      "enroll-student",
      async () => {
        const enrollmentId = `${enrollmentStudentId}_${classId}`;
        await setDoc(doc(db, "enrollments", enrollmentId), {
          studentUid: enrollmentStudentId,
          classId,
          createdAt: serverTimestamp(),
          createdBy: data.user?.uid || null,
        });
      },
      "Student enrolled successfully."
    );
  };

  const linkParent = async () => {
    if (!linkParentId || !linkStudentId) {
      setFeedback({
        tone: "error",
        message: "Select an active parent and student before linking them.",
      });
      return;
    }

    await runAction(
      "link-family",
      () => data.linkParentToStudent(linkParentId, linkStudentId),
      "Parent linked to student."
    );
  };

  const unlinkParent = async () => {
    if (!unlinkParentId || !unlinkStudentId) {
      setFeedback({
        tone: "error",
        message: "Select a linked parent and child before unlinking them.",
      });
      return;
    }

    await runAction(
      "unlink-family",
      () => data.unlinkParentFromStudent(unlinkParentId, unlinkStudentId),
      "Parent and student link removed."
    );
  };

  const saveManagedUser = async () => {
    if (!selectedManagedUser) {
      setFeedback({ tone: "error", message: "Select a record to update first." });
      return;
    }

    await runAction(
      "save-user",
      () =>
        data.saveManagedUser(selectedManagedUser.id, {
          fullName: managedFullName,
          email: managedEmail,
        }),
      `${manageRole === "student" ? "Student" : "Parent"} details updated.`
    );
  };

  const toggleManagedUserStatus = async () => {
    if (!selectedManagedUser) {
      setFeedback({ tone: "error", message: "Select a record to update first." });
      return;
    }

    const nextStatus: UserStatus =
      selectedManagedUser.status === "disabled" ? "active" : "disabled";

    await runAction(
      "toggle-user-status",
      () => data.setManagedUserStatus(selectedManagedUser, nextStatus),
      nextStatus === "disabled"
        ? "Account disabled. The user can no longer access the active workspace."
        : "Account restored to active status."
    );
  };

  return (
    <Screen keyboard>
      <SurfaceCard>
        <Text style={styles.cardTitle}>Enroll student in class</Text>
        <PillSelector
          value={enrollmentStudentId}
          onChange={setEnrollmentStudentId}
          options={data.activeStudents.map((item) => ({
            label: getUserDisplay(item),
            value: item.id,
          }))}
        />
        <PillSelector
          value={classId}
          onChange={setClassId}
          options={data.classes.map((item) => ({
            label: item.name || item.code,
            value: item.id,
          }))}
        />
        <PrimaryButton label="Enroll student" onPress={enrollStudent} />
      </SurfaceCard>
      <SurfaceCard>
        <Text style={styles.cardTitle}>Link parent to student</Text>
        <PillSelector
          value={linkParentId}
          onChange={setLinkParentId}
          options={data.activeParents.map((item) => ({
            label: getUserDisplay(item),
            value: item.id,
          }))}
        />
        <PillSelector
          value={linkStudentId}
          onChange={setLinkStudentId}
          options={data.activeStudents.map((item) => ({
            label: getUserDisplay(item),
            value: item.id,
          }))}
        />
        <PrimaryButton label="Link parent" onPress={linkParent} />
      </SurfaceCard>
      <SurfaceCard>
        <Text style={styles.cardTitle}>Unlink parent from student</Text>
        <PillSelector
          value={unlinkParentId}
          onChange={setUnlinkParentId}
          options={linkedParents.map((item) => ({
            label: getUserDisplay(item),
            value: item.id,
          }))}
        />
        <PillSelector
          value={unlinkStudentId}
          onChange={setUnlinkStudentId}
          options={unlinkableStudents.map((item) => ({
            label: getUserDisplay(item),
            value: item.id,
          }))}
        />
        <PrimaryButton label="Unlink student" onPress={unlinkParent} />
      </SurfaceCard>
      {feedback ? (
        <SurfaceCard>
          <Text
            style={[
              styles.feedbackText,
              feedback.tone === "error"
                ? styles.feedbackError
                : styles.feedbackSuccess,
            ]}
          >
            {feedback.message}
          </Text>
        </SurfaceCard>
      ) : null}
      <SectionTitle
        title="Manage students and parents"
        subtitle="Edit profile details, review current status, and disable access without deleting records."
      />
      <SurfaceCard>
        <PillSelector
          value={manageRole}
          onChange={(value) => {
            setManageRole(value);
            setFeedback(null);
          }}
          options={[
            { label: "Students", value: "student" },
            { label: "Parents", value: "parent" },
          ]}
        />
        <PillSelector
          value={managedUserId}
          onChange={(value) => {
            setManagedUserId(value);
            setFeedback(null);
          }}
          options={managedUsers.map((item) => ({
            label: `${getUserDisplay(item)} • ${item.status || "pending"}`,
            value: item.id,
          }))}
        />
        {selectedManagedUser ? (
          <>
            <Text style={styles.statusLabel}>
              Status:{" "}
              <Text
                style={[
                  styles.statusValue,
                  selectedManagedUser.status === "disabled"
                    ? styles.statusDisabled
                    : styles.statusActive,
                ]}
              >
                {selectedManagedUser.status || "pending"}
              </Text>
            </Text>
            <FormInput
              value={managedFullName}
              onChangeText={setManagedFullName}
              placeholder="Full name"
            />
            <FormInput
              value={managedEmail}
              onChangeText={setManagedEmail}
              placeholder="Email address"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <PrimaryButton
              label={busyAction === "save-user" ? "Saving..." : "Save changes"}
              onPress={saveManagedUser}
              variant="secondary"
              disabled={Boolean(busyAction)}
            />
            <PrimaryButton
              label={
                busyAction === "toggle-user-status"
                  ? "Updating status..."
                  : selectedManagedUser.status === "disabled"
                    ? "Re-enable account"
                    : "Disable account"
              }
              onPress={toggleManagedUserStatus}
              variant={
                selectedManagedUser.status === "disabled" ? "primary" : "danger"
              }
              disabled={Boolean(busyAction)}
            />
          </>
        ) : (
          <EmptyState
            title="No records available"
            body={`There are no ${manageRole} records to manage right now.`}
          />
        )}
      </SurfaceCard>
      <SectionTitle
        title="People overview"
        subtitle="Live totals for the records currently available in the admin workspace."
      />
      <SurfaceCard>
        <Text style={styles.cardTitle}>
          Students: {data.activeStudents.length} active / {disabledStudentCount} disabled
        </Text>
        <Text style={styles.cardMeta}>Teachers: {data.activeTeachers.length} active</Text>
        <Text style={styles.cardMeta}>
          Parents: {data.activeParents.length} active / {disabledParentCount} disabled
        </Text>
        <Text style={styles.cardMeta}>Family links: {linkedParents.length}</Text>
      </SurfaceCard>
      <SectionTitle
        title="Family links"
        subtitle="Parents currently linked to one or more students."
      />
      {linkedParents.length === 0 ? (
        <EmptyState
          title="No family links yet"
          body="Linked parent-student relationships will appear here."
        />
      ) : (
        linkedParents.map((parent) => (
          <SurfaceCard key={parent.id}>
            <Text style={styles.cardTitle}>{getUserDisplay(parent)}</Text>
            {(parent.childStudentIds || []).map((childId) => (
              <Text key={childId} style={styles.cardMeta}>
                {getUserDisplay(studentMap.get(childId))} ({childId})
              </Text>
            ))}
          </SurfaceCard>
        ))
      )}
    </Screen>
  );
}

export function AdminRequestsScreen() {
  const data = useAdminData();
  return (
    <Screen>
      <SectionTitle
        title="Pending requests"
        subtitle="Approve role requests directly from mobile."
      />
      {data.pendingUsers.length === 0 ? (
        <EmptyState
          title="No pending requests"
          body="Everything is currently approved."
        />
      ) : (
        data.pendingUsers.map((item) => (
          <SurfaceCard key={item.id}>
            <Text style={styles.cardTitle}>{item.fullName || item.email || item.id}</Text>
            <Text style={styles.cardMeta}>{item.email}</Text>
            <Text style={styles.cardMeta}>
              Requested: {item.requestedRole || "unknown"}
            </Text>
            <PrimaryButton
              label="Approve user"
              onPress={() => data.approveUser(item)}
            />
          </SurfaceCard>
        ))
      )}
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
  statusLabel: {
    color: colors.text,
    fontWeight: "700",
  },
  statusValue: {
    fontWeight: "800",
    textTransform: "capitalize",
  },
  statusActive: {
    color: colors.success,
  },
  statusDisabled: {
    color: colors.danger,
  },
  feedbackText: {
    fontWeight: "700",
    lineHeight: 20,
  },
  feedbackSuccess: {
    color: colors.success,
  },
  feedbackError: {
    color: colors.danger,
  },
});
