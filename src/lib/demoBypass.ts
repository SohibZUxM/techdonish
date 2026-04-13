import type { Role, UserProfile } from "../types";

/**
 * Built-in demo accounts: always treated as approved (active) in the app.
 * Not time-limited — this is permanent app-side behavior for these emails only.
 * Firestore profile data is merged when available (e.g. parent child links).
 */
const DEMO_BY_EMAIL: Record<
  string,
  { fullName: string; role: Role }
> = {
  "student.demo@techdonish.app": { fullName: "Ahmad", role: "student" },
  "teacher.demo@techdonish.app": { fullName: "Anvar", role: "teacher" },
  "parent.demo@techdonish.app": { fullName: "Alisher", role: "parent" },
};

export function isDemoAccountEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return DEMO_BY_EMAIL.hasOwnProperty(email.trim().toLowerCase());
}

/**
 * Returns the profile the app should use for routing and UI.
 * Demo users always get status "active" and their fixed role — no admin step.
 */
export function applyDemoBypass(
  uid: string,
  email: string | null | undefined,
  fromFirestore: UserProfile | null
): UserProfile | null {
  if (!email?.trim()) {
    return fromFirestore;
  }

  const key = email.trim().toLowerCase();
  const demo = DEMO_BY_EMAIL[key];
  if (!demo) {
    return fromFirestore;
  }

  const merged: UserProfile = {
    ...(fromFirestore ?? { id: uid }),
    id: uid,
    email: key,
    fullName: demo.fullName,
    role: demo.role,
    status: "active",
    requestedRole: demo.role,
    childStudentIds: fromFirestore?.childStudentIds,
  };

  return merged;
}
