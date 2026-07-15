import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyPlaceholderForLocalDevOnly",
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || "pulsetalk-dummy.firebaseapp.com",
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || "pulsetalk-dummy",
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || "pulsetalk-dummy.appspot.com",
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || "1:000000000000:web:0000000000000000000000",
  measurementId: (import.meta as any).env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export let analytics: any = null;

// Only initialize analytics if we are in a browser context and have a valid (non-placeholder) API key
const isDummyKey = firebaseConfig.apiKey.includes("DummyKeyPlaceholder");
if (typeof window !== "undefined" && !isDummyKey) {
  isSupported().then((supported) => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
      } catch (err) {
        console.warn("Firebase Analytics failed to initialize:", err);
      }
    }
  }).catch((err) => {
    console.warn("Firebase Analytics support check failed:", err);
  });
}