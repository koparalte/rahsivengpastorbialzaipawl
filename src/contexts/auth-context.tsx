
"use client";

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, GoogleAuthProvider, signInWithPopup, firebaseSignOut, firebaseInitializationError } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  // Initialize authError with any error from firebase.ts
  const [authError, setAuthError] = useState<string | null>(firebaseInitializationError);
  const { toast } = useToast();

  useEffect(() => {
    // If there was an initialization error from firebase.ts, don't try to use auth.
    if (firebaseInitializationError) {
      setLoading(false);
      // authError is already set by useState, no need to set it again here
      return;
    }
    
    // If auth object itself is null, but no explicit firebaseInitializationError was caught,
    // this is also a critical issue.
    if (!auth) {
        setLoading(false);
        if (!authError) { // Set error only if not already set by initialization
          setAuthError("Firebase Auth service is not available. This might be due to a configuration issue not caught during initial setup.");
        }
        return;
    }

    // Clear any previous auth error if we are proceeding with auth setup
    setAuthError(null); 

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    }, (error) => {
      console.error("Auth state change error:", error);
      const newError = error.message || "Could not verify authentication status.";
      setAuthError(newError);
      toast({
        title: "Authentication Error",
        description: newError,
        variant: "destructive",
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast, authError]); // authError dependency added to potentially re-evaluate if it changes

  const loginWithGoogle = async () => {
    if (firebaseInitializationError) {
      toast({
        title: "Login Error",
        description: `Firebase initialization failed: ${firebaseInitializationError}`,
        variant: "destructive",
      });
      setAuthError(firebaseInitializationError);
      return;
    }
    if (!auth) {
      const errMsg = "Firebase Auth service is not available for login. Please check your Firebase configuration and ensure the project is set up correctly.";
      toast({
        title: "Login Error",
        description: errMsg,
        variant: "destructive",
      });
      setAuthError(errMsg);
      return;
    }

    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast({
        title: "Login Successful",
        description: "You've successfully signed in with Google.",
      });
      setAuthError(null); // Clear error on success
    } catch (error: any) {
      console.error("Google login error (full object):", error); 
      let errorMessage = "Failed to sign in with Google. Please try again.";
      if (error.code) {
        switch (error.code) {
          case 'auth/popup-closed-by-user':
            errorMessage = "Login cancelled: The Google Sign-In popup was closed by the user.";
            break;
          case 'auth/cancelled-popup-request':
          case 'auth/popup-blocked':
            errorMessage = "Login cancelled: Popup was blocked or multiple popups were opened. Please allow popups for this site.";
            break;
          case 'auth/unauthorized-domain':
            errorMessage = "Login Error: This domain (localhost) is not authorized for Google Sign-In. Please double-check your Firebase project's Authentication settings under 'Authorized domains'. Ensure 'localhost' is listed exactly and that changes have propagated (can take a few minutes). Also, verify you are configuring the correct Firebase project in your .env.local file.";
            break;
          case 'auth/operation-not-allowed':
            errorMessage = "Login Error: Google Sign-In is not enabled for this Firebase project. Please enable it in the Firebase console (Authentication > Sign-in method).";
            break;
          case 'auth/network-request-failed':
            errorMessage = "Login Error: A network error occurred. Please check your internet connection and try again.";
            break;
          default:
            errorMessage = error.message || errorMessage;
        }
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setAuthError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (firebaseInitializationError) {
        toast({
          title: "Logout Error",
          description: `Firebase initialization failed: ${firebaseInitializationError}`,
          variant: "destructive",
        });
        setAuthError(firebaseInitializationError);
        return;
    }
    if (!auth) {
      const errMsg = "Firebase Auth service is not available for logout.";
      toast({
        title: "Logout Error",
        description: errMsg,
        variant: "destructive",
      });
      setAuthError(errMsg);
      return;
    }
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      setAuthError(null); // Clear error on success
    } catch (error: any) {
      console.error("Logout error (full object):", error); 
      const errorMessage = error.message || "Failed to log out. Please try again.";
      toast({
        title: "Logout Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setAuthError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout, authError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
