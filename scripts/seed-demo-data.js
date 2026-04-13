const fs = require("fs");
const path = require("path");
const { initializeApp } = require("firebase/app");
const {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} = require("firebase/auth");
const {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
} = require("firebase/firestore");

function loadEnvFile(envPath) {
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

async function ensureUser(auth, email, password) {
  try {
    const created = await createUserWithEmailAndPassword(auth, email, password);
    return created.user;
  } catch (error) {
    const code = String(error?.code || "");
    if (code.includes("email-already-in-use")) {
      const signedIn = await signInWithEmailAndPassword(auth, email, password);
      return signedIn.user;
    }
    throw error;
  }
}

async function ensureSignedInUser(auth, email, password) {
  try {
    const signed = await signInWithEmailAndPassword(auth, email, password);
    return signed.user;
  } catch (error) {
    const code = String(error?.code || "");
    if (code.includes("invalid-credential") || code.includes("user-not-found")) {
      const created = await createUserWithEmailAndPassword(auth, email, password);
      return created.user;
    }
    throw error;
  }
}

async function run() {
  const root = process.cwd();
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) {
    throw new Error("Missing .env file in project root.");
  }
  loadEnvFile(envPath);

  const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  const required = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId",
  ];
  const missing = required.filter((key) => !firebaseConfig[key]);
  if (missing.length) {
    throw new Error(`Missing Firebase config keys: ${missing.join(", ")}`);
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const demoAccounts = {
    student: { email: "student.demo@techdonish.app", password: "Demo@12345" },
    teacher: { email: "teacher.demo@techdonish.app", password: "Demo@12345" },
    parent: { email: "parent.demo@techdonish.app", password: "Demo@12345" },
  };

  const studentUser = await ensureSignedInUser(
    auth,
    demoAccounts.student.email,
    demoAccounts.student.password
  );

  const ids = {
    course: "demo-course-1",
    class: "demo-class-1",
    enrollment: `demo-enrollment-${studentUser.uid}`,
    exam: "demo-exam-1",
    grade: "demo-grade-1",
    attendance: "demo-attendance-1",
    session: "demo-session-1",
    resource: "demo-resource-1",
  };

  await setDoc(
    doc(db, "users", studentUser.uid),
    {
      email: demoAccounts.student.email,
      fullName: "Ahmad",
      role: "student",
      status: "active",
      requestedRole: "student",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await signOut(auth);

  const teacherUser = await ensureSignedInUser(
    auth,
    demoAccounts.teacher.email,
    demoAccounts.teacher.password
  );

  await setDoc(
    doc(db, "users", teacherUser.uid),
    {
      email: demoAccounts.teacher.email,
      fullName: "Anvar",
      role: "teacher",
      status: "active",
      requestedRole: "teacher",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await signOut(auth);

  const parentUser = await ensureSignedInUser(
    auth,
    demoAccounts.parent.email,
    demoAccounts.parent.password
  );

  await setDoc(
    doc(db, "users", parentUser.uid),
    {
      email: demoAccounts.parent.email,
      fullName: "Alisher",
      role: "parent",
      status: "active",
      requestedRole: "parent",
      childStudentIds: [studentUser.uid],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await signOut(auth);

  await signInWithEmailAndPassword(
    auth,
    demoAccounts.teacher.email,
    demoAccounts.teacher.password
  );

  await setDoc(
    doc(db, "courses", ids.course),
    {
      name: "Mathematics Foundations",
      code: "MATH-101",
      description: "Core mathematics concepts and problem solving.",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await setDoc(
    doc(db, "classes", ids.class),
    {
      name: "Grade 10 - Section A",
      code: "G10-A",
      courseId: ids.course,
      teacherUid: teacherUser.uid,
      teacherName: "Anvar",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await setDoc(
    doc(db, "enrollments", ids.enrollment),
    {
      classId: ids.class,
      studentUid: studentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await setDoc(
    doc(db, "exams", ids.exam),
    {
      classId: ids.class,
      title: "Unit Test 1",
      maxScore: 100,
      teacherUid: teacherUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await setDoc(
    doc(db, "grades", ids.grade),
    {
      classId: ids.class,
      studentUid: studentUser.uid,
      teacherUid: teacherUser.uid,
      label: "Unit Test 1",
      score: 84,
      maxScore: 100,
      date: new Date(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await setDoc(
    doc(db, "attendance", ids.attendance),
    {
      classId: ids.class,
      studentUid: studentUser.uid,
      teacherUid: teacherUser.uid,
      status: "present",
      date: new Date(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
  await setDoc(
    doc(db, "classSessions", ids.session),
    {
      classId: ids.class,
      teacherUid: teacherUser.uid,
      startsAt,
      endsAt,
      location: "Room 203",
      note: "Bring notebook and calculator.",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await setDoc(
    doc(db, "resources", ids.resource),
    {
      classId: ids.class,
      teacherUid: teacherUser.uid,
      title: "Algebra Revision Sheet",
      description: "Practice worksheet for this week.",
      resourceType: "link",
      url: "https://example.com/algebra-revision",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  console.log("Seed completed.");
  console.log(`Project: ${firebaseConfig.projectId}`);
  console.log("Demo logins:");
  console.log(`Student: ${demoAccounts.student.email} / ${demoAccounts.student.password}`);
  console.log(`Teacher: ${demoAccounts.teacher.email} / ${demoAccounts.teacher.password}`);
  console.log(`Parent:  ${demoAccounts.parent.email} / ${demoAccounts.parent.password}`);

  await signOut(auth);
}

run().catch((error) => {
  console.error("Seeding failed:", error.message || error);
  process.exitCode = 1;
});
