import React, { useEffect, useState } from "react";
import "./ParentPage.css";
import {
  FaTachometerAlt,
  FaUserFriends,
  FaClipboardCheck,
  FaBullhorn,
  FaSignOutAlt,
} from "react-icons/fa";
import { auth, db } from "./firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const ParentPage = () => {
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);
  const [parentProfile, setParentProfile] = useState({
    fullName: "Parent",
    email: "",
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) {
          navigate("/pending");
          return;
        }
        const data = snap.data();
        if (data.role !== "parent" || data.status !== "active") {
          navigate("/pending");
          return;
        }
        setParentProfile({
          fullName: data.fullName || "Parent",
          email: data.email || user.email || "",
        });
      } catch (e) {
        console.error("Parent profile load failed:", e);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/"); // back to home
  };

  if (!authReady) {
    return <div style={{ padding: 24, color: "#6b7280" }}>Loading...</div>;
  }

  return (
    <div className="pp-root">
      {/* ============ SIDEBAR ============ */}
      <aside className="pp-sidebar">

      {/* LOGO */}
      <div className="pp-logo">
        <div className="pp-logo-icon">🎓</div>
        <div className="pp-logo-text">
          <span className="pp-logo-title">Hamsafar</span>
          <span className="pp-logo-sub">Parent Portal</span>
        </div>
      </div>

        {/* NAVIGATION */}
        <nav className="pp-nav">

          <button className="pp-nav-item active">
            <FaTachometerAlt className="pp-nav-icon" />
            Dashboard
          </button>

          <button className="pp-nav-item">
            <FaUserFriends className="pp-nav-icon" />
            My Children
          </button>

          <button className="pp-nav-item">
            <FaClipboardCheck className="pp-nav-icon" />
            Attendance
          </button>

          <button className="pp-nav-item">
            <FaBullhorn className="pp-nav-icon" />
            Announcements
          </button>

        </nav>

          {/* USER + LOGOUT */}
          <div className="pp-sidebar-user">
            <img
              className="pp-sidebar-avatar"
              src="https://i.pravatar.cc/100?img=47"
              alt={parentProfile.fullName}
            />

            <div className="pp-user-info">
              <div className="pp-sidebar-name">{parentProfile.fullName}</div>
              <div className="pp-sidebar-role">Parent</div>
              {parentProfile.email ? (
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                  {parentProfile.email}
                </div>
              ) : null}
            </div>

            <FaSignOutAlt className="pp-logout-icon" onClick={handleLogout}/>
          </div>

</aside>

      {/* ============ MAIN ============ */}
      <main className="pp-main">
        <header className="pp-header">
          <div>
            <h1>Dashboard</h1>
            <p>Welcome back! Here’s what’s happening with your children.</p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Notifications */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                aria-label="Notifications"
                className="pp-header-icon-btn"
                onClick={() => setShowNotifications((p) => !p)}
              >
                🔔
              </button>
              {showNotifications && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "120%",
                    minWidth: 220,
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    boxShadow: "0 10px 25px rgba(15,23,42,0.12)",
                    padding: 12,
                    fontSize: 13,
                    color: "#4b5563",
                    zIndex: 30,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Notifications</div>
                  <div style={{ color: "#9ca3af" }}>No new notifications yet.</div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="pp-header-profile-btn"
                onClick={() => setShowProfileMenu((p) => !p)}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "999px",
                    background: "#4f46e5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    marginRight: 8,
                  }}
                >
                  {parentProfile.fullName?.[0] || "P"}
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{parentProfile.fullName}</div>
                  {parentProfile.email ? (
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>{parentProfile.email}</div>
                  ) : null}
                </div>
              </button>

              {showProfileMenu && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "120%",
                    minWidth: 180,
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    boxShadow: "0 10px 25px rgba(15,23,42,0.12)",
                    padding: 8,
                    fontSize: 13,
                    zIndex: 30,
                  }}
                >
                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 10px",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      borderRadius: 8,
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="pp-header-divider" />

        {/* ===== MY CHILDREN ===== */}
        <section className="pp-section">
          <h2 className="pp-section-title">My Children</h2>

          <div className="pp-children-row">
            {/* Child 1 */}
            <article className="pp-child-card">
              <div className="pp-child-top">
                <div className="pp-child-left">
                  <img
                    src="https://i.pravatar.cc/120?img=32"
                    alt="Alex Johnson"
                    className="pp-child-avatar"
                  />
                  <div>
                    <h3 className="pp-child-name">Alex Johnson</h3>
                    <p className="pp-child-sub">Grade 7 • Room 203</p>
                  </div>
                </div>
                <div className="pp-child-grade-badge">A-</div>
              </div>

              <div className="pp-child-meta-row">
                <span className="pp-child-label">Recent Grade</span>
              </div>

              <div className="pp-child-meta-row">
                <span className="pp-child-label">Attendance</span>
                <span className="pp-child-value">96%</span>
              </div>
              <div className="pp-progress">
                <div className="pp-progress-fill" style={{ width: "96%" }} />
              </div>
            </article>

            {/* Child 2 */}
            <article className="pp-child-card">
              <div className="pp-child-top">
                <div className="pp-child-left">
                  <img
                    src="https://i.pravatar.cc/120?img=5"
                    alt="Emma Johnson"
                    className="pp-child-avatar"
                  />
                  <div>
                    <h3 className="pp-child-name">Emma Johnson</h3>
                    <p className="pp-child-sub">Grade 5 • Room 105</p>
                  </div>
                </div>
                <div className="pp-child-grade-badge green">A</div>
              </div>

              <div className="pp-child-meta-row">
                <span className="pp-child-label">Recent Grade</span>
              </div>

              <div className="pp-child-meta-row">
                <span className="pp-child-label">Attendance</span>
                <span className="pp-child-value">98%</span>
              </div>
              <div className="pp-progress">
                <div className="pp-progress-fill" style={{ width: "98%" }} />
              </div>
            </article>

            {/* Child 3 */}
            <article className="pp-child-card">
              <div className="pp-child-top">
                <div className="pp-child-left">
                  <img
                    src="https://i.pravatar.cc/120?img=54"
                    alt="Michael Johnson"
                    className="pp-child-avatar"
                  />
                  <div>
                    <h3 className="pp-child-name">Michael Johnson</h3>
                    <p className="pp-child-sub">Grade 3 • Room 012</p>
                  </div>
                </div>
                <div className="pp-child-grade-badge orange">B+</div>
              </div>

              <div className="pp-child-meta-row">
                <span className="pp-child-label">Recent Grade</span>
              </div>

              <div className="pp-child-meta-row">
                <span className="pp-child-label">Attendance</span>
                <span className="pp-child-value">94%</span>
              </div>
              <div className="pp-progress">
                <div className="pp-progress-fill orange-fill" style={{ width: "94%" }} />
              </div>
            </article>
          </div>
        </section>

        {/* ===== BOTTOM GRID: CLASS SCORE + ANNOUNCEMENTS ===== */}
        <section className="pp-bottom-grid">
          {/* ---- CLASS SCORE OVERVIEW ---- */}
          <div>
            <h2 className="pp-section-title">Class Score Overview</h2>
            <div className="pp-class-grid">
              {/* Class card 1 */}
              <article className="pp-class-card">
                <p className="pp-class-title">Alex’s Class • Grade 7 / Room 203</p>
                <div className="pp-class-score-row">
                  <div>
                    <span className="pp-class-label">Overall Class Score</span>
                    <div className="pp-class-score-value">82%</div>
                  </div>
                  <div className="pp-class-tag">Avg Grade: B+</div>
                </div>
                <div className="pp-progress">
                  <div className="pp-progress-fill" style={{ width: "82%" }} />
                </div>
                <div className="pp-class-meta">
                  <span>Students: 24</span>
                  <span>Avg Attendance: 94%</span>
                </div>
              </article>

              {/* Class card 2 */}
              <article className="pp-class-card">
                <p className="pp-class-title">Emma’s Class • Grade 5 / Room 105</p>
                <div className="pp-class-score-row">
                  <div>
                    <span className="pp-class-label">Overall Class Score</span>
                    <div className="pp-class-score-value">88%</div>
                  </div>
                  <div className="pp-class-tag green-tag">Avg Grade: A-</div>
                </div>
                <div className="pp-progress">
                  <div className="pp-progress-fill" style={{ width: "88%" }} />
                </div>
                <div className="pp-class-meta">
                  <span>Students: 22</span>
                  <span>Avg Attendance: 96%</span>
                </div>
              </article>

              {/* Class card 3 */}
              <article className="pp-class-card">
                <p className="pp-class-title">Michael’s Class • Grade 3 / Room 012</p>
                <div className="pp-class-score-row">
                  <div>
                    <span className="pp-class-label">Overall Class Score</span>
                    <div className="pp-class-score-value">76%</div>
                  </div>
                  <div className="pp-class-tag orange-tag">Avg Grade: B</div>
                </div>
                <div className="pp-progress">
                  <div className="pp-progress-fill orange-fill" style={{ width: "76%" }} />
                </div>
                <div className="pp-class-meta">
                  <span>Students: 20</span>
                  <span>Avg Attendance: 91%</span>
                </div>
              </article>
            </div>
          </div>

          {/* ---- LATEST ANNOUNCEMENTS ---- */}
          <div>
            <div className="pp-ann-header">
              <h2 className="pp-section-title">Latest Announcements</h2>
              <button className="pp-view-all">View All</button>
            </div>

            <div className="pp-ann-list">
              <article className="pp-ann-item">
                <div className="pp-ann-icon purple" />
                <div>
                  <h3 className="pp-ann-title">Parent-Teacher Conference</h3>
                  <p className="pp-ann-text">
                    Scheduled for next week. Please confirm your attendance.
                  </p>
                  <span className="pp-ann-time">2 hours ago</span>
                </div>
              </article>

              <article className="pp-ann-item">
                <div className="pp-ann-icon yellow" />
                <div>
                  <h3 className="pp-ann-title">School Closure Notice</h3>
                  <p className="pp-ann-text">
                    School will be closed on Friday due to maintenance.
                  </p>
                  <span className="pp-ann-time">1 day ago</span>
                </div>
              </article>

              <article className="pp-ann-item">
                <div className="pp-ann-icon green" />
                <div>
                  <h3 className="pp-ann-title">Science Fair Results</h3>
                  <p className="pp-ann-text">
                    Congratulations to all participants in this year&apos;s science fair!
                  </p>
                  <span className="pp-ann-time">3 days ago</span>
                </div>
              </article>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ParentPage;
