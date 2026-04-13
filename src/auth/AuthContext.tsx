import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import * as Haptics from "expo-haptics";
import {
  assertDemoLocalLogin,
  demoSessionToProfile,
  isDemoAccountEmail,
  normalizeDemoEmail,
  type DemoSession,
} from "../lib/demoLocalAuth";
import { auth, db } from "../lib/firebase";
import type { AuthSessionUser, Role, UserProfile } from "../types";

type AuthContextValue = {
  initializing: boolean;
  user: AuthSessionUser | null;
  /** True when using built-in demo logins (no Firebase Auth session). */
  isLocalDemoSession: boolean;
  profile: UserProfile | null;
  refreshProfile: () => Promise<void>;
  authenticateForRole: (params: {
    role: Role;
    mode: "login" | "signup";
    fullName?: string;
    email: string;
    password: string;
  }) => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  initializing: true,
  user: null,
  isLocalDemoSession: false,
  profile: null,
  refreshProfile: async () => {},
  authenticateForRole: async () => {},
  signOutUser: async () => {},
});

export async function findExistingUserDoc(uid: string, emailForDoc: string) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return { ref: userRef, data: snap.data() };
  }

  const rawEmail = String(emailForDoc || "").trim();
  const normalizedEmail = rawEmail.toLowerCase();
  if (!rawEmail) return null;

  for (const candidateEmail of [normalizedEmail, rawEmail]) {
    const emailQuery = query(
      collection(db, "users"),
      where("email", "==", candidateEmail),
      limit(1)
    );
    const emailSnap = await getDocs(emailQuery);
    if (!emailSnap.empty) {
      const matchedDoc = emailSnap.docs[0];
      return { ref: matchedDoc.ref, data: matchedDoc.data() };
    }
  }

  return null;
}

export async function ensureUserDocExists(
  uid: string,
  emailForDoc: string,
  requestedRole: Role
) {
  const userRef = doc(db, "users", uid);
  const existing = await findExistingUserDoc(uid, emailForDoc);

  if (existing) {
    if (existing.ref.id !== uid) {
      await setDoc(
        userRef,
        {
          ...existing.data,
          email:
            existing.data.email || String(emailForDoc || "").trim().toLowerCase(),
          requestedRole: existing.data.requestedRole || requestedRole || null,
          migratedFromDocId: existing.ref.id,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    return { id: uid, ...existing.data } as UserProfile;
  }

  await setDoc(userRef, {
    email: String(emailForDoc || "").trim().toLowerCase(),
    fullName: "",
    requestedRole,
    role: "pending",
    status: "pending",
    createdAt: serverTimestamp(),
  });

  return {
    id: uid,
    email: String(emailForDoc || "").trim().toLowerCase(),
    fullName: "",
    requestedRole,
    role: "pending",
    status: "pending",
  } as UserProfile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [demoSession, setDemoSession] = useState<DemoSession | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const user = useMemo<AuthSessionUser | null>(() => {
    if (demoSession) {
      return { uid: demoSession.uid, email: demoSession.email };
    }
    if (firebaseUser) {
      return { uid: firebaseUser.uid, email: firebaseUser.email };
    }
    return null;
  }, [demoSession, firebaseUser]);

  const isLocalDemoSession = demoSession !== null;

  const refreshProfile = useCallback(async () => {
    if (demoSession) {
      setProfile(demoSessionToProfile(demoSession));
      return;
    }
    if (!auth.currentUser) {
      setProfile(null);
      return;
    }

    const u = auth.currentUser;
    const snap = await getDoc(doc(db, "users", u.uid));
    if (snap.exists()) {
      setProfile({
        id: snap.id,
        ...(snap.data() as Omit<UserProfile, "id">),
      });
    } else {
      setProfile(null);
    }
  }, [demoSession]);

  useEffect(() => {
    if (demoSession) {
      setProfile(demoSessionToProfile(demoSession));
      setInitializing(false);
      return;
    }

    let unsubProfile: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, (nextUser) => {
      setFirebaseUser(nextUser);
      unsubProfile?.();

      if (!nextUser) {
        setProfile(null);
        setInitializing(false);
        return;
      }

      unsubProfile = onSnapshot(
        doc(db, "users", nextUser.uid),
        (snap) => {
          setProfile(
            snap.exists()
              ? ({ id: snap.id, ...(snap.data() as Omit<UserProfile, "id">) } as UserProfile)
              : null
          );
          setInitializing(false);
        },
        (error) => {
          console.error("Auth profile listener failed:", error);
          setProfile(null);
          setInitializing(false);
        }
      );
    });

    return () => {
      unsubAuth();
      unsubProfile?.();
    };
  }, [demoSession]);

  const authenticateForRole = useCallback<
    AuthContextValue["authenticateForRole"]
  >(async ({ role, mode, fullName, email, password }) => {
    const normalizedEmail = normalizeDemoEmail(email);

    if (!normalizedEmail || !password.trim()) {
      throw new Error("Please enter your email and password.");
    }

    try {
      if (isDemoAccountEmail(normalizedEmail)) {
        const session = assertDemoLocalLogin(normalizedEmail, password);
        try {
          await signOut(auth);
        } catch {
          /* no Firebase session or sign-out not needed */
        }
        setFirebaseUser(null);
        setDemoSession(session);
        setProfile(demoSessionToProfile(session));
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
        return;
      }

      if (mode === "signup") {
        if (!fullName?.trim()) {
          throw new Error("Please enter your full name.");
        }

        const userCred = await createUserWithEmailAndPassword(
          auth,
          normalizedEmail,
          password
        );

        await setDoc(doc(db, "users", userCred.user.uid), {
          email: normalizedEmail,
          fullName: fullName.trim(),
          requestedRole: role,
          role: "pending",
          status: "pending",
          createdAt: serverTimestamp(),
        });
      } else {
        const userCred = await signInWithEmailAndPassword(
          auth,
          normalizedEmail,
          password
        );
        await ensureUserDocExists(userCred.user.uid, normalizedEmail, role);
      }

      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );
    } catch (error) {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      );
      throw error;
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setDemoSession(null);
    try {
      await signOut(auth);
    } catch {
      /* already signed out */
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        initializing,
        user,
        isLocalDemoSession,
        profile,
        refreshProfile,
        authenticateForRole,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
