import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

// Firebase configuration from environment variables.
// All VITE_FIREBASE_* vars are optional — if none are set, Firebase is disabled
// and the app runs in guest/local mode without auth.
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
const appId = import.meta.env.VITE_FIREBASE_APP_ID;

// Firebase is considered "configured" only when a real API key is provided.
export const firebaseConfigured =
  !!apiKey &&
  apiKey !== "YOUR_API_KEY" &&
  apiKey.length > 10;

let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _googleProvider: GoogleAuthProvider | null = null;

if (firebaseConfigured) {
  try {
    app = initializeApp({
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
    });
    _auth = getAuth(app);
    _googleProvider = new GoogleAuthProvider();
  } catch (err) {
    console.warn("Firebase initialization failed:", err);
  }
}

// Export nullable auth — callers must check firebaseConfigured before using.
export const auth = _auth;
export const googleProvider = _googleProvider;
