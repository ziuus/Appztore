import { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, type User as FirebaseUser } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

export const useAuth = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error("Google Sign-In failed", error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Sign-out failed", error);
    }
  };

  return { user, isLoading, handleGoogleSignIn, handleSignOut };
};
