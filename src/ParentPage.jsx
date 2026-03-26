import React, { useEffect, useMemo, useState } from "react";
import "./ParentPage.css";
import {
  FaTachometerAlt,
  FaUserFriends,
  FaClipboardCheck,
  FaBullhorn,
  FaSignOutAlt,
  FaBell,
  FaChevronDown,
  FaCog,
  FaBookOpen,
  FaCalendarAlt,
  FaRegClock,
} from "react-icons/fa";
import { auth, db } from "./firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import useRealtimeDocsByIds from "./useRealtimeDocsByIds";
import useRealtimeWhereIn from "./useRealtimeWhereIn";

const pageMeta = {
  dashboard: {
    title: "Dashboard",
    subtitle: "A real-time overview of progress, attendance, and school updates for your linked children.",
  },
  children: {
    title: "My Children",
    subtitle: "Tap a child to review full grades, classes, and recent activity.",
  },
  attendance: {
    title: "Attendance",
    subtitle: "Open a child record to review recent attendance history and class-level notes.",
  },
  announcements: {
    title: "Updates",
    subtitle: "Live school updates, new grades, resources, schedules, and announcements.",
  },
};

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: FaTachometerAlt },
  { id: "children", label: "My Children", icon: FaUserFriends },
  { id: "attendance", label: "Attendance", icon: FaClipboardCheck },
  { id: "announcements", label: "Updates", icon: FaBullhorn },
];

const getTimestampValue = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  const dateValue = value?.toDate ? value.toDate() : new Date(value);
  const time = dateValue instanceof Date ? dateValue.getTime() : NaN;
  return Number.isNaN(time) ? 0 : time;
};

const formatDateLabel = (value) => {
  if (!value) return "—";
  const dateValue = value?.toDate ? value.toDate() : new Date(value);
  if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) return "—";
  return dateValue.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
};

const formatDateTimeLabel = (value) => {
  if (!value) return "—";
  const dateValue = value?.toDate ? value.toDate() : new Date(value);
  if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) return "—";
  return dateValue.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

const getMonthKey = (timestamp) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "unknown";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const getMonthLabel = (monthKey) => {
  const [year, month] = String(monthKey).split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return "Unknown month";
  return date.toLocaleDateString([], { month: "long", year: "numeric" });
};

const getPercentLabel = (percent) => {
  if (percent == null || Number.isNaN(percent)) return "—";
  if (percent >= 90) return "A";
  if (percent >= 80) return "B+";
  if (percent >= 70) return "B";
  if (percent >= 60) return "C";
  return "D";
};

const getAccentFromPercent = (percent) => {
  if (percent == null || Number.isNaN(percent)) return "purple";
  if (percent >= 90) return "green";
  if (percent >= 80) return "blue";
  if (percent >= 70) return "yellow";
  return "orange";
};

const normalizeAttendanceStatus = (status) => {
  const clean = String(status || "").trim().toLowerCase();
  if (clean === "present") return "Present";
  if (clean === "late") return "Late";
  if (clean === "excused") return "Excused";
  if (clean === "absent") return "Absent";
  return "Recorded";
};

export default function ParentPage() {
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [parentProfile, setParentProfile] = useState({
    fullName: "Parent",
    email: "",
    childStudentIds: [],
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [childModalView, setChildModalView] = useState("details");
  const [selectedModalClassId, setSelectedModalClassId] = useState("");
  const [expandedUpdateMonths, setExpandedUpdateMonths] = useState({});

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

        const linkedChildIds = Array.isArray(data.childStudentIds)
          ? data.childStudentIds
          : Array.isArray(data.children)
            ? data.children
                .map((child) =>
                  typeof child === "string"
                    ? child
                    : child?.studentUid || child?.uid || child?.id || null
                )
                .filter(Boolean)
            : [];

        setParentProfile({
          fullName: data.fullName || "Parent",
          email: data.email || user.email || "",
          childStudentIds: linkedChildIds,
        });
      } catch (error) {
        console.error("Parent profile load failed:", error);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, [navigate]);

  const linkedChildIds = useMemo(
    () => [...new Set((parentProfile.childStudentIds || []).filter(Boolean).map(String))],
    [parentProfile.childStudentIds]
  );

  const linkedStudents = useRealtimeDocsByIds("users", linkedChildIds, linkedChildIds.length > 0);
  const linkedEnrollments = useRealtimeWhereIn(
    "enrollments",
    "studentUid",
    linkedChildIds,
    linkedChildIds.length > 0
  );
  const linkedGrades = useRealtimeWhereIn(
    "grades",
    "studentUid",
    linkedChildIds,
    linkedChildIds.length > 0
  );
  const linkedAttendance = useRealtimeWhereIn(
    "attendance",
    "studentUid",
    linkedChildIds,
    linkedChildIds.length > 0
  );

  const linkedClassIds = useMemo(
    () => [...new Set(linkedEnrollments.map((item) => item.classId).filter(Boolean).map(String))],
    [linkedEnrollments]
  );
  const linkedClasses = useRealtimeDocsByIds("classes", linkedClassIds, linkedClassIds.length > 0);

  const linkedCourseIds = useMemo(
    () => [...new Set(linkedClasses.map((item) => item.courseId).filter(Boolean).map(String))],
    [linkedClasses]
  );
  const linkedCourses = useRealtimeDocsByIds("courses", linkedCourseIds, linkedCourseIds.length > 0);

  const linkedResources = useRealtimeWhereIn(
    "resources",
    "classId",
    linkedClassIds,
    linkedClassIds.length > 0
  );
  const linkedSessions = useRealtimeWhereIn(
    "classSessions",
    "classId",
    linkedClassIds,
    linkedClassIds.length > 0
  );

  const classesById = useMemo(() => {
    const map = new Map();
    linkedClasses.forEach((item) => map.set(item.id, item));
    return map;
  }, [linkedClasses]);

  const coursesById = useMemo(() => {
    const map = new Map();
    linkedCourses.forEach((item) => map.set(item.id, item));
    return map;
  }, [linkedCourses]);

  const studentsById = useMemo(() => {
    const map = new Map();
    linkedStudents.forEach((item) => map.set(item.id, item));
    return map;
  }, [linkedStudents]);

  const children = useMemo(() => {
    return linkedStudents
      .filter((student) => student?.role === "student")
      .map((student) => {
        const enrollments = linkedEnrollments.filter((item) => item.studentUid === student.id);
        const enrolledClasses = enrollments
          .map((item) => classesById.get(item.classId))
          .filter(Boolean)
          .map((classDoc) => ({
            id: classDoc.id,
            name: classDoc.name || classDoc.code || "Class",
            code: classDoc.code || "",
            teacherName: classDoc.teacherName || "Teacher not assigned",
            courseName: coursesById.get(classDoc.courseId)?.name || "Course",
          }));

        const gradeDocs = linkedGrades
          .filter((item) => item.studentUid === student.id)
          .sort((a, b) => getTimestampValue(b.date || b.createdAt) - getTimestampValue(a.date || a.createdAt));

        const grades = gradeDocs.map((item) => {
          const maxScore = Number(item.maxScore || 100);
          const score = Number(item.score || 0);
          const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : null;
          const classDoc = classesById.get(item.classId);
          return {
            id: item.id,
            classId: item.classId || "",
            label: item.label || "Grade",
            className: classDoc?.name || classDoc?.code || "Class",
            courseName: coursesById.get(classDoc?.courseId)?.name || "Course",
            score,
            maxScore,
            percent,
            dateText: formatDateLabel(item.date || item.createdAt),
          };
        });

        const attendanceHistory = linkedAttendance
          .filter((item) => item.studentUid === student.id)
          .map((item) => {
            const classDoc = classesById.get(item.classId);
            return {
              id: item.id,
              classId: item.classId || "",
              dateText: formatDateLabel(item.date || item.createdAt),
              className: classDoc?.name || classDoc?.code || "Class",
              status: normalizeAttendanceStatus(item.status),
              note: item.note || "",
              sortValue: getTimestampValue(item.date || item.createdAt),
            };
          })
          .sort((a, b) => b.sortValue - a.sortValue);

        const avgScore =
          grades.length > 0
            ? Math.round(grades.reduce((sum, item) => sum + (item.percent || 0), 0) / grades.length)
            : null;

        const attendedCount = attendanceHistory.filter((item) =>
          ["Present", "Late", "Excused"].includes(item.status)
        ).length;
        const attendancePercent =
          attendanceHistory.length > 0
            ? Math.round((attendedCount / attendanceHistory.length) * 100)
            : null;

        const primaryClass = enrolledClasses[0] || null;
        const focus =
          grades[0]?.label
            ? `${grades[0].label} from ${grades[0].className}`
            : attendanceHistory[0]?.note || "No recent activity yet";
        const accent = getAccentFromPercent(avgScore);

        return {
          id: student.id,
          name: student.fullName || student.email || "Student",
          avatar: `https://i.pravatar.cc/120?u=${student.id}`,
          gradeLevel: primaryClass?.courseName || "Student",
          classroom: primaryClass ? `Class: ${primaryClass.name}` : "No class assigned",
          teacher: primaryClass?.teacherName || "Teacher not assigned",
          average: getPercentLabel(avgScore),
          score: avgScore ?? 0,
          attendance: attendancePercent ?? 0,
          focus,
          accent,
          classes: enrolledClasses,
          grades,
          attendanceHistory,
        };
      });
  }, [classesById, coursesById, linkedAttendance, linkedEnrollments, linkedGrades, linkedStudents]);

  const updates = useMemo(() => {
    const gradeUpdates = linkedGrades.map((item) => {
      const student = studentsById.get(item.studentUid);
      const classDoc = classesById.get(item.classId);
      const maxScore = Number(item.maxScore || 100);
      const score = Number(item.score || 0);
      const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : null;
      return {
        id: `grade-${item.id}`,
        title: `${student?.fullName || "Student"} received a new grade`,
        body: `${item.label || "Grade"} • ${classDoc?.name || classDoc?.code || "Class"} • ${score}/${maxScore}`,
        time: formatDateLabel(item.date || item.createdAt),
        accent: getAccentFromPercent(percent),
        timestamp: getTimestampValue(item.date || item.createdAt),
      };
    });

    const attendanceUpdates = linkedAttendance.map((item) => {
      const student = studentsById.get(item.studentUid);
      const classDoc = classesById.get(item.classId);
      return {
        id: `attendance-${item.id}`,
        title: `${student?.fullName || "Student"} attendance updated`,
        body: `${normalizeAttendanceStatus(item.status)} • ${classDoc?.name || classDoc?.code || "Class"}${item.note ? ` • ${item.note}` : ""}`,
        time: formatDateLabel(item.date || item.createdAt),
        accent:
          String(item.status || "").toLowerCase() === "present"
            ? "green"
            : String(item.status || "").toLowerCase() === "late"
              ? "yellow"
              : "orange",
        timestamp: getTimestampValue(item.date || item.createdAt),
      };
    });

    const resourceUpdates = linkedResources.map((item) => {
      const classDoc = classesById.get(item.classId);
      return {
        id: `resource-${item.id}`,
        title: `New resource shared in ${classDoc?.name || classDoc?.code || "class"}`,
        body: `${item.title}${item.description ? ` • ${item.description}` : ""}`,
        time: formatDateLabel(item.createdAt),
        accent: "blue",
        timestamp: getTimestampValue(item.createdAt),
      };
    });

    const sessionUpdates = linkedSessions.map((item) => {
      const classDoc = classesById.get(item.classId);
      return {
        id: `session-${item.id}`,
        title: `Class session scheduled`,
        body: `${classDoc?.name || classDoc?.code || "Class"} • ${formatDateTimeLabel(item.startsAt)}${item.location ? ` • ${item.location}` : ""}`,
        time: formatDateLabel(item.startsAt || item.createdAt),
        accent: "purple",
        timestamp: getTimestampValue(item.startsAt || item.createdAt),
      };
    });

    return [
      ...gradeUpdates,
      ...attendanceUpdates,
      ...resourceUpdates,
      ...sessionUpdates,
    ]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);
  }, [classesById, linkedAttendance, linkedGrades, linkedResources, linkedSessions, studentsById]);

  const stats = useMemo(() => {
    const averageAttendance =
      children.length > 0
        ? Math.round(children.reduce((sum, child) => sum + Number(child.attendance || 0), 0) / children.length)
        : 0;
    const averageScore =
      children.length > 0
        ? Math.round(children.reduce((sum, child) => sum + Number(child.score || 0), 0) / children.length)
        : 0;

    const now = Date.now();
    const recentUpdateCount = updates.filter(
      (item) => now - item.timestamp < 7 * 24 * 60 * 60 * 1000
    ).length;
    const upcomingMeetings = linkedSessions.filter(
      (item) => getTimestampValue(item.startsAt) > now
    ).length;

    return {
      childrenCount: children.length,
      averageAttendance,
      averageScore,
      unreadAnnouncements: recentUpdateCount,
      upcomingMeetings,
    };
  }, [children, linkedSessions, updates]);

  const selectedChild = useMemo(
    () => children.find((child) => child.id === selectedChildId) || null,
    [children, selectedChildId]
  );

  const updateGroups = useMemo(() => {
    const groups = [];
    const map = new Map();

    updates.forEach((item) => {
      const monthKey = getMonthKey(item.timestamp);
      if (!map.has(monthKey)) {
        map.set(monthKey, {
          key: monthKey,
          label: getMonthLabel(monthKey),
          items: [],
        });
      }
      map.get(monthKey).items.push(item);
    });

    map.forEach((group) => groups.push(group));
    return groups;
  }, [updates]);

  useEffect(() => {
    const currentMonthKey = getMonthKey(Date.now());
    setExpandedUpdateMonths((prev) => ({
      ...prev,
      [currentMonthKey]: true,
    }));
  }, [updates]);

  const selectedModalClass = useMemo(() => {
    if (!selectedChild || !selectedModalClassId) return null;
    return (selectedChild.classes || []).find((item) => item.id === selectedModalClassId) || null;
  }, [selectedChild, selectedModalClassId]);

  const filteredModalGrades = useMemo(() => {
    if (!selectedChild) return [];
    if (!selectedModalClassId) return selectedChild.grades || [];
    return (selectedChild.grades || []).filter((item) => item.classId === selectedModalClassId);
  }, [selectedChild, selectedModalClassId]);

  const filteredModalAttendance = useMemo(() => {
    if (!selectedChild) return [];
    if (!selectedModalClassId) return selectedChild.attendanceHistory || [];
    return (selectedChild.attendanceHistory || []).filter((item) => item.classId === selectedModalClassId);
  }, [selectedChild, selectedModalClassId]);

  const modalSummary = useMemo(() => {
    if (!selectedChild) {
      return {
        averageLabel: "—",
        scoreLabel: "—",
        attendanceLabel: "—",
      };
    }

    if (!selectedModalClassId) {
      return {
        averageLabel: selectedChild.average,
        scoreLabel: `${selectedChild.score}%`,
        attendanceLabel: `${selectedChild.attendance}%`,
      };
    }

    const classAveragePercent =
      filteredModalGrades.length > 0
        ? Math.round(
            filteredModalGrades.reduce((sum, item) => sum + Number(item.percent || 0), 0) /
              filteredModalGrades.length
          )
        : null;

    const attendedCount = filteredModalAttendance.filter((item) =>
      ["Present", "Late", "Excused"].includes(item.status)
    ).length;

    const classAttendancePercent =
      filteredModalAttendance.length > 0
        ? Math.round((attendedCount / filteredModalAttendance.length) * 100)
        : null;

    return {
      averageLabel: getPercentLabel(classAveragePercent),
      scoreLabel: classAveragePercent == null ? "—" : `${classAveragePercent}%`,
      attendanceLabel: classAttendancePercent == null ? "—" : `${classAttendancePercent}%`,
    };
  }, [filteredModalAttendance, filteredModalGrades, selectedChild, selectedModalClassId]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const openChildModal = (childId, view) => {
    setSelectedChildId(childId);
    setChildModalView(view);
    setSelectedModalClassId("");
  };

  const closeChildModal = () => {
    setSelectedChildId(null);
    setChildModalView("details");
    setSelectedModalClassId("");
  };

  const toggleUpdateMonth = (monthKey) => {
    setExpandedUpdateMonths((prev) => ({
      ...prev,
      [monthKey]: !prev[monthKey],
    }));
  };

  const firstName = parentProfile.fullName.split(" ")[0] || "Parent";
  const topNotifications = updates.slice(0, 3);
  const activePage = pageMeta[activeTab];

  if (!authReady) {
    return <div className="pp-loading">Loading...</div>;
  }

  return (
    <div className="pp-root">
      <aside className="pp-sidebar">
        <div className="pp-sidebar-main">
          <div className="pp-logo">
            <div className="pp-logo-icon">🎓</div>
            <div className="pp-logo-text">
              <span className="pp-logo-title">Hamsafar</span>
              <span className="pp-logo-sub">Parent Portal</span>
            </div>
          </div>

          <nav className="pp-nav">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`pp-nav-item ${activeTab === item.id ? "active" : ""}`}
                onClick={() => setActiveTab(item.id)}
              >
                {React.createElement(item.icon, { className: "pp-nav-icon" })}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="pp-sidebar-bottom">
          <div className="pp-sidebar-user">
            <img
              className="pp-sidebar-avatar"
              src="https://i.pravatar.cc/100?img=47"
              alt={parentProfile.fullName}
            />
            <div className="pp-user-info">
              <div className="pp-sidebar-name">{parentProfile.fullName}</div>
              <div className="pp-sidebar-role">Parent</div>
              {parentProfile.email ? <div className="pp-sidebar-email">{parentProfile.email}</div> : null}
            </div>
          </div>

          <div className="pp-sidebar-divider" />

          <button type="button" className="pp-nav-item pp-nav-item-secondary">
            <FaCog className="pp-nav-icon" />
            <span>Settings</span>
          </button>
          <button type="button" className="pp-nav-item pp-nav-item-logout" onClick={handleLogout}>
            <FaSignOutAlt className="pp-nav-icon" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="pp-main">
        <header className="pp-topbar">
          <div className="pp-topbar-left">
            <h1>{activePage.title}</h1>
            <p>{activePage.subtitle}</p>
          </div>

          <div className="pp-topbar-right">
            <div className="pp-topbar-menu">
              <button
                type="button"
                className="pp-icon-btn"
                aria-label="Toggle notifications"
                onClick={() => setShowNotifications((prev) => !prev)}
              >
                <FaBell />
                {stats.unreadAnnouncements > 0 ? (
                  <span className="pp-icon-badge">{stats.unreadAnnouncements}</span>
                ) : null}
              </button>
              {showNotifications && (
                <div className="pp-dropdown">
                  <div className="pp-dropdown-title">Recent notifications</div>
                  <div className="pp-dropdown-list">
                    {topNotifications.length === 0 ? (
                      <div className="pp-dropdown-item">
                        <div>
                          <div className="pp-dropdown-item-title">No recent updates</div>
                          <div className="pp-dropdown-item-sub">Live notifications will appear here.</div>
                        </div>
                      </div>
                    ) : (
                      topNotifications.map((item) => (
                        <div key={item.id} className="pp-dropdown-item">
                          <div className={`pp-dot ${item.accent}`} />
                          <div>
                            <div className="pp-dropdown-item-title">{item.title}</div>
                            <div className="pp-dropdown-item-sub">{item.time}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pp-topbar-menu">
              <button
                type="button"
                className="pp-profile-btn"
                onClick={() => setShowProfileMenu((prev) => !prev)}
              >
                <div className="pp-profile-avatar">{parentProfile.fullName?.[0] || "P"}</div>
                <div className="pp-profile-text">
                  <div className="pp-profile-name">{parentProfile.fullName}</div>
                  {parentProfile.email ? <div className="pp-profile-email">{parentProfile.email}</div> : null}
                </div>
                <FaChevronDown className="pp-profile-arrow" />
              </button>

              {showProfileMenu && (
                <div className="pp-dropdown pp-profile-dropdown">
                  <div className="pp-dropdown-title">Account</div>
                  <button type="button" className="pp-dropdown-action" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="pp-mobile-nav" aria-label="Parent portal navigation">
          <label htmlFor="pp-mobile-tab-select" className="pp-mobile-nav-label">
            Section
          </label>
          <select
            id="pp-mobile-tab-select"
            className="pp-mobile-nav-select"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
          >
            {navItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="pp-content">
          {activeTab === "dashboard" && (
            <>
              <section className="pp-hero">
                <div>
                  <span className="pp-hero-kicker">Welcome back</span>
                  <h2>{firstName}, everything important is updating live.</h2>
                  <p>
                    Track grades, attendance, resources, and school activity in real time for every
                    linked child.
                  </p>
                </div>
                <div className="pp-hero-meta">
                  <span>Academic snapshot</span>
                  <strong>{children.length > 0 ? `${stats.averageScore}%` : "—"}</strong>
                </div>
              </section>

              <section className="pp-stats">
                <article className="pp-stat-card">
                  <div className="pp-stat-icon blue">
                    <FaUserFriends />
                  </div>
                  <div className="pp-stat-value">{stats.childrenCount}</div>
                  <div className="pp-stat-label">Children linked</div>
                </article>
                <article className="pp-stat-card">
                  <div className="pp-stat-icon green">
                    <FaClipboardCheck />
                  </div>
                  <div className="pp-stat-value">{children.length > 0 ? `${stats.averageAttendance}%` : "—"}</div>
                  <div className="pp-stat-label">Average attendance</div>
                </article>
                <article className="pp-stat-card">
                  <div className="pp-stat-icon purple">
                    <FaCalendarAlt />
                  </div>
                  <div className="pp-stat-value">{stats.upcomingMeetings}</div>
                  <div className="pp-stat-label">Upcoming classes</div>
                </article>
                <article className="pp-stat-card">
                  <div className="pp-stat-icon orange">
                    <FaBullhorn />
                  </div>
                  <div className="pp-stat-value">{stats.unreadAnnouncements}</div>
                  <div className="pp-stat-label">Recent updates</div>
                </article>
              </section>

              <section className="pp-panel">
                <div className="pp-panel-header">
                  <h3>Children overview</h3>
                  <button type="button" className="pp-link-btn" onClick={() => setActiveTab("children")}>
                    View all children
                  </button>
                </div>
                <div className="pp-panel-divider" />

                {children.length === 0 ? (
                  <div className="pp-empty-state">
                    No student is linked to this parent account yet. An admin can assign students to
                    this parent so live dashboard data appears here instantly.
                  </div>
                ) : (
                  <div className="pp-children-grid">
                    {children.map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        className="pp-child-card pp-child-button"
                        onClick={() => openChildModal(child.id, "details")}
                      >
                        <div className="pp-child-top">
                          <div className="pp-child-left">
                            <img src={child.avatar} alt={child.name} className="pp-child-avatar" />
                            <div>
                              <h4 className="pp-child-name">{child.name}</h4>
                              <p className="pp-child-sub">
                                {child.gradeLevel} • {child.classroom}
                              </p>
                            </div>
                          </div>
                          <span className={`pp-grade-badge ${child.accent}`}>{child.average}</span>
                        </div>

                        <div className="pp-detail-row">
                          <span>Teacher</span>
                          <strong>{child.teacher}</strong>
                        </div>
                        <div className="pp-detail-row">
                          <span>Attendance</span>
                          <strong>{child.attendance}%</strong>
                        </div>
                        <div className="pp-progress">
                          <div className={`pp-progress-fill ${child.accent}`} style={{ width: `${child.attendance}%` }} />
                        </div>
                        <div className="pp-focus-box">
                          <span className="pp-focus-label">Latest update</span>
                          <p>{child.focus}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="pp-dashboard-grid">
                <div className="pp-panel">
                  <div className="pp-panel-header">
                    <h3>Performance and attendance</h3>
                    <button type="button" className="pp-link-btn" onClick={() => setActiveTab("attendance")}>
                      Open attendance
                    </button>
                  </div>
                  <div className="pp-panel-divider" />

                  {children.length === 0 ? (
                    <div className="pp-empty-state">Live student performance appears here once students are linked.</div>
                  ) : (
                    <div className="pp-stack-list">
                      {children.map((child) => (
                        <article key={child.id} className="pp-list-card">
                          <div className="pp-list-card-head">
                            <div>
                              <h4>{child.name}</h4>
                              <p>
                                {child.gradeLevel} • {child.classroom}
                              </p>
                            </div>
                            <span className={`pp-chip ${child.accent}`}>{child.average} average</span>
                          </div>
                          <div className="pp-metric-row">
                            <div className="pp-metric-block">
                              <span>Academic score</span>
                              <strong>{child.score}%</strong>
                            </div>
                            <div className="pp-metric-block">
                              <span>Attendance</span>
                              <strong>{child.attendance}%</strong>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pp-panel">
                  <div className="pp-panel-header">
                    <h3>Latest updates</h3>
                    <button type="button" className="pp-link-btn" onClick={() => setActiveTab("announcements")}>
                      View all
                    </button>
                  </div>
                  <div className="pp-panel-divider" />
                  <div className="pp-announcement-list">
                    {topNotifications.length === 0 ? (
                      <div className="pp-empty-state">No live updates yet for this parent account.</div>
                    ) : (
                      topNotifications.map((item) => (
                        <article key={item.id} className="pp-announcement-item">
                          <div className={`pp-announcement-icon ${item.accent}`}>
                            <FaBookOpen />
                          </div>
                          <div>
                            <h4>{item.title}</h4>
                            <p>{item.body}</p>
                            <span>{item.time}</span>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              </section>
            </>
          )}

          {activeTab === "children" && (
            <section className="pp-panel">
              <div className="pp-panel-header">
                <h3>My children</h3>
                <span className="pp-panel-note">Select a child to open grades, classes, and notes.</span>
              </div>
              <div className="pp-panel-divider" />

              {children.length === 0 ? (
                <div className="pp-empty-state">
                  No linked children yet. Ask an admin to link student records to this parent account.
                </div>
              ) : (
                <div className="pp-children-grid">
                  {children.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      className="pp-child-card pp-child-card-expanded pp-child-button"
                      onClick={() => openChildModal(child.id, "details")}
                    >
                      <div className="pp-child-top">
                        <div className="pp-child-left">
                          <img src={child.avatar} alt={child.name} className="pp-child-avatar" />
                          <div>
                            <h4 className="pp-child-name">{child.name}</h4>
                            <p className="pp-child-sub">
                              {child.gradeLevel} • {child.classroom}
                            </p>
                          </div>
                        </div>
                        <span className={`pp-grade-badge ${child.accent}`}>{child.average}</span>
                      </div>

                      <div className="pp-info-grid">
                        <div className="pp-info-box">
                          <span>Teacher</span>
                          <strong>{child.teacher}</strong>
                        </div>
                        <div className="pp-info-box">
                          <span>Attendance</span>
                          <strong>{child.attendance}%</strong>
                        </div>
                        <div className="pp-info-box">
                          <span>Score</span>
                          <strong>{child.score}%</strong>
                        </div>
                        <div className="pp-info-box">
                          <span>Latest update</span>
                          <strong>{child.focus}</strong>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === "attendance" && (
            <section className="pp-panel">
              <div className="pp-panel-header">
                <h3>Attendance summary</h3>
                <span className="pp-panel-note">Tap a child to inspect attendance history.</span>
              </div>
              <div className="pp-panel-divider" />

              {children.length === 0 ? (
                <div className="pp-empty-state">No attendance records are available yet.</div>
              ) : (
                <div className="pp-stack-list">
                  {children.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      className="pp-list-card pp-list-button"
                      onClick={() => openChildModal(child.id, "attendance")}
                    >
                      <div className="pp-list-card-head">
                        <div>
                          <h4>{child.name}</h4>
                          <p>
                            {child.gradeLevel} • {child.classroom}
                          </p>
                        </div>
                        <span className={`pp-chip ${child.attendance >= 95 ? "green" : "orange"}`}>
                          {child.attendance >= 95 ? "Excellent" : "Needs attention"}
                        </span>
                      </div>
                      <div className="pp-detail-row">
                        <span>Attendance rate</span>
                        <strong>{child.attendance}%</strong>
                      </div>
                      <div className="pp-progress">
                        <div className={`pp-progress-fill ${child.attendance >= 95 ? "green" : "orange"}`} style={{ width: `${child.attendance}%` }} />
                      </div>
                      <div className="pp-footnote">
                        <FaRegClock className="pp-footnote-icon" />
                        {child.attendanceHistory?.[0]
                          ? `Latest record: ${child.attendanceHistory[0].status} on ${child.attendanceHistory[0].dateText}`
                          : "No attendance history yet."}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === "announcements" && (
            <section className="pp-panel">
              <div className="pp-panel-header">
                <h3>Live updates</h3>
              </div>
              <div className="pp-panel-divider" />
              <div className="pp-stack-list">
                {updates.length === 0 ? (
                  <div className="pp-empty-state">No real-time updates are available yet.</div>
                ) : (
                  updateGroups.map((group) => {
                    const isExpanded = !!expandedUpdateMonths[group.key];
                    return (
                      <section key={group.key} className="pp-update-group">
                        <button
                          type="button"
                          className={`pp-update-group-toggle ${isExpanded ? "expanded" : ""}`}
                          onClick={() => toggleUpdateMonth(group.key)}
                        >
                          <div>
                            <strong>{group.label}</strong>
                            <span>{group.items.length} update{group.items.length !== 1 ? "s" : ""}</span>
                          </div>
                          <span className="pp-update-group-arrow">{isExpanded ? "▾" : "▸"}</span>
                        </button>

                        {isExpanded ? (
                          <div className="pp-update-group-list">
                            {group.items.map((item) => (
                              <article key={item.id} className="pp-list-card">
                                <div className="pp-list-card-head">
                                  <div>
                                    <h4>{item.title}</h4>
                                    <p>{item.body}</p>
                                  </div>
                                  <span className={`pp-chip ${item.accent}`}>{item.time}</span>
                                </div>
                              </article>
                            ))}
                          </div>
                        ) : null}
                      </section>
                    );
                  })
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      {selectedChild ? (
        <div className="pp-modal-overlay" onMouseDown={closeChildModal} role="presentation">
          <div className="pp-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="pp-modal-head">
              <div className="pp-modal-title-group">
                <div className="pp-modal-kicker">
                  {childModalView === "attendance" ? "Attendance record" : "Student overview"}
                </div>
                <h3>{selectedChild.name}</h3>
                <p>
                  {selectedChild.gradeLevel} • {selectedChild.classroom}
                </p>
              </div>
              <button type="button" className="pp-modal-close" onClick={closeChildModal}>
                ✕
              </button>
            </div>

            <div className="pp-modal-body">
              <div className="pp-modal-summary">
                <div className="pp-modal-summary-card">
                  <span>Average</span>
                  <strong>{modalSummary.averageLabel}</strong>
                </div>
                <div className="pp-modal-summary-card">
                  <span>Score</span>
                  <strong>{modalSummary.scoreLabel}</strong>
                </div>
                <div className="pp-modal-summary-card">
                  <span>Attendance</span>
                  <strong>{modalSummary.attendanceLabel}</strong>
                </div>
              </div>

              {childModalView === "details" ? (
                <>
                  <section className="pp-modal-section">
                    <div className="pp-modal-section-head">
                      <h4>Enrolled classes</h4>
                      {selectedModalClassId ? (
                        <button
                          type="button"
                          className="pp-modal-filter-reset"
                          onClick={() => setSelectedModalClassId("")}
                        >
                          Show all classes
                        </button>
                      ) : null}
                    </div>
                    <div className="pp-modal-class-grid">
                      {(selectedChild.classes || []).length === 0 ? (
                        <div className="pp-empty-inline">No class records yet.</div>
                      ) : (
                        selectedChild.classes.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className={`pp-class-pill pp-class-pill-button ${selectedModalClassId === item.id ? "active" : ""}`}
                            onClick={() => setSelectedModalClassId((current) => (current === item.id ? "" : item.id))}
                          >
                            <strong>{item.name}</strong>
                            <span>{item.courseName} • {item.teacherName}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </section>

                  <section className="pp-modal-section">
                    <div className="pp-modal-section-head">
                      <h4>Grades by class</h4>
                      <span className="pp-modal-section-meta">
                        {selectedModalClass ? `Showing ${selectedModalClass.name}` : "Showing all classes"}
                      </span>
                    </div>
                    <div className="pp-modal-list">
                      {(selectedChild.grades || []).length === 0 ? (
                        <div className="pp-empty-inline">No grades recorded yet.</div>
                      ) : filteredModalGrades.length === 0 ? (
                        <div className="pp-empty-inline">No grades recorded yet for this class.</div>
                      ) : (
                        filteredModalGrades.map((item) => (
                          <article key={item.id} className="pp-modal-list-item">
                            <div>
                              <strong>{item.label}</strong>
                              <p>
                                {item.className} • {item.courseName}
                              </p>
                            </div>
                            <div className="pp-modal-metric">
                              <strong>{item.score}/{item.maxScore}</strong>
                              <span>{item.percent}% • {item.dateText}</span>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  </section>
                </>
              ) : (
                <section className="pp-modal-section">
                  <div className="pp-modal-section-head">
                    <h4>Attendance history</h4>
                  </div>
                  <div className="pp-modal-class-grid">
                    <button
                      type="button"
                      className={`pp-class-pill pp-class-pill-button ${selectedModalClassId === "" ? "active" : ""}`}
                      onClick={() => setSelectedModalClassId("")}
                    >
                      <strong>All classes</strong>
                      <span>Show attendance from every enrolled class</span>
                    </button>
                    {(selectedChild.classes || []).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`pp-class-pill pp-class-pill-button ${selectedModalClassId === item.id ? "active" : ""}`}
                        onClick={() => setSelectedModalClassId(item.id)}
                      >
                        <strong>{item.name}</strong>
                        <span>{item.courseName} • {item.teacherName}</span>
                      </button>
                    ))}
                  </div>
                  <div className="pp-modal-subsection-head">
                    <h5>Attendance records</h5>
                    <span className="pp-modal-section-meta">
                      {selectedModalClass ? `Showing ${selectedModalClass.name}` : "Showing all classes"}
                    </span>
                  </div>
                  <div className="pp-modal-list">
                    {(selectedChild.attendanceHistory || []).length === 0 ? (
                      <div className="pp-empty-inline">No attendance records yet.</div>
                    ) : filteredModalAttendance.length === 0 ? (
                      <div className="pp-empty-inline">No attendance records yet for this class.</div>
                    ) : (
                      filteredModalAttendance.map((item) => (
                        <article key={item.id} className="pp-modal-list-item">
                          <div>
                            <strong>{item.className}</strong>
                            <p>{item.note || "No extra note"}</p>
                          </div>
                          <div className="pp-modal-metric">
                            <strong className={`pp-status-text ${item.status.toLowerCase()}`}>{item.status}</strong>
                            <span>{item.dateText}</span>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
