// src/StudentPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./StudentPage.css";
import { auth, db } from "./firebase";
import { collection, doc, query, where, onSnapshot } from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import useRealtimeList from "./useRealtimeList";
import useRealtimeDocsByIds from "./useRealtimeDocsByIds";
import useRealtimeWhereIn from "./useRealtimeWhereIn";

/** ========= helpers ========= */
const safePercent = (score, maxScore) => {
  const max = Number(maxScore || 100);
  const sc = Number(score || 0);
  if (!max || Number.isNaN(max) || Number.isNaN(sc)) return null;
  return (sc / max) * 100;
};

export default function StudentPage() {
  const navigate = useNavigate();

  // ✅ functional tabs
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard|courses|classes|grades|schedule|resources
  const [showAllGrades, setShowAllGrades] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // auth + profile
  const [uid, setUid] = useState(null);
  const [profile, setProfile] = useState({
    fullName: "Student",
    email: "",
  });

  /** ========= auth guard + realtime profile ========= */
  useEffect(() => {
    let unsubProfile = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setUid(null);
        setProfile({ fullName: "Student", email: "" });
        if (unsubProfile) unsubProfile();
        navigate("/");
        return;
      }

      setUid(user.uid);

      if (unsubProfile) unsubProfile();
      unsubProfile = onSnapshot(
        doc(db, "users", user.uid),
        (snap) => {
          if (!snap.exists()) {
            // No profile doc yet – safe default is to show pending screen.
            navigate("/pending");
            return;
          }
          const data = snap.data();

          // Enforce that only active students stay on this page.
          if (data.status !== "active" || data.role !== "student") {
            navigate("/pending");
            return;
          }

          setProfile({
            fullName: data.fullName || "Student",
            email: data.email || user.email || "",
          });
        },
        (err) => console.error("Profile listener error:", err)
      );
    });

    return () => {
      if (unsubProfile) unsubProfile();
      unsubAuth();
    };
  }, [navigate]);

  // nice UX: go top when switching tabs
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  /** ========= enrollments (realtime) ========= */
  const enrollments = useRealtimeList(
    () => query(collection(db, "enrollments"), where("studentUid", "==", uid)),
    [uid],
    !!uid
  );

  const classIds = useMemo(
    () => [...new Set(enrollments.map((e) => e.classId).filter(Boolean))],
    [enrollments]
  );

  /** ========= classes + courses (realtime)
   * Performance: only subscribe to the student's enrolled classes/courses,
   * instead of listening to entire collections.
   */
  const myClasses = useRealtimeDocsByIds("classes", classIds, classIds.length > 0);

  const myCourseIds = useMemo(
    () => [...new Set(myClasses.map((c) => c.courseId).filter(Boolean))],
    [myClasses]
  );

  const myCourses = useRealtimeDocsByIds("courses", myCourseIds, myCourseIds.length > 0);

  const coursesById = useMemo(() => {
    const m = new Map();
    myCourses.forEach((c) => m.set(c.id, c));
    return m;
  }, [myCourses]);

  const getCourseName = (courseId) => coursesById.get(courseId)?.name || "—";

  /** ========= grades (realtime) ========= */
  const gradesRaw = useRealtimeList(
    () => query(collection(db, "grades"), where("studentUid", "==", uid)),
    [uid],
    !!uid
  );

  const grades = useMemo(() => {
    return gradesRaw
      .map((g) => ({ ...g, percent: safePercent(g.score, g.maxScore) }))
      .sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() || 0;
        const tb = b.createdAt?.toMillis?.() || 0;
        return tb - ta;
      });
  }, [gradesRaw]);

  const examCount = grades.length;

  const avgPercent = useMemo(() => {
    let sum = 0;
    let cnt = 0;
    for (const g of grades) {
      if (typeof g.percent === "number" && !Number.isNaN(g.percent)) {
        sum += g.percent;
        cnt += 1;
      }
    }
    return cnt > 0 ? Math.round(sum / cnt) : null;
  }, [grades]);

  /** ========= schedule: class sessions for student's enrolled classes ========= */
  const sessionsRaw = useRealtimeWhereIn(
    "classSessions",
    "classId",
    classIds,
    classIds.length > 0
  );

  const mySessions = useMemo(() => {
    return [...sessionsRaw].sort((a, b) => {
      const ta = a.startsAt?.toMillis?.() || 0;
      const tb = b.startsAt?.toMillis?.() || 0;
      return ta - tb;
    });
  }, [sessionsRaw]);

  /** ========= resources: files/links for student's enrolled classes ========= */
  const resourcesRaw = useRealtimeWhereIn(
    "resources",
    "classId",
    classIds,
    classIds.length > 0
  );

  const myResources = useMemo(() => {
    return [...resourcesRaw].sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() || 0;
      const tb = b.createdAt?.toMillis?.() || 0;
      return tb - ta;
    });
  }, [resourcesRaw]);

  /** ========= grade color helper ========= */
  const gradeColorClass = (percent) => {
    if (typeof percent !== "number" || Number.isNaN(percent)) return "grade-na";
    if (percent >= 90) return "grade-a";
    if (percent >= 75) return "grade-b";
    if (percent >= 60) return "grade-c";
    if (percent >= 50) return "grade-d";
    return "grade-f";
  };

  /** ========= counters ========= */
  const counters = useMemo(() => {
    return {
      activeCourses: myCourses.length,
      enrolledClasses: myClasses.length,
      gradesRecorded: examCount,
      avgPercent,
    };
  }, [myCourses.length, myClasses.length, examCount, avgPercent]);

  const pageTitle =
    activeTab === "dashboard"
      ? "Dashboard"
      : activeTab === "courses"
        ? "My Courses"
        : activeTab === "classes"
          ? "My Classes"
          : activeTab === "grades"
            ? "Grades"
            : activeTab === "schedule"
              ? "Schedule"
              : "Resources";

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="sp-root">
      <button className="sp-help-btn">?</button>

      {/* ================= HEADER ================= */}
      <header className="sp-topbar">
        <div className="sp-topbar-inner">
          {/* Header Left */}
          <div className="sp-header-left">
            <div className="sp-logo">
              <div className="sp-logo-icon">🎓</div>
              <span>Hamsafar</span>
            </div>

            <div className="sp-search">
              <span className="sp-search-icon">🔍</span>
              <input type="text" placeholder="Search courses, assignments, resources..." />
            </div>
          </div>

          {/* Header Right */}
          <div className="sp-topbar-right">
            {/* Notifications */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="sp-bell"
                onClick={() => setShowNotifications((p) => !p)}
              >
                🔔
                <span className="sp-bell-badge">3</span>
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
                className="sp-profile"
                onClick={() => setShowProfileMenu((p) => !p)}
              >
                <div className="sp-avatar" />
                <div className="sp-profile-info">
                  <div className="sp-profile-name">{profile.fullName}</div>
                  <div className="sp-profile-sub">{profile.email}</div>
                </div>
                <span className="sp-profile-arrow">▾</span>
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
        </div>
      </header>

      {/* ================= SIDEBAR ================= */}
      <aside className="sp-sidebar">
        <div className="sp-nav-wrapper">
          <nav className="sp-nav">
            <button
              type="button"
              className={`sp-nav-item ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => setActiveTab("dashboard")}
            >
              🏠 Dashboard
            </button>

            <button
              type="button"
              className={`sp-nav-item ${activeTab === "courses" ? "active" : ""}`}
              onClick={() => setActiveTab("courses")}
            >
              📚 My Courses
            </button>

            <button
              type="button"
              className={`sp-nav-item ${activeTab === "classes" ? "active" : ""}`}
              onClick={() => setActiveTab("classes")}
            >
              🏫 My Classes
            </button>

            <button
              type="button"
              className={`sp-nav-item ${activeTab === "grades" ? "active" : ""}`}
              onClick={() => setActiveTab("grades")}
            >
              📊 Grades
            </button>

            {/* not wired yet */}
            <button
              type="button"
              className={`sp-nav-item ${activeTab === "schedule" ? "active" : ""}`}
              onClick={() => setActiveTab("schedule")}
            >
              📅 Schedule
            </button>
            <button
              type="button"
              className={`sp-nav-item ${activeTab === "resources" ? "active" : ""}`}
              onClick={() => setActiveTab("resources")}
            >
              📁 Resources
            </button>
          </nav>
        </div>

        <div className="sp-sidebar-divider"></div>

        <div className="sp-sidebar-bottom">
          <button type="button" className="sp-nav-item small">
            ⚙️ Settings
          </button>
          <button type="button" className="sp-nav-item small" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* ================= MAIN AREA ================= */}
      <main className="sp-main">
        <div className="sp-content">
          {/* PAGE HEADER / TITLE */}
          <section className="sp-welcome">
            <h1>{pageTitle}</h1>
            <p>
              {activeTab === "dashboard" &&
                `Welcome back, ${profile.fullName.split(" ")[0] || "Student"}! 👋`}
              {activeTab === "courses" && "Courses you are enrolled in (derived from your classes)."}
              {activeTab === "classes" && "Your enrolled classes with course + teacher information."}
              {activeTab === "grades" && "Your grades updated in real-time."}
              {activeTab === "schedule" && "Upcoming class sessions created by your teachers."}
              {activeTab === "resources" && "Learning resources shared for your enrolled classes."}
            </p>
          </section>

          {/* ================= DASHBOARD VIEW ================= */}
          {activeTab === "dashboard" && (
            <>
              <section className="sp-stats">
                <div className="sp-stat-card">
                  <div className="sp-stat-icon blue">📘</div>
                  <div className="sp-stat-number">{counters.activeCourses}</div>
                  <div className="sp-stat-label">Active Courses</div>
                </div>

                <div className="sp-stat-card">
                  <div className="sp-stat-icon green">🏫</div>
                  <div className="sp-stat-number">{counters.enrolledClasses}</div>
                  <div className="sp-stat-label">Enrolled Classes</div>
                </div>

                <div className="sp-stat-card">
                  <div className="sp-stat-icon purple">📝</div>
                  <div className="sp-stat-number">{counters.gradesRecorded}</div>
                  <div className="sp-stat-label">Grades Recorded</div>
                </div>

                <div className="sp-stat-card">
                  <div className="sp-stat-icon orange">📈</div>
                  <div className="sp-stat-number">
                    {counters.avgPercent == null ? "—" : `${counters.avgPercent}%`}
                  </div>
                  <div className="sp-stat-label">Average Score</div>
                </div>
              </section>

              {/* Dashboard preview: courses */}
              <div className="sp-box">
                <div className="sp-box-header">
                  <h2>My Courses (Preview)</h2>
                  <button type="button" className="sp-link-button" onClick={() => setActiveTab("courses")}>
                    View All
                  </button>
                </div>

                <div className="sp-section-divider"></div>

                {myCourses.length === 0 ? (
                  <p className="sp-muted">You are not enrolled in any course yet.</p>
                ) : (
                  myCourses.slice(0, 3).map((c) => {
                    const classCount = myClasses.filter((cl) => cl.courseId === c.id).length;
                    return (
                      <div key={c.id} className="sp-course-item">
                        <div className="sp-course-left">
                          <div className="sp-course-icon">📚</div>
                          <div style={{ minWidth: 0 }}>
                            <div className="sp-course-title">{c.name}</div>
                            <div className="sp-course-sub">
                              Code: {c.code} • Classes: {classCount}
                            </div>
                          </div>
                        </div>
                        <div className="sp-course-right">
                          <span className="sp-course-chip">Enrolled</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Dashboard preview: classes */}
              <div className="sp-box">
                <div className="sp-box-header">
                  <h2>My Classes (Preview)</h2>
                  <button type="button" className="sp-link-button" onClick={() => setActiveTab("classes")}>
                    View All
                  </button>
                </div>

                <div className="sp-section-divider"></div>

                {myClasses.length === 0 ? (
                  <p className="sp-muted">You are not enrolled in any class yet.</p>
                ) : (
                  myClasses.slice(0, 3).map((cl) => (
                    <div key={cl.id} className="sp-grade-item border-blue">
                      <div className="sp-grade-left">
                        <div className="sp-grade-icon bg-blue">🏫</div>
                        <div>
                          <h3>{cl.name}</h3>
                          <p>
                            Course: {getCourseName(cl.courseId)} • Teacher:{" "}
                            {cl.teacherName || "Not assigned"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Dashboard preview: grades */}
              <div className="sp-box">
                <div className="sp-box-header">
                  <h2>Recent Grades</h2>
                  <button
                    type="button"
                    className="sp-link-button"
                    onClick={() => setActiveTab("grades")}
                    disabled={grades.length === 0}
                  >
                    View All
                  </button>
                </div>

                <div className="sp-section-divider"></div>

                {grades.length === 0 ? (
                  <p className="sp-muted">No grades recorded yet.</p>
                ) : (
                  grades.slice(0, 4).map((g) => (
                    <div key={g.id} className="sp-grade-item border-blue">
                      <div className="sp-grade-left">
                        <div className="sp-grade-icon bg-blue">📘</div>
                        <div>
                          <h3>{g.label || "Grade"}</h3>
                          <p>
                            Class:{" "}
                            {myClasses.find((c) => c.id === g.classId)?.name ||
                              g.classId ||
                              "—"}
                          </p>
                        </div>
                      </div>
                      <div className="sp-grade-right">
                        <span className={`sp-grade-letter ${gradeColorClass(g.percent)}`}>
                          {typeof g.percent === "number" ? `${Math.round(g.percent)}%` : "—"}
                        </span>
                        <span className="sp-grade-score">
                          {g.score}/{g.maxScore || 100}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* ================= COURSES VIEW ================= */}
          {activeTab === "courses" && (
            <div className="sp-box">
              <div className="sp-box-header">
                <h2>My Courses</h2>
              </div>

              <div className="sp-section-divider"></div>

              {myCourses.length === 0 ? (
                <p className="sp-muted">You are not enrolled in any course yet.</p>
              ) : (
                myCourses.map((c) => {
                  const classesInCourse = myClasses.filter((cl) => cl.courseId === c.id);
                  const teacherNames = [
                    ...new Set(
                      classesInCourse
                        .map((cl) => cl.teacherName)
                        .filter(Boolean)
                    ),
                  ];
                  return (
                    <div key={c.id} className="sp-course-item">
                      <div className="sp-course-left">
                        <div className="sp-course-icon">📚</div>
                        <div style={{ minWidth: 0 }}>
                          <div className="sp-course-title">{c.name}</div>
                          <div className="sp-course-sub">
                            Code: {c.code} • Classes: {classesInCourse.length}
                            {teacherNames.length > 0 ? ` • Teacher: ${teacherNames.join(", ")}` : ""}
                          </div>
                        </div>
                      </div>

                      <div className="sp-course-right">
                        <span className="sp-course-chip">Enrolled</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ================= CLASSES VIEW ================= */}
          {activeTab === "classes" && (
            <div className="sp-box">
              <div className="sp-box-header">
                <h2>My Classes</h2>
              </div>

              <div className="sp-section-divider"></div>

              {myClasses.length === 0 ? (
                <p className="sp-muted">You are not enrolled in any class yet.</p>
              ) : (
                myClasses.map((cl) => (
                  <div key={cl.id} className="sp-grade-item border-blue">
                    <div className="sp-grade-left">
                      <div className="sp-grade-icon bg-blue">🏫</div>
                      <div>
                        <h3>{cl.name}</h3>
                        <p>
                          Course: {getCourseName(cl.courseId)} • Teacher:{" "}
                          {cl.teacherName || "Not assigned"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ================= GRADES VIEW ================= */}
          {activeTab === "grades" && (
            <div className="sp-box">
              <div className="sp-box-header">
                <h2>Grades</h2>
                <button
                  type="button"
                  className="sp-link-button"
                  onClick={() => setShowAllGrades((p) => !p)}
                  disabled={grades.length === 0}
                >
                  {showAllGrades ? "Show Less" : "View All"}
                </button>
              </div>

              <div className="sp-section-divider"></div>

              <div
                style={{
                  display: "flex",
                  gap: 14,
                  marginBottom: 10,
                  color: "#6b7280",
                  fontSize: 13,
                }}
              >
                <div>
                  Recorded: <b>{examCount}</b>
                </div>
                <div>
                  Average: <b>{avgPercent == null ? "—" : `${avgPercent}%`}</b>
                </div>
              </div>

              {grades.length === 0 ? (
                <p className="sp-muted">No grades recorded yet.</p>
              ) : (
                (showAllGrades ? grades : grades.slice(0, 8)).map((g) => {
                  const cls = myClasses.find((c) => c.id === g.classId);
                  return (
                    <div key={g.id} className="sp-grade-item border-blue">
                      <div className="sp-grade-left">
                        <div className="sp-grade-icon bg-blue">📘</div>
                        <div>
                          <h3>{g.label || "Grade"}</h3>
                          <p>
                            Class: {cls?.name || g.classId || "—"} • Course:{" "}
                            {getCourseName(cls?.courseId)}
                          </p>
                        </div>
                      </div>

                      <div className="sp-grade-right">
                        <span className={`sp-grade-letter ${gradeColorClass(g.percent)}`}>
                          {typeof g.percent === "number" ? `${Math.round(g.percent)}%` : "—"}
                        </span>
                        <span className="sp-grade-score">
                          {g.score}/{g.maxScore || 100}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ================= SCHEDULE VIEW ================= */}
          {activeTab === "schedule" && (
            <div className="sp-box">
              <div className="sp-box-header">
                <h2>Schedule</h2>
              </div>
              <div className="sp-section-divider"></div>
              {mySessions.length === 0 ? (
                <p className="sp-muted">No class sessions scheduled yet. Your teachers will add sessions here.</p>
              ) : (
                mySessions.map((s) => {
                  const cls = myClasses.find((c) => c.id === s.classId);
                  const toDate = (ts) => {
                    if (!ts) return null;
                    const d = ts?.toDate ? ts.toDate() : new Date(ts);
                    return Number.isNaN(d.getTime()) ? null : d;
                  };
                  const startDate = toDate(s.startsAt);
                  const endDate = toDate(s.endsAt);
                  const fmt = (d) =>
                    d ? d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—";
                  return (
                    <div key={s.id} className="sp-grade-item border-blue">
                      <div className="sp-grade-left">
                        <div className="sp-grade-icon bg-blue">📅</div>
                        <div>
                          <h3>{cls?.name || s.classId || "Class"}</h3>
                          <p>
                            {fmt(startDate)}
                            {endDate ? ` → ${fmt(endDate)}` : ""}
                            {s.location ? ` • ${s.location}` : ""}
                          </p>
                          {s.note && (
                            <p style={{ fontStyle: "italic", color: "#6b7280", marginTop: 2 }}>{s.note}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ================= RESOURCES VIEW ================= */}
          {activeTab === "resources" && (
            <div className="sp-box">
              <div className="sp-box-header">
                <h2>Resources</h2>
              </div>
              <div className="sp-section-divider"></div>
              {myResources.length === 0 ? (
                <p className="sp-muted">No resources shared yet. Your teachers will add links and files here.</p>
              ) : (
                myResources.map((r) => {
                  const cls = myClasses.find((c) => c.id === r.classId);
                  return (
                    <div key={r.id} className="sp-grade-item border-blue">
                      <div className="sp-grade-left">
                        <div className="sp-grade-icon bg-blue">📁</div>
                        <div>
                          <h3>{r.title}</h3>
                          <p>
                            Class: {cls?.name || r.classId || "—"}
                            {r.description ? ` • ${r.description}` : ""}
                          </p>
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#2563eb", textDecoration: "underline", fontSize: 13 }}
                          >
                            {r.url}
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
