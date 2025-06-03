
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
  const [authError, setAuthError] = useState<string | null>(firebaseInitializationError);
  const { toast } = useToast();

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      if (!authError) { // Set error only if not already set by initialization
        setAuthError("Firebase Auth is not available. Please check your Firebase configuration.");
      }
      return;
    }
    setAuthError(null); // Clear any previous init error if auth is now available
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    }, (error) => {
      console.error("Auth state change error:", error);
      setAuthError(error.message);
      setLoading(false);
      toast({
        title: "Authentication Error",
        description: "Could not verify authentication status.",
        variant: "destructive",
      });
    });

    return () => unsubscribe();
  }, [toast, authError]);

  const loginWithGoogle = async () => {
    if (!auth) {
      toast({
        title: "Login Error",
        description: "Firebase Auth is not available.",
        variant: "destructive",
      });
      setAuthError("Firebase Auth is not available for login.");
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
      setAuthError(null);
    } catch (error: any) {
      console.error("Google login error:", error);
      let errorMessage = "Failed to sign in with Google. Please try again.";
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "Login cancelled. The Google Sign-In popup was closed.";
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = "Login cancelled. Multiple login popups were opened.";
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
    if (!auth) {
      toast({
        title: "Logout Error",
        description: "Firebase Auth is not available.",
        variant: "destructive",
      });
      setAuthError("Firebase Auth is not available for logout.");
      return;
    }
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      setAuthError(null);
    } catch (error: any) {
      console.error("Logout error:", error);
      toast({
        title: "Logout Failed",
        description: error.message || "Failed to log out. Please try again.",
        variant: "destructive",
      });
      setAuthError(error.message);
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
