const fs = require("fs");
const path = require("path");
const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword, signOut } = require("firebase/auth");
const { getFirestore, doc, getDoc } = require("firebase/firestore");

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

async function run() {
  loadEnvFile(path.join(process.cwd(), ".env"));
  const app = initializeApp({
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  });
  const auth = getAuth(app);
  const db = getFirestore(app);

  await signInWithEmailAndPassword(auth, "teacher.demo@techdonish.app", "Demo@12345");
  const ids = ["demo-course-1", "demo-class-1", "demo-exam-1", "demo-grade-1", "demo-attendance-1", "demo-session-1", "demo-resource-1"];
  for (const [collection, id] of [
    ["courses", "demo-course-1"],
    ["classes", "demo-class-1"],
    ["exams", "demo-exam-1"],
    ["grades", "demo-grade-1"],
    ["attendance", "demo-attendance-1"],
    ["classSessions", "demo-session-1"],
    ["resources", "demo-resource-1"],
  ]) {
    const snap = await getDoc(doc(db, collection, id));
    console.log(`${collection}/${id}: ${snap.exists() ? "exists" : "missing"}`);
  }
  const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
  console.log(`users/${auth.currentUser.uid}: ${userSnap.exists() ? "exists" : "missing"}`);
  if (userSnap.exists()) {
    const data = userSnap.data();
    console.log(`teacher status=${data.status}, role=${data.role}, fullName=${data.fullName}`);
  }
  await signOut(auth);
}

run().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
