import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBbiAkjwjHCDAmMBxRlubE6Tf2yu5y4HIg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "device-streaming-20a455a9.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "device-streaming-20a455a9",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "device-streaming-20a455a9.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1031020231387",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1031020231387:web:e15b804369bc49e44a6afe",
};

export const firebaseProjectId = firebaseConfig.projectId;
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

auth.languageCode = "pt-BR";
