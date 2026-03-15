// src/PortalLogin.jsx
import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import "./PortalLogin.css";

import { auth, db } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  serverTimestamp,
  where,
} from "firebase/firestore";

const ROLE_LABELS = {
  student: "Student Portal",
  teacher: "Teacher Portal",
  parent: "Parent Portal",
  admin: "Admin Portal",
};

const PUBLIC_DEMO_CREDENTIALS = {
  student: {
    email: "demonstudent@gmail.com",
    password: "demo1234",
    description: "Explore the student dashboard with sample coursework and progress.",
  },
  teacher: {
    email: "demoteacher@gmail.com",
    password: "demo1234",
    description: "Review the teacher dashboard with demo classes, grades, and resources.",
  },
};

const isFirestoreOfflineError = (err) => {
  const message = String(err?.message || "");
  return err?.code === "unavailable" || /client is offline|offline/i.test(message);
};

export default function PortalLogin() {
  const { role } = useParams(); // "student" | "teacher" | "parent" | "admin"
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // "login" or "signup"
  const [fullName, setFullName] = useState(""); // ✅ added
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const roleLabel = ROLE_LABELS[role] || "Access Portal";
  const niceRole =
    role && ROLE_LABELS[role] ? ROLE_LABELS[role].split(" ")[0] : "";
  const demoCredentials = PUBLIC_DEMO_CREDENTIALS[role] || null;

  const isLogin = mode === "login";
  const urlRole = role; // role from URL (portal)

  const goToDashboard = (targetRole) => {
    if (targetRole === "student") navigate("/student");
    else if (targetRole === "teacher") navigate("/teacher");
    else if (targetRole === "parent") navigate("/parent");
    else if (targetRole === "admin") navigate("/admin");
    else navigate("/pending");
  };

  const findExistingUserDoc = async (uid, emailForDoc) => {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return { ref: userRef, data: snap.data() };
    }

    const rawEmail = String(emailForDoc || "").trim();
    const normalizedEmail = rawEmail.toLowerCase();
    if (!rawEmail) {
      return null;
    }

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
  };

  // Make sure a users/{uid} doc exists, then return the latest profile data.
  const ensureUserDocExists = async (uid, emailForDoc, requestedRole) => {
    const userRef = doc(db, "users", uid);
    const existing = await findExistingUserDoc(uid, emailForDoc);
    if (existing) {
      if (existing.ref.id !== uid) {
        await setDoc(
          userRef,
          {
            ...existing.data,
            email: existing.data.email || String(emailForDoc || "").trim().toLowerCase(),
            requestedRole: existing.data.requestedRole || requestedRole || null,
            migratedFromDocId: existing.ref.id,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        return {
          ...existing.data,
          email:
            existing.data.email || String(emailForDoc || "").trim().toLowerCase(),
          requestedRole: existing.data.requestedRole || requestedRole || null,
          migratedFromDocId: existing.ref.id,
        };
      }

      return existing.data;
    }

    await setDoc(userRef, {
      email: String(emailForDoc || "").trim().toLowerCase(),
      fullName: "",
      requestedRole: requestedRole || null,
      role: "pending",
      status: "pending",
      createdAt: serverTimestamp(),
    });

    return {
      email: String(emailForDoc || "").trim().toLowerCase(),
      fullName: "",
      requestedRole: requestedRole || null,
      role: "pending",
      status: "pending",
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!urlRole) {
        setError("Invalid portal link. Please go back and select your role.");
        return;
      }

      if (mode === "signup") {
        // ========== SIGN UP FLOW ==========
        if (!fullName.trim()) {
          setError("Please enter your full name.");
          return;
        }

        const userCred = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const uid = userCred.user.uid;

        // Requested role = the portal the user signed up from
        await setDoc(doc(db, "users", uid), {
          email,
          fullName: fullName.trim(),
          requestedRole: urlRole,
          role: "pending",
          status: "pending",
          createdAt: serverTimestamp(),
        });

        // ✅ Pending users should NOT go to dashboard
        navigate("/pending");
        return;
      }

      // ========== LOGIN FLOW ==========
      const normalizedEmail = email.trim().toLowerCase();
      const userCred = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      );

      let profile = null;
      try {
        profile = await ensureUserDocExists(
          userCred.user.uid,
          normalizedEmail,
          urlRole
        );
      } catch (profileErr) {
        // If auth succeeded but Firestore is temporarily offline, let the portal
        // load first and allow the destination page to recover from cache/reconnect.
        if (isFirestoreOfflineError(profileErr)) {
          goToDashboard(urlRole);
          return;
        }
        throw profileErr;
      }

      if (!profile || profile.status !== "active") {
        navigate("/pending");
        return;
      }

      goToDashboard(profile.role || urlRole);
    } catch (err) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists.");
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak. Try at least 6 characters.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password. Please try again.");
      } else if (err.code === "auth/user-not-found") {
        setError("No account found with this email.");
      } else {
        setError("Something went wrong: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-login-page">
      <div className="portal-login-card">
        <div className="portal-role-pill">{roleLabel}</div>

        <div className="portal-login-logo">
          <div className="portal-logo-badge">H</div>
        </div>

        <h2 className="portal-app-name">Hamsafar</h2>

        <h1 className="portal-welcome-title">
          {isLogin
            ? `Welcome back${niceRole ? `, ${niceRole}` : ""}`
            : `Create your ${niceRole || ""} account`}
        </h1>
        <p className="portal-welcome-subtitle">
          {isLogin
            ? "Please sign in to your account"
            : "Fill in your details to get started"}
        </p>

        {isLogin && demoCredentials && (
          <div className="portal-demo-card">
            <div className="portal-demo-header">
              <div>
                <p className="portal-demo-eyebrow">Demo Access</p>
                <h3 className="portal-demo-title">{niceRole} Demo Account</h3>
              </div>
              <button
                type="button"
                className="portal-demo-button"
                onClick={() => {
                  setEmail(demoCredentials.email);
                  setPassword(demoCredentials.password);
                  setError("");
                }}
              >
                Use demo account
              </button>
            </div>
            <p className="portal-demo-description">{demoCredentials.description}</p>
            <div className="portal-demo-credentials">
              <div className="portal-demo-row">
                <span className="portal-demo-label">Email</span>
                <code>{demoCredentials.email}</code>
              </div>
              <div className="portal-demo-row">
                <span className="portal-demo-label">Password</span>
                <code>{demoCredentials.password}</code>
              </div>
            </div>
          </div>
        )}

        {error && <p className="portal-error-text">{error}</p>}

        <form className="portal-form" onSubmit={handleSubmit}>
          {/* ✅ Full Name only for signup */}
          {!isLogin && (
            <>
              <label className="portal-field-label">Full Name</label>
              <div className="portal-input-wrapper">
                <span className="portal-input-icon">👤</span>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  className="portal-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <label className="portal-field-label">Email address</label>
          <div className="portal-input-wrapper">
            <span className="portal-input-icon">✉️</span>
            <input
              type="email"
              placeholder="Enter your email"
              className="portal-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <label className="portal-field-label">Password</label>
          <div className="portal-input-wrapper">
            <span className="portal-input-icon">🔒</span>
            <input
              type="password"
              placeholder={isLogin ? "Enter your password" : "Create a password"}
              className="portal-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="portal-input-icon-button"
              aria-label="Toggle password visibility"
            >
              👁
            </button>
          </div>

          {isLogin && (
            <div className="portal-forgot-row">
              <button type="button" className="portal-link-button">
                Forgot your password?
              </button>
            </div>
          )}

          <button
            type="submit"
            className="portal-primary-button"
            disabled={loading}
          >
            {loading
              ? isLogin
                ? "Signing in..."
                : "Creating account..."
              : isLogin
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <div className="portal-divider">
          <span className="portal-divider-line" />
          <span className="portal-divider-text">Or continue with</span>
          <span className="portal-divider-line" />
        </div>

        <div className="portal-social-stack">
          <button type="button" className="portal-social-button">
            <span className="portal-social-icon">G</span>
            <span>Continue with Google</span>
          </button>
          <button type="button" className="portal-social-button">
            <span className="portal-social-icon">🐙</span>
            <span>Continue with GitHub</span>
          </button>
        </div>

        <p className="portal-bottom-text">
          {isLogin ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                className="portal-link-button"
                onClick={() => {
                  setMode("signup");
                  setError("");
                }}
              >
                Sign up for free
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                className="portal-link-button"
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>

      <div className="portal-footer-links">
        <Link to="#" className="portal-footer-link">
          Terms of Service
        </Link>
        <Link to="#" className="portal-footer-link">
          Privacy Policy
        </Link>
        <Link to="#" className="portal-footer-link">
          Help
        </Link>
      </div>
    </div>
  );
}
