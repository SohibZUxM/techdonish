import { initializeApp, getApp, getApps } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const missing = (
  [
    ["EXPO_PUBLIC_FIREBASE_API_KEY", firebaseConfig.apiKey],
    ["EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN", firebaseConfig.authDomain],
    ["EXPO_PUBLIC_FIREBASE_PROJECT_ID", firebaseConfig.projectId],
    ["EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET", firebaseConfig.storageBucket],
    [
      "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
      firebaseConfig.messagingSenderId,
    ],
    ["EXPO_PUBLIC_FIREBASE_APP_ID", firebaseConfig.appId],
  ] as const
)
  .filter(([, value]) => !value)
  .map(([key]) => key);

export const firebaseConfigError =
  missing.length > 0
    ? `Missing Expo Firebase environment variables: ${missing.join(", ")}`
    : null;

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const initAuth = () => {
  try {
    if (Platform.OS === "web") {
      return initializeAuth(app, { persistence: browserLocalPersistence });
    }

    return initializeAuth(app);
  } catch {
    return getAuth(app);
  }
};

export const auth = initAuth();

export const db = getFirestore(app);
export const storage = getStorage(app);
