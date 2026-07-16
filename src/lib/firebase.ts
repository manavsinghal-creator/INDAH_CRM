import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const crmDatabaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_CRM_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_CRM_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_CRM_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_CRM_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_CRM_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_CRM_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);
export const isCrmDatabaseConfigured = Object.values(crmDatabaseConfig).every(Boolean);

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const crmDatabaseApp = isCrmDatabaseConfigured
  ? getApps().find((candidate) => candidate.name === "crm-database") ??
    initializeApp(crmDatabaseConfig, "crm-database")
  : app;
const db = getFirestore(crmDatabaseApp);
const storage = getStorage(app);

export { app, db, storage };
