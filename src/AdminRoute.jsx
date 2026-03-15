import React, { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function AdminRoute({ children }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/portal/admin");
        return;
      }

      const snap = await getDoc(doc(db, "users", user.uid));
      const role = snap.exists() ? snap.data().role : null;

      if (role !== "admin") {
        navigate("/");
        return;
      }

      setLoading(false);
    });

    return () => unsub();
  }, [navigate]);

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  return children;
}
