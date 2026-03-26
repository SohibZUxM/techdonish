// src/TeacherPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import "./TeacherPage.css";
import {
  FiHome,
  FiBookOpen,
  FiCheckSquare,
  FiUsers,
  FiBarChart2,
  FiSettings,
  FiLogOut,
  FiHelpCircle,
  FiClipboard,
  FiCalendar,
  FiPlus,
  FiBell,
  FiFolder,
} from "react-icons/fi";
import PortalMobileTabs from "./PortalMobileTabs";

import { auth, db, storage } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  setDoc,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import useRealtimeList from "./useRealtimeList";
import useRealtimeWhereIn from "./useRealtimeWhereIn";
import useRealtimeDocsByIds from "./useRealtimeDocsByIds";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";

/* ===================== ResourceModal ===================== */
function ResourceModal({ myClasses, selectedClassId, onSubmit, onClose }) {
  const uploadTimeoutMs = 45000;
  const [resType, setResType] = useState("link"); // "link" | "file"
  const [classId, setClassId] = useState(selectedClassId || "");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setClassId(selectedClassId || "");
  }, [selectedClassId]);

  const handleFileChange = async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    // Allow retrying the same file after an error or timeout.
    input.value = "";

    setFormError("");
    setUploadError("");
    setFileUrl("");
    setFileName("");
    setUploadProgress(0);
    setUploading(true);

    try {
      const fileRef = storageRef(storage, `resources/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(fileRef, file, {
        contentType: file.type || "application/pdf",
      });

      const snap = await new Promise((resolve, reject) => {
        let timeoutId = null;
        let finished = false;
        let unsubscribe = () => {};

        const cleanup = () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          unsubscribe();
        };

        const finish = (handler, value) => {
          if (finished) return;
          finished = true;
          cleanup();
          handler(value);
        };

        const resetTimeout = () => {
          if (timeoutId) clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            uploadTask.cancel();
            finish(
              reject,
              new Error(
                "Upload timed out. Check your connection or Firebase Storage configuration and try again."
              )
            );
          }, uploadTimeoutMs);
        };

        resetTimeout();

        unsubscribe = uploadTask.on(
          "state_changed",
          (snapshot) => {
            const percent = snapshot.totalBytes
              ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
              : 0;
            setUploadProgress(percent);
            resetTimeout();
          },
          (err) => {
            finish(reject, err);
          },
          () => {
            finish(resolve, uploadTask.snapshot);
          }
        );
      });

      const downloadUrl = await Promise.race([
        getDownloadURL(snap.ref),
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(
              new Error(
                "Upload finished, but the file URL could not be retrieved. Check Firebase Storage rules and try again."
              )
            );
          }, uploadTimeoutMs);
        }),
      ]);

      setFileUrl(downloadUrl);
      setFileName(file.name);
      setUploadProgress(100);
      setUploadError("");
      if (!title.trim()) {
        setTitle(file.name);
      }
    } catch (err) {
      console.error("Upload error:", err);
      const code = err?.code || "";
      const message =
        code === "storage/unauthorized"
          ? "Upload failed: Firebase Storage rules do not allow this teacher account to upload files."
          : code === "storage/canceled"
            ? "Upload canceled before completion."
            : `Upload failed: ${err?.message || "unknown error"}. Check Firebase Storage rules.`;
      setUploadError(message);
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const cleanClassId = String(classId || "").trim();
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const finalUrl = resType === "file" ? fileUrl : url.trim();

    if (!cleanClassId || !cleanTitle || !finalUrl) {
      setFormError("Please complete all required fields before saving.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        classId: cleanClassId,
        title: cleanTitle,
        url: finalUrl,
        description: cleanDescription,
        resourceType: resType,
        fileName: fileName || null,
      });
    } catch (err) {
      console.error("Resource save error:", err);
      setFormError(err?.message || "Failed to save resource.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="tp-modal-form"
      onSubmit={handleSubmit}
      encType={resType === "file" ? "multipart/form-data" : undefined}
    >
      <label>Class</label>
      <select
        name="classId"
        required
        value={classId}
        onChange={(e) => setClassId(e.target.value)}
      >
        <option value="">Select class...</option>
        {myClasses.map((cl) => (
          <option key={cl.id} value={cl.id}>
            {cl.name}
          </option>
        ))}
      </select>

      <label>Title</label>
      <input
        name="title"
        required
        placeholder="e.g. Chapter 5 Notes, Past Exam Paper..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <label>Resource Type</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
        <button
          type="button"
          onClick={() => {
            setResType("link");
            setFileUrl("");
            setFileName("");
            setUploadError("");
            setFormError("");
          }}
          style={{
            padding: "6px 18px",
            borderRadius: 8,
            border: "1.5px solid",
            borderColor: resType === "link" ? "#2563eb" : "#d1d5db",
            background: resType === "link" ? "#eff6ff" : "#fff",
            color: resType === "link" ? "#1d4ed8" : "#374151",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          🔗 Link / URL
        </button>
        <button
          type="button"
          onClick={() => {
            setResType("file");
            setUrl("");
            setFileUrl("");
            setFileName("");
            setUploadError("");
            setFormError("");
          }}
          style={{
            padding: "6px 18px",
            borderRadius: 8,
            border: "1.5px solid",
            borderColor: resType === "file" ? "#2563eb" : "#d1d5db",
            background: resType === "file" ? "#eff6ff" : "#fff",
            color: resType === "file" ? "#1d4ed8" : "#374151",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          📄 File (PDF, Doc…)
        </button>
      </div>

      {resType === "link" && (
        <>
          <label>URL</label>
          <input
            name="url"
            type="url"
            required
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </>
      )}

      {resType === "file" && (
        <>
          <label>Upload File</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.zip"
            onChange={handleFileChange}
            required={!fileUrl}
            style={{ fontSize: 13 }}
          />
          {uploading && (
            <div style={{ fontSize: 12, color: "#2563eb", marginTop: 4 }}>
              Uploading... {uploadProgress}%
            </div>
          )}
          {fileUrl && !uploading && (
            <div style={{ fontSize: 12, color: "#16a34a", marginTop: 4 }}>
              ✅ {fileName ? `${fileName} uploaded successfully` : "File uploaded successfully"}
            </div>
          )}
          {uploadError && (
            <div style={{ fontSize: 11, color: "#d97706", marginTop: 4 }}>{uploadError}</div>
          )}
        </>
      )}

      <label>Description (optional)</label>
      <input
        name="description"
        placeholder="Short description of the resource..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      {formError ? (
        <div style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>{formError}</div>
      ) : null}

      <div className="tp-modal-actions">
        <button type="button" className="tp-modal-btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="tp-modal-btn"
          type="submit"
          disabled={uploading || saving || (resType === "file" && !fileUrl)}
        >
          {uploading ? "Uploading…" : saving ? "Saving..." : "Save Resource"}
        </button>
      </div>
    </form>
  );
}


/* ===================== Small helper ===================== */
function safeDateLabel(ts) {
  try {
    if (!ts) return "—";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString();
  } catch {
    return "—";
  }
}

function getTimestampValue(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();

  const dateValue = value?.toDate ? value.toDate() : new Date(value);
  const time = dateValue instanceof Date ? dateValue.getTime() : NaN;
  return Number.isNaN(time) ? 0 : time;
}

export default function TeacherPage() {
  const navigate = useNavigate();

  const resolveTeacherProfile = async (uid, email) => {
    const rawEmail = String(email || "").trim();
    const normalizedEmail = rawEmail.toLowerCase();
    if (!rawEmail) {
      return null;
    }

    const userRef = doc(db, "users", uid);
    for (const candidateEmail of [normalizedEmail, rawEmail]) {
      const directQuery = query(
        collection(db, "users"),
        where("email", "==", candidateEmail),
        limit(1)
      );
      const emailSnap = await getDocs(directQuery);
      if (emailSnap.empty) {
        continue;
      }

      const matchedDoc = emailSnap.docs[0];
      const data = matchedDoc.data();

      if (matchedDoc.id !== uid) {
        await setDoc(
          userRef,
          {
            ...data,
            email: data.email || normalizedEmail,
            migratedFromDocId: matchedDoc.id,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        return {
          ...data,
          migratedFromDocId: matchedDoc.id,
        };
      }

      return data;
    }
    return null;
  };

  // ========== UI STATE ==========
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard|classes|exams|gradebook|attendance|students|schedule|reports|resources
  const [modal, setModal] = useState(null); // exam|grade|attendance|schedule|resource|null
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [attendanceDraft, setAttendanceDraft] = useState({
    classId: "",
    studentUid: "",
    status: "present",
    date: new Date().toISOString().slice(0, 10),
    note: "",
  });

  // ========== AUTH/UID STATE (FIX) ==========
  const [teacherUid, setTeacherUid] = useState(null);
  const [teacherLookupIds, setTeacherLookupIds] = useState([]);
  const [authReady, setAuthReady] = useState(false);

  // ========== PROFILE (dynamic) ==========
  const [teacherProfile, setTeacherProfile] = useState({
    fullName: "Teacher",
    email: "",
    role: "teacher",
    status: "",
  });

  // ========== AUTH GUARD ==========
  useEffect(() => {
    let unsubProfile = null;

    const resetTeacherSession = () => {
      setTeacherUid(null);
      setTeacherLookupIds([]);
      setAuthReady(false);
      setTeacherProfile({
        fullName: "Teacher",
        email: "",
        role: "teacher",
        status: "",
      });
    };

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      resetTeacherSession();

      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (!user) {
        setAuthReady(true);
        navigate("/");
        return;
      }

      setTeacherUid(user.uid);

      unsubProfile = onSnapshot(
        doc(db, "users", user.uid),
        async (snap) => {
          if (!snap.exists()) {
            try {
              const fallbackProfile = await resolveTeacherProfile(
                user.uid,
                user.email
              );
              if (
                !fallbackProfile ||
                fallbackProfile.role !== "teacher" ||
                fallbackProfile.status !== "active"
              ) {
                navigate("/pending");
                return;
              }

              setTeacherProfile({
                fullName: fallbackProfile.fullName || "Teacher",
                email: fallbackProfile.email || user.email || "",
                role: fallbackProfile.role || "teacher",
                status: fallbackProfile.status || "",
              });
              setTeacherLookupIds(
                [...new Set([user.uid, fallbackProfile.migratedFromDocId].filter(Boolean))]
              );
              setAuthReady(true);
            } catch (fallbackErr) {
              console.error("Teacher fallback profile load failed:", fallbackErr);
              navigate("/pending");
            }
            return;
          }

          const data = snap.data();
          if (data.role !== "teacher" || data.status !== "active") {
            navigate("/pending");
            return;
          }

          setTeacherProfile({
            fullName: data.fullName || "Teacher",
            email: data.email || user.email || "",
            role: data.role || "teacher",
            status: data.status || "",
          });
          setTeacherLookupIds(
            [...new Set([user.uid, data.migratedFromDocId].filter(Boolean))]
          );
          setAuthReady(true);
        },
        (err) => {
          console.error("Profile listener error:", err);
          setAuthReady(true);
        }
      );
    });

    return () => {
      if (unsubProfile) unsubProfile();
      unsubAuth();
    };
  }, [navigate]);

  // ========== REALTIME DATA ==========

  const myClassesRaw = useRealtimeWhereIn(
    "classes",
    "teacherUid",
    teacherLookupIds,
    teacherLookupIds.length > 0 && authReady
  );

  const myClasses = useMemo(
    () =>
      [...myClassesRaw].sort(
        (a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt)
      ),
    [myClassesRaw]
  );

  const enrollmentsForSelectedClass = useRealtimeList(
    () =>
      query(collection(db, "enrollments"), where("classId", "==", selectedClassId)),
    [selectedClassId],
    !!selectedClassId
  );

  const myExamsRaw = useRealtimeWhereIn(
    "exams",
    "teacherUid",
    teacherLookupIds,
    teacherLookupIds.length > 0 && authReady
  );

  const myExams = useMemo(
    () =>
      [...myExamsRaw].sort(
        (a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt)
      ),
    [myExamsRaw]
  );

  const recentGradesRaw = useRealtimeWhereIn(
    "grades",
    "teacherUid",
    teacherLookupIds,
    teacherLookupIds.length > 0 && authReady
  );

  const recentGrades = useMemo(
    () =>
      [...recentGradesRaw]
        .sort(
          (a, b) =>
            getTimestampValue(b.date || b.createdAt) - getTimestampValue(a.date || a.createdAt)
        )
        .slice(0, 8),
    [recentGradesRaw]
  );

  const dashboardRecentGrades = useMemo(() => recentGrades.slice(0, 4), [recentGrades]);

  // ========== HELPERS ==========
  const closeModal = () => setModal(null);

  const getClassById = useCallback(
    (classId) => myClasses.find((c) => c.id === classId) || null,
    [myClasses]
  );

  const getClassLabel = useCallback(
    (classId) => {
      const cls = myClasses.find((c) => c.id === classId);
      return cls?.name || cls?.code || "Class";
    },
    [myClasses]
  );

  const getExamLabel = useCallback(
    (examId) => {
      if (!examId) return "Grade";
      const ex = myExams.find((x) => x.id === examId);
      return ex?.title || examId || "Exam";
    },
    [myExams]
  );

  const examsForSelectedClass = useMemo(() => {
    if (!selectedClassId) return [];
    return myExams.filter((e) => e.classId === selectedClassId);
  }, [myExams, selectedClassId]);

  // ========== DYNAMIC STATS ==========
  const [allEnrollmentsState, setAllEnrollmentsState] = useState({
    key: "",
    map: {},
  });
  const classesKey = useMemo(
    () => myClasses.map((cl) => cl.id).sort().join("|"),
    [myClasses]
  );

  useEffect(() => {
    if (myClasses.length === 0) return;

    const unsubs = myClasses.map((cl) => {
      const q = query(collection(db, "enrollments"), where("classId", "==", cl.id));
      return onSnapshot(
        q,
        (snap) => {
          const uids = snap.docs.map((d) => d.data()?.studentUid).filter(Boolean);
          setAllEnrollmentsState((prev) => ({
            key: classesKey,
            map: {
              ...(prev.key === classesKey ? prev.map : {}),
              [cl.id]: uids,
            },
          }));
        },
        (err) => console.error("Enrollment listener error:", err)
      );
    });

    return () => unsubs.forEach((fn) => fn && fn());
  }, [classesKey, myClasses]);

  const allEnrollmentsMap = useMemo(() => {
    return allEnrollmentsState.key === classesKey ? allEnrollmentsState.map : {};
  }, [allEnrollmentsState, classesKey]);

  const allStudentIds = useMemo(() => {
    const ids = new Set();
    Object.values(allEnrollmentsMap).forEach((arr) => {
      (arr || []).forEach((uid) => {
        if (uid) ids.add(String(uid));
      });
    });
    return [...ids];
  }, [allEnrollmentsMap]);

  const teacherStudentsRaw = useRealtimeDocsByIds(
    "users",
    allStudentIds,
    allStudentIds.length > 0 && authReady
  );

  const teacherStudents = useMemo(
    () =>
      [...teacherStudentsRaw]
        .filter((student) => student?.role === "student")
        .sort((a, b) => {
          const left = (a.fullName || a.email || a.id || "").toLowerCase();
          const right = (b.fullName || b.email || b.id || "").toLowerCase();
          return left.localeCompare(right);
        }),
    [teacherStudentsRaw]
  );

  const getStudentLabel = useCallback(
    (studentUid) => {
      const s = teacherStudents.find((x) => x.id === studentUid);
      return s?.fullName || s?.email || studentUid || "Unknown";
    },
    [teacherStudents]
  );

  const selectedClassStudents = useMemo(() => {
    if (!selectedClassId) return [];
    const ids = enrollmentsForSelectedClass.map((e) => e.studentUid);
    return ids.map((id) => teacherStudents.find((s) => s.id === id)).filter(Boolean);
  }, [selectedClassId, enrollmentsForSelectedClass, teacherStudents]);

  const studentClassesMap = useMemo(() => {
    const entries = {};
    Object.entries(allEnrollmentsMap).forEach(([classId, studentIds]) => {
      const className = getClassLabel(classId);
      (studentIds || []).forEach((studentUid) => {
        if (!studentUid) return;
        if (!entries[studentUid]) entries[studentUid] = [];
        if (!entries[studentUid].includes(className)) {
          entries[studentUid].push(className);
        }
      });
    });
    Object.values(entries).forEach((classNames) => classNames.sort());
    return entries;
  }, [allEnrollmentsMap, getClassLabel]);

  const stats = useMemo(() => {
    const classCount = myClasses.length;

    const allStudentUids = new Set();
    Object.values(allEnrollmentsMap).forEach((arr) => (arr || []).forEach((u) => allStudentUids.add(u)));
    const uniqueStudents = allStudentUids.size;

    const examCount = myExams.length;
    const gradedCount = recentGrades.length;

    return [
      { label: "My Classes", value: String(classCount), emoji: "📚" },
      { label: "Students", value: String(uniqueStudents), emoji: "👩‍🎓" },
      { label: "Exams", value: String(examCount), emoji: "📝" },
      { label: "Recent Grades", value: String(gradedCount), emoji: "✅" },
    ];
  }, [myClasses.length, allEnrollmentsMap, myExams.length, recentGrades.length]);

  // ========== ACTIONS ==========
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const handleAddExam = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const classId = String(fd.get("classId") || "");
    const title = String(fd.get("title") || "").trim();
    const dateStr = String(fd.get("date") || "");
    const maxScore = Number(fd.get("maxScore") || 100);

    if (!classId || !title) return;

    await addDoc(collection(db, "exams"), {
      classId,
      title,
      date: dateStr ? new Date(dateStr) : null,
      maxScore: Number.isFinite(maxScore) ? maxScore : 100,
      teacherUid: teacherUid || null,
      createdAt: serverTimestamp(),
    });

    closeModal();
  };

  // ✅ exam optional
  const handleAddGrade = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const classId = String(fd.get("classId") || "");
    const studentUid = String(fd.get("studentUid") || "");
    const examIdRaw = String(fd.get("examId") || ""); // optional
    const label = String(fd.get("label") || "").trim(); // optional
    const dateStr = String(fd.get("date") || "").trim();
    const score = Number(fd.get("score") || 0);

    const maxScoreInput = fd.get("maxScore");
    const maxScoreTyped =
      maxScoreInput === null || maxScoreInput === "" ? null : Number(maxScoreInput);

    if (!classId || !studentUid) return;
    if (!Number.isFinite(score)) return;

    const ex = examIdRaw ? myExams.find((x) => x.id === examIdRaw) : null;

    const finalMaxScore = Number.isFinite(maxScoreTyped)
      ? maxScoreTyped
      : (ex?.maxScore ?? 100);

    await addDoc(collection(db, "grades"), {
      classId,
      studentUid,
      examId: examIdRaw || null,
      label: label || (ex?.title ?? null),
      date: dateStr ? new Date(`${dateStr}T00:00:00`) : null,
      score,
      maxScore: finalMaxScore,
      teacherUid: teacherUid || null,
      createdAt: serverTimestamp(),
    });

    closeModal();
  };

  const handleAddResource = async ({
    classId,
    title,
    url,
    description,
    resourceType,
    fileName,
  }) => {
    const cleanClassId = String(classId || "").trim();
    const cleanTitle = String(title || "").trim();
    const cleanUrl = String(url || "").trim();
    const cleanDescription = String(description || "").trim();

    if (!cleanClassId || !cleanTitle || !cleanUrl) {
      throw new Error("Missing required resource details.");
    }

    await addDoc(collection(db, "resources"), {
      classId: cleanClassId,
      title: cleanTitle,
      url: cleanUrl,
      description: cleanDescription || null,
      resourceType: resourceType || "link",
      fileName: fileName || null,
      teacherUid: teacherUid || null,
      createdAt: serverTimestamp(),
    });

    closeModal();
  };

  const handleAddAttendance = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const classId = String(fd.get("classId") || "").trim();
    const studentUid = String(fd.get("studentUid") || "").trim();
    const status = String(fd.get("status") || "present").trim().toLowerCase();
    const dateStr = String(fd.get("date") || "").trim();
    const note = String(fd.get("note") || "").trim();

    if (!classId || !studentUid || !dateStr) return;

    const attendanceDocId = `${classId}_${studentUid}_${dateStr}`;
    await setDoc(
      doc(db, "attendance", attendanceDocId),
      {
        classId,
        studentUid,
        status,
        date: new Date(`${dateStr}T00:00:00`),
        note: note || null,
        teacherUid: teacherUid || null,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    closeModal();
  };

  const handleScheduleClass = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const classId = String(fd.get("classId") || "");
    const startsAtStr = String(fd.get("startsAt") || "");
    const endsAtStr = String(fd.get("endsAt") || "");
    const location = String(fd.get("location") || "").trim();
    const note = String(fd.get("note") || "").trim();

    if (!classId || !startsAtStr) return;

    const startsAt = new Date(startsAtStr);
    const endsAt = endsAtStr ? new Date(endsAtStr) : null;

    await addDoc(collection(db, "classSessions"), {
      classId,
      startsAt,
      endsAt,
      location: location || null,
      note: note || null,
      teacherUid: teacherUid || null,
      createdAt: serverTimestamp(),
    });

    closeModal();
  };

  const myAttendanceRaw = useRealtimeWhereIn(
    "attendance",
    "teacherUid",
    teacherLookupIds,
    teacherLookupIds.length > 0 && authReady
  );

  const myAttendance = useMemo(
    () =>
      [...myAttendanceRaw].sort(
        (a, b) =>
          getTimestampValue(b.date || b.createdAt) - getTimestampValue(a.date || a.createdAt)
      ),
    [myAttendanceRaw]
  );

  const selectedClass = selectedClassId ? getClassById(selectedClassId) : null;

  const latestAttendanceByStudent = useMemo(() => {
    const map = new Map();
    myAttendance.forEach((item) => {
      if (!selectedClassId || item.classId !== selectedClassId || !item.studentUid) return;
      if (!map.has(item.studentUid)) {
        map.set(item.studentUid, item);
      }
    });
    return map;
  }, [myAttendance, selectedClassId]);

  const openAttendanceModal = (studentUid = "", classId = selectedClassId || myClasses[0]?.id || "") => {
    if (classId) setSelectedClassId(classId);
    setAttendanceDraft({
      classId,
      studentUid,
      status: "present",
      date: new Date().toISOString().slice(0, 10),
      note: "",
    });
    setModal("attendance");
  };

  // Sessions this teacher has scheduled (simple list for Schedule tab)
  const mySessionsRaw = useRealtimeWhereIn(
    "classSessions",
    "teacherUid",
    teacherLookupIds,
    teacherLookupIds.length > 0 && authReady
  );

  const mySessions = useMemo(
    () =>
      [...mySessionsRaw].sort(
        (a, b) => getTimestampValue(a.startsAt) - getTimestampValue(b.startsAt)
      ),
    [mySessionsRaw]
  );

  // Resources this teacher has uploaded
  const myResourcesRaw = useRealtimeWhereIn(
    "resources",
    "teacherUid",
    teacherLookupIds,
    teacherLookupIds.length > 0 && authReady
  );

  const myResources = useMemo(
    () =>
      [...myResourcesRaw].sort(
        (a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt)
      ),
    [myResourcesRaw]
  );

  // All grades by this teacher (for Reports tab - no limit)
  const allMyGradesRaw = useRealtimeWhereIn(
    "grades",
    "teacherUid",
    teacherLookupIds,
    teacherLookupIds.length > 0 && authReady
  );

  const allMyGrades = useMemo(
    () =>
      [...allMyGradesRaw].sort(
        (a, b) => getTimestampValue(b.date || b.createdAt) - getTimestampValue(a.date || a.createdAt)
      ),
    [allMyGradesRaw]
  );

  const selectedClassGrades = useMemo(() => {
    if (!selectedClassId) return [];
    return allMyGrades.filter((item) => item.classId === selectedClassId);
  }, [allMyGrades, selectedClassId]);
  const teacherTabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "classes", label: "My Classes" },
    { id: "exams", label: "Exams" },
    { id: "gradebook", label: "Gradebook" },
    { id: "attendance", label: "Attendance" },
    { id: "students", label: "Students" },
    { id: "schedule", label: "Schedule" },
    { id: "reports", label: "Reports" },
    { id: "resources", label: "Resources" },
  ];

  if (!authReady) {
    return <div style={{ padding: 30, color: "#6b7280" }}>Loading...</div>;
  }

  return (
    <div className="tp-root">
      {/* ============ SIDEBAR ============ */}
      <aside className="tp-sidebar">
        <div className="tp-logo">
          <div className="tp-logo-icon">🎓</div>
          <span className="tp-logo-text">Hamsafar</span>
        </div>

        <div className="tp-sidebar-main">
          <nav className="tp-nav tp-nav-top">
            <button
              className={`tp-nav-item ${activeTab === "dashboard" ? "tp-nav-item-active" : ""}`}
              onClick={() => {
                setModal(null);
                setActiveTab("dashboard");
              }}
              type="button"
            >
              <FiHome className="tp-nav-icon" />
              <span>Dashboard</span>
            </button>

            <button
              className={`tp-nav-item ${activeTab === "classes" ? "tp-nav-item-active" : ""}`}
              onClick={() => {
                setModal(null);
                setActiveTab("classes");
              }}
              type="button"
            >
              <FiBookOpen className="tp-nav-icon" />
              <span>My Classes</span>
            </button>

            <button
              className={`tp-nav-item ${activeTab === "exams" ? "tp-nav-item-active" : ""}`}
              onClick={() => {
                setModal(null);
                setActiveTab("exams");
              }}
              type="button"
            >
              <FiClipboard className="tp-nav-icon" />
              <span>Exams</span>
            </button>

            <button
              className={`tp-nav-item ${activeTab === "gradebook" ? "tp-nav-item-active" : ""}`}
              onClick={() => {
                setModal(null);
                setActiveTab("gradebook");
              }}
              type="button"
            >
              <FiCheckSquare className="tp-nav-icon" />
              <span>Gradebook</span>
            </button>

            <button
              className={`tp-nav-item ${activeTab === "attendance" ? "tp-nav-item-active" : ""}`}
              onClick={() => {
                setModal(null);
                setActiveTab("attendance");
              }}
              type="button"
            >
              <FiCalendar className="tp-nav-icon" />
              <span>Attendance</span>
            </button>

            <button
              className={`tp-nav-item ${activeTab === "students" ? "tp-nav-item-active" : ""}`}
              onClick={() => {
                setModal(null);
                setActiveTab("students");
              }}
              type="button"
            >
              <FiUsers className="tp-nav-icon" />
              <span>Students</span>
            </button>

            <button
              className={`tp-nav-item ${activeTab === "schedule" ? "tp-nav-item-active" : ""}`}
              onClick={() => {
                setModal(null);
                setActiveTab("schedule");
              }}
              type="button"
            >
              <FiCalendar className="tp-nav-icon" />
              <span>Schedule</span>
            </button>

            <button
              className={`tp-nav-item ${activeTab === "reports" ? "tp-nav-item-active" : ""}`}
              onClick={() => {
                setModal(null);
                setActiveTab("reports");
              }}
              type="button"
            >
              <FiBarChart2 className="tp-nav-icon" />
              <span>Reports</span>
            </button>

            <button
              className={`tp-nav-item ${activeTab === "resources" ? "tp-nav-item-active" : ""}`}
              onClick={() => {
                setModal(null);
                setActiveTab("resources");
              }}
              type="button"
            >
              <FiFolder className="tp-nav-icon" />
              <span>Resources</span>
            </button>
          </nav>

          <nav className="tp-nav tp-nav-bottom">
            <div className="tp-nav-divider" />
            <button className="tp-nav-item" type="button">
              <FiSettings className="tp-nav-icon" />
              <span>Settings</span>
            </button>
            <button className="tp-nav-item" type="button">
              <FiHelpCircle className="tp-nav-icon" />
              <span>Help</span>
            </button>
            <button className="tp-nav-item tp-nav-logout" onClick={handleLogout} type="button">
              <FiLogOut className="tp-nav-icon" />
              <span>Logout</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* ============ MAIN AREA ============ */}
      <div className="tp-main">
        <header className="tp-topbar">
          <div className="tp-topbar-left">
            <h1>Welcome back, {teacherProfile.fullName}!</h1>
            <p>Manage your classes, exams, and grading in real time.</p>
          </div>

          <div className="tp-topbar-right">
            {/* Notifications */}
            <div style={{ position: "relative", marginRight: 12 }}>
              <button
                type="button"
                className="tp-icon-btn"
                aria-label="Notifications"
                onClick={() => setShowNotifications((p) => !p)}
              >
                <FiBell />
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
                className="tp-topbar-profile-btn"
                onClick={() => setShowProfileMenu((p) => !p)}
                style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <img
                  src="https://i.pravatar.cc/60?img=47"
                  alt={teacherProfile.fullName}
                  className="tp-topbar-avatar"
                />
                <div style={{ textAlign: "left" }}>
                  <div className="tp-topbar-name">{teacherProfile.fullName}</div>
                  <div className="tp-topbar-role">Teacher</div>
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

        <div className="tp-mobile-nav">
          <PortalMobileTabs
            items={teacherTabs}
            activeTab={activeTab}
            ariaLabel="Teacher portal navigation"
            onChange={(nextTab) => {
              setModal(null);
              setActiveTab(nextTab);
            }}
          />
        </div>

        <main className="tp-content">
          {/* ===== DASHBOARD ===== */}
          {activeTab === "dashboard" && (
            <>
              <section className="tp-stats-row">
                {stats.map((s) => (
                  <div key={s.label} className="tp-stat-card">
                    <div className="tp-stat-icon tp-stat-icon-blue">{s.emoji}</div>
                    <p className="tp-stat-title">{s.label}</p>
                    <p className="tp-stat-value">{s.value}</p>
                  </div>
                ))}
              </section>

              <section className="tp-bottom-row">
                <div className="tp-card tp-quick-card">
                  <div className="tp-card-header">
                    <h3>Quick Actions</h3>
                  </div>

                  <div className="tp-quick-actions-list">
                    <button
                      className="tp-quick-btn tp-quick-primary"
                      type="button"
                      onClick={() => {
                        setModal("exam");
                        if (!selectedClassId && myClasses[0]?.id) setSelectedClassId(myClasses[0].id);
                      }}
                    >
                      <FiPlus style={{ marginRight: 8 }} /> Add Exam
                    </button>

                    <button
                      className="tp-quick-btn"
                      type="button"
                      onClick={() => {
                        setModal("grade");
                        if (!selectedClassId && myClasses[0]?.id) setSelectedClassId(myClasses[0].id);
                      }}
                    >
                      ✅ Grade Student
                    </button>

                    <button
                      className="tp-quick-btn"
                      type="button"
                      onClick={() => {
                        setModal("schedule");
                        if (!selectedClassId && myClasses[0]?.id) setSelectedClassId(myClasses[0].id);
                      }}
                    >
                      📅 Schedule Class
                    </button>
                  </div>
                </div>

                <div className="tp-card">
                  <div className="tp-card-header">
                    <h3>Recent Grades</h3>
                    <button
                      className="tp-link-button"
                      type="button"
                      onClick={() => setActiveTab("gradebook")}
                      disabled={recentGrades.length === 0}
                    >
                      View all
                    </button>
                  </div>

                  {recentGrades.length === 0 ? (
                    <div style={{ color: "#6b7280" }}>No grades yet.</div>
                  ) : (
                    <ul className="tp-announce-list" style={{ marginTop: 10 }}>
                      {dashboardRecentGrades.map((g) => (
                        <li key={g.id} className="tp-announce-item tp-announce-blue">
                          <p className="tp-announce-title">
                            {(g.examId ? getExamLabel(g.examId) : (g.label || "Grade"))} •{" "}
                            {getStudentLabel(g.studentUid)}
                          </p>
                          <p className="tp-announce-text">
                            Class: {getClassLabel(g.classId)} • Score: {g.score}/{g.maxScore}
                          </p>
                          <span className="tp-announce-time">{safeDateLabel(g.date || g.createdAt)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </>
          )}

          {/* ===== CLASSES ===== */}
          {activeTab === "classes" && (
            <section className="tp-middle-row">
              <div className="tp-card">
                <div className="tp-card-header">
                  <h3>My Classes</h3>
                </div>

                {myClasses.length === 0 ? (
                  <div style={{ color: "#6b7280" }}>No classes assigned to you yet.</div>
                ) : (
                  myClasses.map((cl) => {
                    const isSelected = selectedClassId === cl.id;
                    return (
                      <div
                        key={cl.id}
                        className={`tp-class-card ${isSelected ? "tp-class-card-active" : ""}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedClassId(cl.id)}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelectedClassId(cl.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <div>
                          <p className="tp-class-name">{cl.name}</p>
                          <p className="tp-class-sub">Code: {cl.code || "Not set"}</p>
                          <p className="tp-class-time">{isSelected ? "Selected" : "Click to view students"}</p>
                        </div>
                        <span className={`tp-class-pill ${isSelected ? "tp-class-pill-active" : ""}`}>
                          {isSelected ? "Active" : "View"}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="tp-card">
                <div className="tp-card-header">
                  <h3>Enrolled Students</h3>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="tp-cta tp-cta-small"
                      type="button"
                      onClick={() => openAttendanceModal()}
                      disabled={!selectedClassId}
                      title={!selectedClassId ? "Select a class first" : ""}
                    >
                      Attendance
                    </button>
                    <button
                      className="tp-cta tp-cta-small"
                      type="button"
                      onClick={() => setModal("grade")}
                      disabled={!selectedClassId}
                      title={!selectedClassId ? "Select a class first" : ""}
                    >
                      ✅ Grade
                    </button>
                    <button
                      className="tp-cta tp-cta-small"
                      type="button"
                      onClick={() => setModal("exam")}
                      disabled={!selectedClassId}
                    >
                      📝 Add Exam
                    </button>
                  </div>
                </div>

                {!selectedClassId ? (
                  <div style={{ color: "#6b7280" }}>Select a class to see its students.</div>
                ) : selectedClassStudents.length === 0 ? (
                  <div style={{ color: "#6b7280" }}>
                    No enrolled students yet in <b>{selectedClass?.name}</b>.
                  </div>
                ) : (
                  <ul className="tp-announce-list" style={{ marginTop: 10 }}>
                    {selectedClassStudents.map((s) => (
                      <li key={s.id} className="tp-announce-item tp-announce-green">
                        <p className="tp-announce-title">{s.fullName || "Unnamed student"}</p>
                        <p className="tp-announce-text">{s.email}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}

          {/* ===== EXAMS ===== */}
          {activeTab === "exams" && (
            <section className="tp-card">
              <div className="tp-card-header">
                <h3>Exams</h3>
                <button className="tp-cta tp-cta-small" type="button" onClick={() => setModal("exam")}>
                  + New Exam
                </button>
              </div>

              {myExams.length === 0 ? (
                <div style={{ color: "#6b7280" }}>No exams yet.</div>
              ) : (
                <ul className="tp-announce-list" style={{ marginTop: 10 }}>
                  {myExams.map((ex) => (
                    <li key={ex.id} className="tp-announce-item tp-announce-yellow">
                      <p className="tp-announce-title">{ex.title}</p>
                      <p className="tp-announce-text">
                        Class: {getClassLabel(ex.classId)} • Max: {ex.maxScore} • Date:{" "}
                        {ex.date ? safeDateLabel(ex.date) : "—"}
                      </p>
                      <span className="tp-announce-time">{safeDateLabel(ex.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* ===== GRADEBOOK ===== */}
          {activeTab === "gradebook" && (
            <section className="tp-middle-row">
              <div className="tp-card">
                <div className="tp-card-header">
                  <h3>My Classes</h3>
                </div>

                {myClasses.length === 0 ? (
                  <div style={{ color: "#6b7280" }}>No classes assigned to you yet.</div>
                ) : (
                  myClasses.map((cl) => {
                    const isSelected = selectedClassId === cl.id;
                    const gradeCount = allMyGrades.filter((item) => item.classId === cl.id).length;
                    return (
                      <div
                        key={cl.id}
                        className={`tp-class-card ${isSelected ? "tp-class-card-active" : ""}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedClassId(cl.id)}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelectedClassId(cl.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <div>
                          <p className="tp-class-name">{cl.name}</p>
                          <p className="tp-class-sub">Code: {cl.code || "Not set"}</p>
                          <p className="tp-class-time">
                            {isSelected
                              ? `Showing ${gradeCount} grade record${gradeCount !== 1 ? "s" : ""}`
                              : "Click to open grade records"}
                          </p>
                        </div>
                        <span className={`tp-class-pill ${isSelected ? "tp-class-pill-active" : ""}`}>
                          {isSelected ? "Active" : gradeCount}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="tp-card">
                <div className="tp-card-header">
                  <div>
                    <h3>Grade records</h3>
                    <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
                      {selectedClass
                        ? `Showing ${selectedClass.name}`
                        : "Select a class to see all grades recorded for that class."}
                    </div>
                  </div>
                  <button
                    className="tp-cta tp-cta-small"
                    type="button"
                    onClick={() => setModal("grade")}
                    disabled={!selectedClassId}
                    title={!selectedClassId ? "Select a class first" : ""}
                  >
                    + Add Grade
                  </button>
                </div>

                {!selectedClassId ? (
                  <div style={{ color: "#6b7280" }}>Select a class to see its grade records.</div>
                ) : selectedClassGrades.length === 0 ? (
                  <div style={{ color: "#6b7280" }}>
                    No grades recorded yet in <b>{selectedClass?.name}</b>.
                  </div>
                ) : (
                  <ul className="tp-announce-list" style={{ marginTop: 10 }}>
                    {selectedClassGrades.map((g) => (
                      <li key={g.id} className="tp-announce-item tp-announce-blue">
                        <p className="tp-announce-title">
                          {(g.examId ? getExamLabel(g.examId) : (g.label || "Grade"))} •{" "}
                          {getStudentLabel(g.studentUid)}
                        </p>
                        <p className="tp-announce-text">
                          Class: {getClassLabel(g.classId)} • Score: {g.score}/{g.maxScore}
                        </p>
                        <span className="tp-announce-time">{safeDateLabel(g.date || g.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}

          {/* ===== ATTENDANCE ===== */}
          {activeTab === "attendance" && (
            <section className="tp-middle-row">
              <div className="tp-card">
                <div className="tp-card-header">
                  <h3>My Classes</h3>
                </div>

                {myClasses.length === 0 ? (
                  <div style={{ color: "#6b7280" }}>No classes assigned to you yet.</div>
                ) : (
                  myClasses.map((cl) => {
                    const isSelected = selectedClassId === cl.id;
                    return (
                      <div
                        key={cl.id}
                        className={`tp-class-card ${isSelected ? "tp-class-card-active" : ""}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedClassId(cl.id)}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelectedClassId(cl.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <div>
                          <p className="tp-class-name">{cl.name}</p>
                          <p className="tp-class-sub">Code: {cl.code || "Not set"}</p>
                          <p className="tp-class-time">{isSelected ? "Selected for attendance" : "Click to open register"}</p>
                        </div>
                        <span className={`tp-class-pill ${isSelected ? "tp-class-pill-active" : ""}`}>
                          {isSelected ? "Active" : "Open"}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="tp-card">
                <div className="tp-card-header">
                  <h3>Attendance Register</h3>
                  <button
                    className="tp-cta tp-cta-small"
                    type="button"
                    onClick={() => openAttendanceModal()}
                    disabled={!selectedClassId}
                  >
                    + Mark Attendance
                  </button>
                </div>

                {!selectedClassId ? (
                  <div style={{ color: "#6b7280" }}>Select a class to see its attendance register.</div>
                ) : selectedClassStudents.length === 0 ? (
                  <div style={{ color: "#6b7280" }}>
                    No enrolled students yet in <b>{selectedClass?.name}</b>.
                  </div>
                ) : (
                  <ul className="tp-announce-list" style={{ marginTop: 10 }}>
                    {selectedClassStudents.map((student) => {
                      const latest = latestAttendanceByStudent.get(student.id) || null;
                      const latestStatus = latest ? String(latest.status || "").toLowerCase() : "";
                      const cardClass =
                        latestStatus === "present"
                          ? "tp-announce-green"
                          : latestStatus === "late" || latestStatus === "excused"
                            ? "tp-announce-yellow"
                            : latestStatus === "absent"
                              ? "tp-announce-blue"
                              : "tp-announce-blue";

                      return (
                        <li key={student.id} className={`tp-announce-item ${cardClass}`}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                            <div>
                              <p className="tp-announce-title">{student.fullName || "Unnamed student"}</p>
                              <p className="tp-announce-text">
                                {student.email || "No email"}
                                {latest
                                  ? ` • ${String(latest.status || "").replace(/^\w/, (char) => char.toUpperCase())} on ${safeDateLabel(latest.date || latest.createdAt)}`
                                  : " • No attendance marked yet"}
                              </p>
                              {latest?.note ? (
                                <span className="tp-announce-time">{latest.note}</span>
                              ) : null}
                            </div>

                            <button
                              className="tp-cta tp-cta-small"
                              type="button"
                              onClick={() => openAttendanceModal(student.id, selectedClassId)}
                            >
                              {latest ? "Update" : "Mark"}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          )}

          {/* ===== STUDENTS ===== */}
          {activeTab === "students" && (
            <section className="tp-card">
              <div className="tp-card-header">
                <h3>Students</h3>
                <div style={{ color: "#6b7280", fontSize: 13 }}>
                  All students enrolled in your classes.
                </div>
              </div>

              {myClasses.length === 0 ? (
                <div style={{ color: "#6b7280" }}>No classes assigned to you yet.</div>
              ) : teacherStudents.length === 0 ? (
                <div style={{ color: "#6b7280" }}>No students are enrolled in your classes yet.</div>
              ) : (
                <ul className="tp-announce-list" style={{ marginTop: 10 }}>
                  {teacherStudents.map((s) => (
                    <li key={s.id} className="tp-announce-item tp-announce-green">
                      <p className="tp-announce-title">{s.fullName || "Unnamed student"}</p>
                      <p className="tp-announce-text">
                        {s.email || "No email"}
                        {studentClassesMap[s.id]?.length
                          ? ` • ${studentClassesMap[s.id].join(", ")}`
                          : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* ===== SCHEDULE ===== */}
          {activeTab === "schedule" && (
            <section className="tp-card">
              <div className="tp-card-header">
                <h3>Schedule</h3>
                <button className="tp-cta tp-cta-small" type="button" onClick={() => setModal("schedule")}>
                  + Schedule Class
                </button>
              </div>

              {mySessions.length === 0 ? (
                <div style={{ color: "#6b7280" }}>
                  No scheduled sessions yet. Use &quot;Schedule Class&quot; to add one.
                </div>
              ) : (
                <ul className="tp-announce-list" style={{ marginTop: 10 }}>
                  {mySessions.map((s) => {
                    const cls = getClassById(s.classId);
                    return (
                      <li key={s.id} className="tp-announce-item tp-announce-yellow">
                        <p className="tp-announce-title">
                          {cls?.name || cls?.code || "Class"} •{" "}
                          {s.location || "No location set"}
                        </p>
                        <p className="tp-announce-text">
                          Starts: {safeDateLabel(s.startsAt)}{" "}
                          {s.endsAt ? `• Ends: ${safeDateLabel(s.endsAt)}` : ""}
                        </p>
                        {s.note ? (
                          <span className="tp-announce-time">{s.note}</span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          {/* ===== REPORTS ===== */}
          {activeTab === "reports" && (() => {
            // Compute per-class averages from allMyGrades
            const classAvgMap = {};
            for (const g of allMyGrades) {
              if (!g.classId) continue;
              if (!classAvgMap[g.classId]) classAvgMap[g.classId] = { sum: 0, count: 0 };
              const max = Number(g.maxScore || 100);
              const sc = Number(g.score || 0);
              if (max > 0) {
                classAvgMap[g.classId].sum += (sc / max) * 100;
                classAvgMap[g.classId].count += 1;
              }
            }
            const rows = Object.entries(classAvgMap).map(([classId, { sum, count }]) => ({
              classId,
              className: getClassLabel(classId),
              avg: count > 0 ? Math.round(sum / count) : null,
              count,
            }));

            return (
              <section className="tp-card">
                <div className="tp-card-header">
                  <h3>Reports</h3>
                </div>
                {rows.length === 0 ? (
                  <div style={{ color: "#6b7280" }}>No grade data yet. Add grades to see reports.</div>
                ) : (
                  <>
                    <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>
                      Average score per class (based on {allMyGrades.length} recorded grade{allMyGrades.length !== 1 ? "s" : ""}).
                    </p>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                      <thead>
                        <tr style={{ background: "#f1f5f9" }}>
                          <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600 }}>Class</th>
                          <th style={{ textAlign: "center", padding: "8px 12px", fontWeight: 600 }}>Grades</th>
                          <th style={{ textAlign: "center", padding: "8px 12px", fontWeight: 600 }}>Average</th>
                          <th style={{ textAlign: "center", padding: "8px 12px", fontWeight: 600 }}>Rating</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => {
                          const pct = r.avg;
                          const color = pct == null ? "#9ca3af" : pct >= 90 ? "#16a34a" : pct >= 75 ? "#2563eb" : pct >= 60 ? "#d97706" : "#dc2626";
                          const label = pct == null ? "—" : pct >= 90 ? "Excellent" : pct >= 75 ? "Good" : pct >= 60 ? "Average" : "Needs Improvement";
                          return (
                            <tr key={r.classId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "10px 12px", fontWeight: 500 }}>{r.className}</td>
                              <td style={{ padding: "10px 12px", textAlign: "center", color: "#6b7280" }}>{r.count}</td>
                              <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color }}>
                                {pct == null ? "—" : `${pct}%`}
                              </td>
                              <td style={{ padding: "10px 12px", textAlign: "center" }}>
                                <span style={{ background: color + "18", color, borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                                  {label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </>
                )}
              </section>
            );
          })()}

          {/* ===== RESOURCES ===== */}
          {activeTab === "resources" && (
            <section className="tp-card">
              <div className="tp-card-header">
                <h3>Resources</h3>
                <button className="tp-cta tp-cta-small" type="button" onClick={() => setModal("resource")}>
                  + Add Resource
                </button>
              </div>

              {myResources.length === 0 ? (
                <div style={{ color: "#6b7280" }}>No resources uploaded yet. Click "+ Add Resource" to share a link with your students.</div>
              ) : (
                <ul className="tp-announce-list" style={{ marginTop: 10 }}>
                  {myResources.map((r) => (
                    <li key={r.id} className="tp-announce-item tp-announce-blue">
                      <p className="tp-announce-title">{r.title}</p>
                      <p className="tp-announce-text">
                        Class: {getClassLabel(r.classId)}
                        {r.description ? ` • ${r.description}` : ""}
                      </p>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tp-announce-time"
                        style={{ textDecoration: "underline", color: "#2563eb" }}
                      >
                        {r.url}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </main>

        <button className="tp-help-btn" type="button">
          <FiHelpCircle />
        </button>

        {/* ============ MODALS ============ */}
        {modal ? (
          <div className="tp-modal-overlay" onMouseDown={closeModal} role="presentation">
            <div className="tp-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <div className="tp-modal-head">
                <div className="tp-modal-title">
                  {modal === "exam" && "Add Exam"}
                  {modal === "grade" && "Grade Student"}
                  {modal === "attendance" && "Mark Attendance"}
                  {modal === "schedule" && "Schedule Class"}
                  {modal === "resource" && "Add Resource"}
                </div>

                <button className="tp-modal-x" type="button" onClick={closeModal}>
                  ✕
                </button>
              </div>

              {/* Add Exam */}
              {modal === "exam" && (
                <form className="tp-modal-form" onSubmit={handleAddExam}>
                  <label>Class</label>
                  <select name="classId" required defaultValue={selectedClassId || ""}>
                    <option value="">Select class...</option>
                    {myClasses.map((cl) => (
                      <option key={cl.id} value={cl.id}>
                        {cl.name}
                      </option>
                    ))}
                  </select>

                  <label>Exam Title</label>
                  <input name="title" required placeholder="e.g. Midterm 1" />

                  <label>Exam Date (optional)</label>
                  <input name="date" type="date" />

                  <label>Max Score</label>
                  <input name="maxScore" type="number" placeholder="100" defaultValue={100} />

                  <div className="tp-modal-actions">
                    <button type="button" className="tp-modal-btn ghost" onClick={closeModal}>
                      Cancel
                    </button>
                    <button className="tp-modal-btn" type="submit">
                      Save
                    </button>
                  </div>
                </form>
              )}

              {/* Grade Student */}
              {modal === "grade" && (
                <form className="tp-modal-form" onSubmit={handleAddGrade}>
                  <label>Class</label>
                  <select
                    name="classId"
                    required
                    value={selectedClassId || ""}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                  >
                    <option value="">Select class...</option>
                    {myClasses.map((cl) => (
                      <option key={cl.id} value={cl.id}>
                        {cl.name}
                      </option>
                    ))}
                  </select>

                  <div className="tp-field-row">
                    <div>
                      <label>Student</label>
                      <select name="studentUid" required disabled={!selectedClassId}>
                        <option value="">Select student...</option>
                        {selectedClassStudents.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.fullName || s.email}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label>Exam (optional)</label>
                      <select name="examId" disabled={!selectedClassId}>
                        <option value="">No exam</option>
                        {examsForSelectedClass.map((ex) => (
                          <option key={ex.id} value={ex.id}>
                            {ex.title} (max {ex.maxScore})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="tp-field-row">
                    <div>
                      <label>Score</label>
                      <input name="score" type="number" required placeholder="e.g. 87" />
                    </div>
                    <div>
                      <label>Max Score (optional)</label>
                      <input name="maxScore" type="number" placeholder="100" />
                    </div>
                  </div>

                  <label>Grade Date</label>
                  <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />

                  <label>Label / Note (optional)</label>
                  <input name="label" placeholder="e.g. Quiz 2, Homework 1, Participation..." />

                  <div className="tp-modal-actions">
                    <button type="button" className="tp-modal-btn ghost" onClick={closeModal}>
                      Cancel
                    </button>
                    <button className="tp-modal-btn" type="submit">
                      Save Grade
                    </button>
                  </div>

                  {!selectedClassId ? <div className="tp-modal-hint">Select a class to load enrolled students.</div> : null}
                </form>
              )}

              {/* Mark Attendance */}
              {modal === "attendance" && (
                <form className="tp-modal-form" onSubmit={handleAddAttendance}>
                  <label>Class</label>
                  <select
                    name="classId"
                    required
                    value={attendanceDraft.classId}
                    onChange={(e) => {
                      const nextClassId = e.target.value;
                      setAttendanceDraft((prev) => ({
                        ...prev,
                        classId: nextClassId,
                        studentUid: "",
                      }));
                      setSelectedClassId(nextClassId);
                    }}
                  >
                    <option value="">Select class...</option>
                    {myClasses.map((cl) => (
                      <option key={cl.id} value={cl.id}>
                        {cl.name}
                      </option>
                    ))}
                  </select>

                  <div className="tp-field-row">
                    <div>
                      <label>Student</label>
                      <select
                        name="studentUid"
                        required
                        value={attendanceDraft.studentUid}
                        onChange={(e) =>
                          setAttendanceDraft((prev) => ({ ...prev, studentUid: e.target.value }))
                        }
                        disabled={!attendanceDraft.classId}
                      >
                        <option value="">Select student...</option>
                        {selectedClassStudents.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.fullName || s.email}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label>Status</label>
                      <select
                        name="status"
                        value={attendanceDraft.status}
                        onChange={(e) =>
                          setAttendanceDraft((prev) => ({ ...prev, status: e.target.value }))
                        }
                      >
                        <option value="present">Present</option>
                        <option value="late">Late</option>
                        <option value="excused">Excused</option>
                        <option value="absent">Absent</option>
                      </select>
                    </div>
                  </div>

                  <div className="tp-field-row">
                    <div>
                      <label>Date</label>
                      <input
                        name="date"
                        type="date"
                        required
                        value={attendanceDraft.date}
                        onChange={(e) =>
                          setAttendanceDraft((prev) => ({ ...prev, date: e.target.value }))
                        }
                      />
                    </div>

                    <div>
                      <label>Note (optional)</label>
                      <input
                        name="note"
                        placeholder="Short note about attendance..."
                        value={attendanceDraft.note}
                        onChange={(e) =>
                          setAttendanceDraft((prev) => ({ ...prev, note: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="tp-modal-actions">
                    <button type="button" className="tp-modal-btn ghost" onClick={closeModal}>
                      Cancel
                    </button>
                    <button className="tp-modal-btn" type="submit">
                      Save Attendance
                    </button>
                  </div>

                  {!attendanceDraft.classId ? (
                    <div className="tp-modal-hint">Select a class to load students for attendance.</div>
                  ) : null}
                </form>
              )}

              {/* Add Resource */}
              {modal === "resource" && (() => {
                // Local resource type state is tracked via a hidden input trick
                // (We use a controlled select rendered inside the modal)
                return (
                  <ResourceModal
                    myClasses={myClasses}
                    selectedClassId={selectedClassId}
                    onSubmit={handleAddResource}
                    onClose={closeModal}
                  />
                );
              })()}

              {/* Schedule Class */}
              {modal === "schedule" && (
                <form className="tp-modal-form" onSubmit={handleScheduleClass}>
                  <label>Class</label>
                  <select name="classId" required defaultValue={selectedClassId || ""}>
                    <option value="">Select class...</option>
                    {myClasses.map((cl) => (
                      <option key={cl.id} value={cl.id}>
                        {cl.name}
                      </option>
                    ))}
                  </select>

                  <label>Start (date & time)</label>
                  <input name="startsAt" type="datetime-local" required />

                  <label>End (optional)</label>
                  <input name="endsAt" type="datetime-local" />

                  <label>Location (optional)</label>
                  <input name="location" placeholder="Room 204 / Zoom link / etc." />

                  <label>Note (optional)</label>
                  <input name="note" placeholder="Anything to remember..." />

                  <div className="tp-modal-actions">
                    <button type="button" className="tp-modal-btn ghost" onClick={closeModal}>
                      Cancel
                    </button>
                    <button className="tp-modal-btn" type="submit">
                      Schedule
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
