// src/AdminPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminPage.css";

import {
  Bell,Settings,LayoutDashboard,BookOpen,ClipboardList,GraduationCap,Users,
  UserRound,UserRoundCog,School,Plus,Monitor,X,LogOut,
} from "lucide-react";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth } from "./firebase";

import {
  collection,doc,updateDoc,addDoc,setDoc,getDoc,getDocs,deleteDoc,
  serverTimestamp,query,orderBy,where,limit,writeBatch,arrayUnion,arrayRemove,
} from "firebase/firestore";
import useRealtimeList from "./useRealtimeList";

export default function AdminPage() {
  const navigate = useNavigate();

  // ========== UI STATE ==========
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard|courses|classes|students|teachers|parents
  const [modal, setModal] = useState(null); // course|class|enroll|assignTeacher|linkParentChild|null
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [parentLinkTarget, setParentLinkTarget] = useState("");

  // ========== PROFILE ==========
  const [adminProfile, setAdminProfile] = useState({
    fullName: "Admin",
    email: "",
    role: "",
    status: "",
  });

  // ========== REALTIME DATA ==========
  const courses = useRealtimeList(
    () => query(collection(db, "courses"), orderBy("createdAt", "desc")),
    []
  );

  const classes = useRealtimeList(
    () => query(collection(db, "classes"), orderBy("createdAt", "desc")),
    []
  );

  const pendingUsers = useRealtimeList(
    () => query(collection(db, "users"), where("status", "==", "pending")),
    []
  );

  const activeStudents = useRealtimeList(
    () =>
      query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("status", "==", "active")
      ),
    []
  );

  const activeTeachers = useRealtimeList(
    () =>
      query(
        collection(db, "users"),
        where("role", "==", "teacher"),
        where("status", "==", "active")
      ),
    []
  );

  const activeParents = useRealtimeList(
    () =>
      query(
        collection(db, "users"),
        where("role", "==", "parent"),
        where("status", "==", "active")
      ),
    []
  );

  const enrollments = useRealtimeList(
    () => query(collection(db, "enrollments"), orderBy("createdAt", "desc")),
    []
  );

  const activity = useRealtimeList(
    () =>
      query(
        collection(db, "adminActivity"),
        orderBy("createdAt", "desc"),
        limit(6)
      ),
    []
  );

  // ========== HELPERS ==========
  const closeModal = () => setModal(null);

  const getCourseName = useCallback(
    (courseId) => courses.find((c) => c.id === courseId)?.name || "—",
    [courses]
  );

  const getClassName = useCallback(
    (classId) => {
      const cls = classes.find((c) => c.id === classId);
      return cls?.name || cls?.code || "Class";
    },
    [classes]
  );

  const getUserLabel = useCallback((list, uid) => {
    const u = list.find((x) => x.id === uid);
    return u?.fullName || u?.email || "Unknown";
  }, []);

  const getParentChildIds = useCallback((parent) => {
    if (Array.isArray(parent?.childStudentIds)) {
      return [...new Set(parent.childStudentIds.filter(Boolean).map(String))];
    }
    if (Array.isArray(parent?.children)) {
      return [
        ...new Set(
          parent.children
            .map((child) =>
              typeof child === "string"
                ? child
                : child?.studentUid || child?.uid || child?.id || null
            )
            .filter(Boolean)
            .map(String)
        ),
      ];
    }
    return [];
  }, []);

  const writeActivity = useCallback(async (dot, text) => {
    await addDoc(collection(db, "adminActivity"), {
      dot,
      text,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser?.uid || null,
    });
  }, []);

  // ========== AUTH GUARD + LOAD ADMIN PROFILE ==========
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) {
          await signOut(auth);
          navigate("/");
          return;
        }

        const data = snap.data();
        if (data.role !== "admin" || data.status !== "active") {
          await signOut(auth);
          navigate("/");
          return;
        }

        setAdminProfile({
          fullName: data.fullName || "Admin",
          email: data.email || user.email || "",
          role: data.role || "",
          status: data.status || "",
        });
      } catch (e) {
        console.error("Failed to load admin profile:", e);
      }
    });

    return () => unsub();
  }, [navigate]);

  // ========== ACTIONS (TOP STATS + QUICK) ==========
  const stats = useMemo(
    () => [
      {
        title: "Total Courses",
        value: String(courses.length),
        icon: <BookOpen size={18} />,
        chipClass: "ap-chip ap-chip-blue",
      },
      {
        title: "Active Classes",
        value: String(classes.length),
        icon: <Monitor size={18} />,
        chipClass: "ap-chip ap-chip-green",
      },
      {
        title: "Teachers",
        value: String(activeTeachers.length),
        icon: <UserRoundCog size={18} />,
        chipClass: "ap-chip ap-chip-purple",
      },
      {
        title: "Students",
        value: String(activeStudents.length),
        icon: <GraduationCap size={18} />,
        chipClass: "ap-chip ap-chip-orange",
      },
    ],
    [courses.length, classes.length, activeTeachers.length, activeStudents.length]
  );

  const actions = useMemo(
    () => [
      {
        label: "Add Course",
        onClick: () => setModal("course"),
        className: "ap-action ap-action-blue",
      },
      {
        label: "Add Class",
        onClick: () => setModal("class"),
        className: "ap-action ap-action-green",
      },
      {
        label: "Enroll Student",
        onClick: () => setModal("enroll"),
        className: "ap-action ap-action-orange",
      },
      {
        label: "Assign Teacher",
        onClick: () => setModal("assignTeacher"),
        className: "ap-action ap-action-purple",
      },
    ],
    []
  );

  // ========== HANDLERS ==========
  const handleAdminLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const approveUser = async (uid, newRole) => {
    await updateDoc(doc(db, "users", uid), {
      role: newRole,
      status: "active",
      approvedAt: serverTimestamp(),
      approvedBy: auth.currentUser?.uid || null,
    });

    await writeActivity("dot-green", `Approved user as ${newRole}`);
  };

  const handleAddCourse = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const code = String(fd.get("code") || "").trim();
    if (!name || !code) return;

    const dupQ = query(collection(db, "courses"), where("code", "==", code), limit(1));
    const dupSnap = await getDocs(dupQ);
    if (!dupSnap.empty) {
      alert(`Course code "${code}" already exists.`);
      return;
    }

    await addDoc(collection(db, "courses"), {
      name,
      code,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser?.uid || null,
    });

    await writeActivity("dot-blue", `Course "${name}" created successfully`);
    closeModal();
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const code = String(fd.get("code") || "").trim().toUpperCase();
    const courseId = String(fd.get("courseId") || "");
    if (!name || !code || !courseId) return;

    const dupQ = query(
      collection(db, "classes"),
      where("courseId", "==", courseId),
      where("name", "==", name),
      limit(1)
    );
    const dupSnap = await getDocs(dupQ);
    if (!dupSnap.empty) {
      alert(`Class "${name}" already exists under this course.`);
      return;
    }

    const dupCodeQ = query(collection(db, "classes"), where("code", "==", code), limit(1));
    const dupCodeSnap = await getDocs(dupCodeQ);
    if (!dupCodeSnap.empty) {
      alert(`Class code "${code}" already exists.`);
      return;
    }

    await addDoc(collection(db, "classes"), {
      name,
      code,
      courseId,
      teacherUid: null,      
      teacherName: null,     
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser?.uid || null,
    });

    await writeActivity("dot-green", `New class "${name}" added under ${getCourseName(courseId)}`);
    closeModal();
  };

  const handleEnrollStudent = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const studentUid = String(fd.get("studentUid") || "").trim();
    const classId = String(fd.get("classId") || "").trim();
    if (!studentUid || !classId) return;

    const enrollmentId = `${studentUid}_${classId}`;
    const ref = doc(db, "enrollments", enrollmentId);

    const exists = await getDoc(ref);
    if (exists.exists()) {
      alert(`Already enrolled: ${getUserLabel(activeStudents, studentUid)} is already in ${getClassName(classId)}.`);
      return;
    }

    await setDoc(ref, {
      studentUid,
      classId,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser?.uid || null,
    });

    await writeActivity("dot-purple", `Enrolled "${getUserLabel(activeStudents, studentUid)}" into ${getClassName(classId)}`);
    closeModal();
  };

  const handleAssignTeacher = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const classId = String(fd.get("classId") || "");
    const teacherUid = String(fd.get("teacherUid") || ""); // "" = unassign
    if (!classId) return;

    const t = activeTeachers.find((x) => x.id === teacherUid);

    await updateDoc(doc(db, "classes", classId), {
      teacherUid: teacherUid || null,
      teacherName: teacherUid ? (t?.fullName || t?.email || "Teacher") : null,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.uid || null,
    });

    await writeActivity(
      "dot-purple",
      `Assigned ${teacherUid ? (t?.fullName || t?.email || "teacher") : "no teacher"} to ${getClassName(classId)}`
    );

    closeModal();
  };

  const handleLinkStudentToParent = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parentUid = String(fd.get("parentUid") || "").trim();
    const studentUid = String(fd.get("studentUid") || "").trim();
    if (!parentUid || !studentUid) return;

    await updateDoc(doc(db, "users", parentUid), {
      childStudentIds: arrayUnion(studentUid),
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.uid || null,
    });

    await writeActivity(
      "dot-purple",
      `Linked "${getUserLabel(activeStudents, studentUid)}" to parent "${getUserLabel(activeParents, parentUid)}"`
    );

    setParentLinkTarget(parentUid);
    closeModal();
  };

  const handleUnlinkStudentFromParent = async (parentUid, studentUid) => {
    await updateDoc(doc(db, "users", parentUid), {
      childStudentIds: arrayRemove(studentUid),
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.uid || null,
    });

    await writeActivity(
      "dot-orange",
      `Unlinked "${getUserLabel(activeStudents, studentUid)}" from parent "${getUserLabel(activeParents, parentUid)}"`
    );
  };

  const handleRemoveStudentFromClass = async (studentUid, classId) => {
    const enrollmentId = `${studentUid}_${classId}`;
    await deleteDoc(doc(db, "enrollments", enrollmentId));
    await writeActivity("dot-orange", `Removed "${getUserLabel(activeStudents, studentUid)}" from ${getClassName(classId)}`);
  };

  const handleAddStudentToSelectedClass = async (e) => {
    e.preventDefault();
    if (!selectedClassId) return;

    const fd = new FormData(e.currentTarget);
    const studentUid = String(fd.get("studentUid") || "");
    if (!studentUid) return;

    const enrollmentId = `${studentUid}_${selectedClassId}`;
    const ref = doc(db, "enrollments", enrollmentId);

    const exists = await getDoc(ref);
    if (exists.exists()) {
      alert("This student is already enrolled in this class.");
      return;
    }

    await setDoc(ref, {
      studentUid,
      classId: selectedClassId,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser?.uid || null,
    });

    await writeActivity("dot-purple", `Enrolled "${getUserLabel(activeStudents, studentUid)}" into ${getClassName(selectedClassId)}`);
    e.currentTarget.reset();
  };

  // ========== DELETIONS (BATCH SAFE) ==========
  const deleteCourse = async (courseId) => {
    if (!window.confirm("Delete this course? This will also delete its classes and enrollments.")) return;

    const classSnaps = await getDocs(query(collection(db, "classes"), where("courseId", "==", courseId)));
    const batch = writeBatch(db);

    for (const clDoc of classSnaps.docs) {
      const classId = clDoc.id;

      const enrollSnaps = await getDocs(query(collection(db, "enrollments"), where("classId", "==", classId)));
      enrollSnaps.docs.forEach((e) => batch.delete(doc(db, "enrollments", e.id)));

      batch.delete(doc(db, "classes", classId));
    }

    batch.delete(doc(db, "courses", courseId));

    await batch.commit();
    await writeActivity("dot-blue", `Deleted course + related classes/enrollments`);
  };

  const deleteClass = async (classId) => {
    if (!window.confirm("Delete this class? All enrollments in it will be removed.")) return;

    const enrollSnaps = await getDocs(query(collection(db, "enrollments"), where("classId", "==", classId)));
    const batch = writeBatch(db);

    enrollSnaps.docs.forEach((e) => batch.delete(doc(db, "enrollments", e.id)));
    batch.delete(doc(db, "classes", classId));

    await batch.commit();
    if (selectedClassId === classId) setSelectedClassId(null);
    await writeActivity("dot-green", `Deleted class + removed enrollments`);
  };

  // ========== DISABLE USERS ==========
  const disableUser = async (uid, roleLabel = "user") => {
    if (!window.confirm(`Disable this ${roleLabel}?`)) return;

    await updateDoc(doc(db, "users", uid), {
      status: "disabled",              // or "inactive" if you prefer
      disabledAt: serverTimestamp(),
      disabledBy: auth.currentUser?.uid || null,
    });

    await writeActivity("dot-orange", `Disabled ${roleLabel}`);
  };

  const disableTeacher = (uid) => disableUser(uid, "teacher");
  const disableStudent = (uid) => disableUser(uid, "student");
  const disableParent = (uid) => disableUser(uid, "parent");
  const adminTabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "courses", label: "Courses" },
    { id: "classes", label: "Classes" },
    { id: "teachers", label: "Teachers" },
    { id: "students", label: "Students" },
    { id: "parents", label: "Parents" },
  ];

  // ========== RENDER ==========
  return (
    <div className="ap-root">
      {/* SIDEBAR */}
      <aside className="ap-sidebar">
        <div className="ap-brand">
          <div className="ap-brand-icon">
            <School size={18} />
          </div>
          <div className="ap-brand-text">
            <div className="ap-brand-title">EduAdmin</div>
            <div className="ap-brand-subtitle">Management Portal</div>
          </div>
        </div>

        <nav className="ap-nav">
          <button className={`ap-nav-item ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>

          <button className={`ap-nav-item ${activeTab === "courses" ? "active" : ""}`} onClick={() => setActiveTab("courses")}>
            <BookOpen size={18} />
            <span>Courses</span>
          </button>

          <button className={`ap-nav-item ${activeTab === "classes" ? "active" : ""}`} onClick={() => setActiveTab("classes")}>
            <ClipboardList size={18} />
            <span>Classes</span>
          </button>

          <button className={`ap-nav-item ${activeTab === "teachers" ? "active" : ""}`} onClick={() => setActiveTab("teachers")}>
            <UserRoundCog size={18} />
            <span>Teachers</span>
          </button>

          <button className={`ap-nav-item ${activeTab === "students" ? "active" : ""}`} onClick={() => setActiveTab("students")}>
            <GraduationCap size={18} />
            <span>Students</span>
          </button>

          <button className={`ap-nav-item ${activeTab === "parents" ? "active" : ""}`} onClick={() => setActiveTab("parents")}>
            <Users size={18} />
            <span>Parents</span>
          </button>
        </nav>

        <div className="ap-sidebar-footer">
          <div className="ap-user">
            <div className="ap-avatar">
              <UserRound size={18} />
            </div>
            <div className="ap-user-text">
              <div className="ap-user-name">{adminProfile.fullName}</div>
              <div className="ap-user-role">Admin</div>
              {adminProfile.email ? (
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{adminProfile.email}</div>
              ) : null}
            </div>
          </div>

          <button type="button" className="ap-nav-item" onClick={handleAdminLogout} style={{ marginTop: 14 }}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="ap-main">
        <header className="ap-topbar">
          <div className="ap-topbar-left">
            <div className="ap-page-title">
              {activeTab === "dashboard" && "Dashboard"}
              {activeTab === "courses" && "Courses"}
              {activeTab === "classes" && "Classes"}
              {activeTab === "teachers" && "Teachers"}
              {activeTab === "students" && "Students"}
              {activeTab === "parents" && "Parents"}
            </div>
            <div className="ap-page-subtitle">Welcome to the admin portal</div>
          </div>

          <div className="ap-topbar-right">
            {/* Notifications */}
            <div style={{ position: "relative", marginRight: 8 }}>
              <button
                className="ap-icon-btn"
                aria-label="Notifications"
                type="button"
                onClick={() => setShowNotifications((p) => !p)}
              >
                <Bell size={18} />
              </button>
              {showNotifications && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "120%",
                    minWidth: 240,
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    boxShadow: "0 10px 25px rgba(15,23,42,0.12)",
                    padding: 12,
                    fontSize: 13,
                    color: "#4b5563",
                    zIndex: 40,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Notifications</div>
                  <div style={{ color: "#9ca3af" }}>No new notifications yet.</div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div style={{ position: "relative", marginRight: 8 }}>
              <button
                type="button"
                className="ap-icon-btn"
                aria-label="Profile"
                onClick={() => setShowProfileMenu((p) => !p)}
                style={{ display: "flex", alignItems: "center", gap: 8, paddingInline: 10 }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "999px",
                    background: "#1d4ed8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {adminProfile.fullName?.[0] || "A"}
                </div>
                <span style={{ fontSize: 13 }}>{adminProfile.fullName}</span>
              </button>
              {showProfileMenu && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "120%",
                    minWidth: 200,
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    boxShadow: "0 10px 25px rgba(15,23,42,0.12)",
                    padding: 8,
                    fontSize: 13,
                    zIndex: 40,
                  }}
                >
                  <button
                    type="button"
                    onClick={handleAdminLogout}
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

            <button className="ap-icon-btn" aria-label="Settings" type="button">
              <Settings size={18} />
            </button>
          </div>
        </header>

        <div className="ap-mobile-nav" aria-label="Admin portal navigation">
          <label htmlFor="ap-mobile-tab-select" className="ap-mobile-nav-label">
            Section
          </label>
          <select
            id="ap-mobile-tab-select"
            className="ap-mobile-nav-select"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
          >
            {adminTabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>

        <div className="ap-content">
          {/* DASHBOARD */}
          {activeTab === "dashboard" && (
            <>
              <section className="ap-grid ap-grid-4">
                {stats.map((s) => (
                  <div key={s.title} className="ap-card ap-stat">
                    <div>
                      <div className="ap-stat-label">{s.title}</div>
                      <div className="ap-stat-value">{s.value}</div>
                    </div>
                    <div className={s.chipClass}>{s.icon}</div>
                  </div>
                ))}
              </section>

              <section className="ap-card ap-block">
                <div className="ap-block-title">Quick Actions</div>
                <div className="ap-actions">
                  {actions.map((a) => (
                    <button key={a.label} className={a.className} onClick={a.onClick} type="button">
                      <span className="ap-action-icon"><Plus size={18} /></span>
                      <span className="ap-action-text">{a.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="ap-card ap-block">
                <div className="ap-block-title">Recent Activity</div>
                <div className="ap-activity">
                  {activity.map((x) => (
                    <div key={x.id} className="ap-activity-row">
                      <span className={`ap-dot ${x.dot}`} />
                      <div className="ap-activity-text">{x.text}</div>
                      <div className="ap-activity-time">{x.time || ""}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="ap-card ap-block">
                <div className="ap-block-title">Pending Requests</div>
                {pendingUsers.length === 0 ? (
                  <div style={{ color: "#6b7280" }}>No pending users.</div>
                ) : (
                  <div className="ap-activity">
                    {pendingUsers.map((u) => (
                      <div key={u.id} className="ap-activity-row" style={{ alignItems: "center" }}>
                        <span className="ap-dot dot-orange" />
                        <div className="ap-activity-text">
                          <div style={{ fontWeight: 600 }}>{u.fullName || "Unnamed User"}</div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>
                            {u.email} • requested: {u.requestedRole || "unknown"}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="ap-modal-btn" type="button" onClick={() => approveUser(u.id, "student")}>Approve Student</button>
                          <button className="ap-modal-btn" type="button" onClick={() => approveUser(u.id, "teacher")}>Approve Teacher</button>
                          <button className="ap-modal-btn" type="button" onClick={() => approveUser(u.id, "parent")}>Approve Parent</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {/* COURSES */}
          {activeTab === "courses" && (
            <section className="ap-card ap-block">
              <div className="ap-block-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Courses</span>
                <button className="ap-modal-btn" type="button" onClick={() => setModal("course")}>+ Add Course</button>
              </div>

              {courses.length === 0 ? (
                <div style={{ color: "#6b7280" }}>No courses yet.</div>
              ) : (
                <div className="ap-activity">
                  {courses.map((c) => (
                    <div key={c.id} className="ap-activity-row" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
                      <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
                        <span className="ap-dot dot-blue" />
                        <div className="ap-activity-text" style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600 }}>{c.name}</div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>{c.code}</div>
                        </div>
                      </div>

                      <button type="button" className="ap-modal-btn ghost" onClick={() => deleteCourse(c.id)}>Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* CLASSES */}
          {activeTab === "classes" && (
            <div className="ap-grid" style={{ gridTemplateColumns: "1.2fr 0.8fr", gap: 16 }}>
              <section className="ap-card ap-block">
                <div className="ap-block-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Classes</span>
                  <button className="ap-modal-btn" type="button" onClick={() => setModal("class")}>+ Add Class</button>
                </div>

                {classes.length === 0 ? (
                  <div style={{ color: "#6b7280" }}>No classes yet.</div>
                ) : (
                  <div className="ap-activity">
                    {classes.map((cl) => {
                      const teacherLabel =
                        cl.teacherName ||
                        getUserLabel(activeTeachers, cl.teacherUid) ||
                        "Not assigned";

                      const isSelected = selectedClassId === cl.id;

                      return (
                        <div
                          key={cl.id}
                          className="ap-activity-row"
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr auto",
                            gap: 12,
                            alignItems: "center",
                            background: isSelected ? "rgba(59,130,246,0.08)" : "transparent",
                          }}
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedClassId(cl.id)}
                            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelectedClassId(cl.id)}
                            style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", minWidth: 0 }}
                          >
                            <span className={`ap-dot ${isSelected ? "dot-blue" : "dot-green"}`} />
                            <div className="ap-activity-text" style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600 }}>{cl.name}</div>
                              <div style={{ fontSize: 12, color: "#6b7280" }}>
                                Code: {cl.code || "Not set"} • Course: {getCourseName(cl.courseId)} • Teacher: {teacherLabel}
                              </div>
                            </div>
                          </div>

                          <button type="button" className="ap-modal-btn ghost" onClick={() => deleteClass(cl.id)}>Delete</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="ap-card ap-block">
                <div className="ap-block-title">Enrolled Students</div>

                {!selectedClassId ? (
                  <div style={{ color: "#6b7280" }}>Click a class to see its students.</div>
                ) : (
                  <>
                    <form onSubmit={handleAddStudentToSelectedClass} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      <select name="studentUid" required style={{ flex: 1 }}>
                        <option value="">Add active student...</option>
                        {(() => {
                          const enrolledSet = new Set(
                            enrollments.filter((e) => e.classId === selectedClassId).map((e) => e.studentUid)
                          );
                          return activeStudents
                            .filter((s) => !enrolledSet.has(s.id))
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.fullName || s.email}
                              </option>
                            ));
                        })()}
                      </select>

                      <button className="ap-modal-btn" type="submit">Add</button>
                    </form>

                    <div className="ap-activity">
                      {enrollments
                        .filter((e) => e.classId === selectedClassId)
                        .map((e) => activeStudents.find((s) => s.id === e.studentUid))
                        .filter(Boolean)
                        .map((s) => (
                          <div key={s.id} className="ap-activity-row" style={{ alignItems: "center" }}>
                            <span className="ap-dot dot-orange" />
                            <div className="ap-activity-text">
                              <div style={{ fontWeight: 600 }}>{s.fullName || "Unnamed"}</div>
                              <div style={{ fontSize: 12, color: "#6b7280" }}>{s.email}</div>
                            </div>
                            <button
                              type="button"
                              className="ap-modal-btn ghost"
                              onClick={() => handleRemoveStudentFromClass(s.id, selectedClassId)}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </section>
            </div>
          )}

          {/* ================= TEACHERS TAB ================= */}
          {activeTab === "teachers" && (
            <section className="ap-card ap-block">
              <div
                className="ap-block-title"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <span>Teachers</span>
              </div>

              {activeTeachers.length === 0 ? (
                <div style={{ color: "#6b7280" }}>No active teachers yet.</div>
              ) : (
                <div className="ap-activity">
                  {activeTeachers.map((t) => {
                    // ✅ classes assigned to this teacher
                    const myClasses = classes.filter((cl) => cl.teacherUid === t.id);
                    const classNames =
                      myClasses.length === 0
                        ? "Not assigned"
                        : myClasses.map((cl) => cl.name || cl.code || "Class").join(", ");

                    return (
                      <div
                        key={t.id}
                        className="ap-activity-row"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: 12,
                          alignItems: "center",
                          width: "100%",
                        }}
                      >
                        {/* LEFT */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <span className="ap-dot dot-purple" />
                          <div className="ap-activity-text" style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {t.fullName || t.email}
                            </div>

                            <div
                              style={{
                                fontSize: 12,
                                color: "#6b7280",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {t.email} • Classes: {classNames}
                            </div>
                          </div>
                        </div>

                        {/* RIGHT actions */}
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            className="ap-modal-btn ghost"
                            onClick={() => disableTeacher(t.id)}
                          >
                            Disable
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ================= STUDENTS TAB ================= */}
          {activeTab === "students" && (
            <section className="ap-card ap-block">
              <div
                className="ap-block-title"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <span>Students</span>
                <button className="ap-modal-btn" type="button" onClick={() => setModal("enroll")}>
                  + Enroll Student
                </button>
              </div>

              {activeStudents.length === 0 ? (
                <div style={{ color: "#6b7280" }}>No active students yet.</div>
              ) : (
                <div className="ap-activity">
                  {activeStudents.map((s) => {
                    const myEnrolls = enrollments.filter((e) => e.studentUid === s.id);
                    const classNames =
                      myEnrolls.length === 0
                        ? "Not enrolled"
                        : myEnrolls
                            .map((e) => {
                              const cls = classes.find((c) => c.id === e.classId);
                              return cls?.name || cls?.code || "Class";
                            })
                            .join(", ");

                    return (
                      <div
                        key={s.id}
                        className="ap-activity-row"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: 12,
                          alignItems: "center",
                          width: "100%",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <span className="ap-dot dot-orange" />
                          <div className="ap-activity-text" style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {s.fullName || s.email}
                            </div>
                            <div style={{ fontSize: 12, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {s.email} • Class: {classNames}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            className="ap-modal-btn ghost"
                            onClick={() => disableStudent(s.id)}
                          >
                            Disable
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ================= PARENTS TAB ================= */}
          {activeTab === "parents" && (
            <section className="ap-card ap-block">
              <div
                className="ap-block-title"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <span>Parents</span>
                <button
                  className="ap-modal-btn"
                  type="button"
                  onClick={() => {
                    setParentLinkTarget(activeParents[0]?.id || "");
                    setModal("linkParentChild");
                  }}
                  disabled={activeParents.length === 0 || activeStudents.length === 0}
                >
                  + Link Student
                </button>
              </div>

              {activeParents.length === 0 ? (
                <div style={{ color: "#6b7280" }}>No active parents yet.</div>
              ) : (
                <div className="ap-activity">
                  {activeParents.map((p) => {
                    const linkedIds = getParentChildIds(p);
                    const linkedLabels =
                      linkedIds.length === 0
                        ? []
                        : linkedIds.map((studentUid) => ({
                            id: studentUid,
                            label: getUserLabel(activeStudents, studentUid),
                          }));

                    return (
                      <div
                        key={p.id}
                        className="ap-activity-row"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: 12,
                          alignItems: "start",
                          width: "100%",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
                          <span className="ap-dot dot-pink" />
                          <div className="ap-activity-text" style={{ minWidth: 0, width: "100%" }}>
                            <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {p.fullName || p.email}
                            </div>
                            <div style={{ fontSize: 12, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {p.email} • Linked students: {linkedIds.length}
                            </div>

                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                              {linkedLabels.length === 0 ? (
                                <span style={{ fontSize: 12, color: "#6b7280" }}>No students linked yet.</span>
                              ) : (
                                linkedLabels.map((student) => (
                                  <span
                                    key={student.id}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 6,
                                      borderRadius: 999,
                                      background: "#edf4ff",
                                      color: "#1d4ed8",
                                      padding: "6px 10px",
                                      fontSize: 12,
                                      fontWeight: 600,
                                    }}
                                  >
                                    <span>{student.label}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleUnlinkStudentFromParent(p.id, student.id)}
                                      style={{
                                        border: "none",
                                        background: "transparent",
                                        color: "#1d4ed8",
                                        cursor: "pointer",
                                        fontSize: 12,
                                        padding: 0,
                                      }}
                                      aria-label={`Remove ${student.label}`}
                                    >
                                      ✕
                                    </button>
                                  </span>
                                ))
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            className="ap-modal-btn ghost"
                            onClick={() => {
                              setParentLinkTarget(p.id);
                              setModal("linkParentChild");
                            }}
                          >
                            Link Student
                          </button>
                          <button
                            type="button"
                            className="ap-modal-btn ghost"
                            onClick={() => disableParent(p.id)}
                          >
                            Disable
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>

        {/* MODALS */}
        {modal ? (
          <div className="ap-modal-overlay" onMouseDown={closeModal}>
            <div className="ap-modal" onMouseDown={(e) => e.stopPropagation()}>
              <div className="ap-modal-head">
                <div className="ap-modal-title">
                  {modal === "course" && "Add Course"}
                  {modal === "class" && "Add Class"}
                  {modal === "enroll" && "Enroll Student"}
                  {modal === "assignTeacher" && "Assign Teacher"}
                  {modal === "linkParentChild" && "Link Parent to Student"}
                </div>
                <button className="ap-modal-x" onClick={closeModal} aria-label="Close" type="button">
                  <X size={18} />
                </button>
              </div>

              {modal === "course" && (
                <form className="ap-modal-form" onSubmit={handleAddCourse}>
                  <label>Course Name</label>
                  <input name="name" required placeholder="e.g., Mathematics" />
                  <label>Course Code</label>
                  <input name="code" required placeholder="e.g., MATH101" />
                  <div className="ap-modal-actions">
                    <button type="button" className="ap-modal-btn ghost" onClick={closeModal}>Cancel</button>
                    <button className="ap-modal-btn" type="submit">Create</button>
                  </div>
                </form>
              )}

              {modal === "class" && (
                <form className="ap-modal-form" onSubmit={handleAddClass}>
                  <label>Class Name</label>
                  <input name="name" required placeholder="e.g., Grade 10 - A" />
                  <label>Class Code</label>
                  <input name="code" required placeholder="e.g., G10A" />
                  <label>Course</label>
                  <select name="courseId" required>
                    <option value="">Select course...</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                  <div className="ap-modal-actions">
                    <button type="button" className="ap-modal-btn ghost" onClick={closeModal}>Cancel</button>
                    <button className="ap-modal-btn" type="submit">Create</button>
                  </div>
                </form>
              )}

              {modal === "enroll" && (
                <form className="ap-modal-form" onSubmit={handleEnrollStudent}>
                  <label>Student</label>
                  <select name="studentUid" required>
                    <option value="">Select student...</option>
                    {activeStudents.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.fullName || st.email}
                      </option>
                    ))}
                  </select>

                  <label>Class</label>
                  <select name="classId" required>
                    <option value="">Select class...</option>
                    {classes.map((cl) => (
                      <option key={cl.id} value={cl.id}>
                        {cl.name}
                      </option>
                    ))}
                  </select>

                  <div className="ap-modal-actions">
                    <button type="button" className="ap-modal-btn ghost" onClick={closeModal}>Cancel</button>
                    <button className="ap-modal-btn" type="submit">Enroll</button>
                  </div>
                </form>
              )}

              {modal === "assignTeacher" && (
                <form className="ap-modal-form" onSubmit={handleAssignTeacher}>
                  <label>Class</label>
                  <select name="classId" required>
                    <option value="">Select class...</option>
                    {classes.map((cl) => (
                      <option key={cl.id} value={cl.id}>
                        {cl.name}
                      </option>
                    ))}
                  </select>

                  <label>Teacher</label>
                  <select name="teacherUid">
                    <option value="">Unassign teacher</option>
                    {activeTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName || t.email}
                      </option>
                    ))}
                  </select>

                  <div className="ap-modal-actions">
                    <button type="button" className="ap-modal-btn ghost" onClick={closeModal}>Cancel</button>
                    <button className="ap-modal-btn" type="submit">Save</button>
                  </div>
                </form>
              )}

              {modal === "linkParentChild" && (
                <form className="ap-modal-form" onSubmit={handleLinkStudentToParent}>
                  <label>Parent</label>
                  <select
                    name="parentUid"
                    required
                    value={parentLinkTarget}
                    onChange={(e) => setParentLinkTarget(e.target.value)}
                  >
                    <option value="">Select parent...</option>
                    {activeParents.map((parent) => (
                      <option key={parent.id} value={parent.id}>
                        {parent.fullName || parent.email}
                      </option>
                    ))}
                  </select>

                  <label>Student</label>
                  <select name="studentUid" required>
                    <option value="">Select student...</option>
                    {activeStudents
                      .filter((student) => {
                        if (!parentLinkTarget) return true;
                        const parent = activeParents.find((item) => item.id === parentLinkTarget);
                        return !getParentChildIds(parent).includes(student.id);
                      })
                      .map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.fullName || student.email}
                        </option>
                      ))}
                  </select>

                  <div className="ap-modal-actions">
                    <button type="button" className="ap-modal-btn ghost" onClick={closeModal}>Cancel</button>
                    <button className="ap-modal-btn" type="submit">Link</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
