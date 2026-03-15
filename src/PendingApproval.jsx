import React from "react";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function PendingApproval() {
  const navigate = useNavigate();

  const logout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ maxWidth: 520, width: "100%", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 22 }}>
        <h2 style={{ marginTop: 0 }}>Account pending approval</h2>
        <p style={{ color: "#6b7280", lineHeight: 1.6 }}>
          Your account has been created, but access is not granted yet.
          Please contact the school admin to approve your account.
        </p>

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button onClick={() => navigate("/")} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb" }}>
            Back to Home
          </button>
          <button onClick={logout} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #111827", background: "#111827", color: "#fff" }}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
