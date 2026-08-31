import { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth, googleProvider, firebaseConfigured } from "../firebase";

export const useAuth = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If Firebase is not configured, skip auth entirely — run as guest.
    if (!firebaseConfigured || !auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        localStorage.setItem("appztore_user_id", currentUser.uid);
      } else {
        localStorage.removeItem("appztore_user_id");
      }
      setUser(currentUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    if (!firebaseConfigured || !auth || !googleProvider) {
      throw new Error(
        "Firebase is not configured. Add VITE_FIREBASE_* environment variables to enable Google Sign-In."
      );
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error("Google Sign-In failed", error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    if (!firebaseConfigured || !auth) return;
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Sign-out failed", error);
    }
  };

  return { user, isLoading, handleGoogleSignIn, handleSignOut };
};
