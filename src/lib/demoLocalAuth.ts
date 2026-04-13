import type { Role, UserProfile } from "../types";

/** Fixed UIDs for local demo sessions (no Firebase Auth). */
export const DEMO_STUDENT_UID = "demo-local-student";
export const DEMO_TEACHER_UID = "demo-local-teacher";
export const DEMO_PARENT_UID = "demo-local-parent";

/** Password is verified only in-app for these accounts — not sent to Firebase Auth. */
export const DEMO_LOCAL_PASSWORD = "Demo@12345";

type DemoRow = {
  uid: string;
  fullName: string;
  role: Role;
  childStudentIds?: string[];
};

const DEMO_BY_EMAIL: Record<string, DemoRow> = {
  "student.demo@techdonish.app": {
    uid: DEMO_STUDENT_UID,
    fullName: "Ahmad",
    role: "student",
  },
  "teacher.demo@techdonish.app": {
    uid: DEMO_TEACHER_UID,
    fullName: "Anvar",
    role: "teacher",
  },
  "parent.demo@techdonish.app": {
    uid: DEMO_PARENT_UID,
    fullName: "Alisher",
    role: "parent",
    childStudentIds: [DEMO_STUDENT_UID],
  },
};

export type DemoSession = {
  uid: string;
  email: string;
  fullName: string;
  role: Role;
  childStudentIds?: string[];
};

export function isDemoAccountEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  return Object.prototype.hasOwnProperty.call(
    DEMO_BY_EMAIL,
    email.trim().toLowerCase()
  );
}

/**
 * Validates demo email + password locally. Does not use Firebase.
 * @throws Error if wrong password or unknown demo email
 */
export function assertDemoLocalLogin(
  email: string,
  password: string
): DemoSession {
  const key = email.trim().toLowerCase();
  const row = DEMO_BY_EMAIL[key];
  if (!row) {
    throw new Error("Unknown demo account.");
  }
  if (password.trim() !== DEMO_LOCAL_PASSWORD) {
    throw new Error("Incorrect password.");
  }
  return {
    uid: row.uid,
    email: key,
    fullName: row.fullName,
    role: row.role,
    childStudentIds: row.childStudentIds,
  };
}

export function demoSessionToProfile(session: DemoSession): UserProfile {
  return {
    id: session.uid,
    email: session.email,
    fullName: session.fullName,
    role: session.role,
    status: "active",
    requestedRole: session.role,
    childStudentIds: session.childStudentIds,
  };
}
