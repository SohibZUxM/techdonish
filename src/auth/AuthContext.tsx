import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
import { applyDemoBypass } from "../lib/demoBypass";
import { auth, db } from "../lib/firebase";
import type { Role, UserProfile } from "../types";

type AuthContextValue = {
  initializing: boolean;
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) {
      setProfile(null);
      return;
    }

    const u = auth.currentUser;
    const snap = await getDoc(doc(db, "users", u.uid));
    const raw = snap.exists()
      ? ({ id: snap.id, ...(snap.data() as Omit<UserProfile, "id">) } as UserProfile)
      : null;
    setProfile(applyDemoBypass(u.uid, u.email, raw));
  }, []);

  useEffect(() => {
    let unsubProfile: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setInitializing(false);
        return;
      }

      unsubProfile = onSnapshot(
        doc(db, "users", nextUser.uid),
        (snap) => {
          const raw = snap.exists()
            ? ({ id: snap.id, ...(snap.data() as Omit<UserProfile, "id">) } as UserProfile)
            : null;
          setProfile(applyDemoBypass(nextUser.uid, nextUser.email, raw));
          setInitializing(false);
        },
        (error) => {
          console.error("Auth profile listener failed:", error);
          // Demo accounts still work if Firestore rules block reads/writes.
          setProfile(
            applyDemoBypass(nextUser.uid, nextUser.email, null)
          );
          setInitializing(false);
        }
      );
    });

    return () => {
      unsubAuth();
      unsubProfile?.();
    };
  }, []);

  const authenticateForRole = useCallback<
    AuthContextValue["authenticateForRole"]
  >(async ({ role, mode, fullName, email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password.trim()) {
      throw new Error("Please enter your email and password.");
    }

    try {
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
    await signOut(auth);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        initializing,
        user,
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
