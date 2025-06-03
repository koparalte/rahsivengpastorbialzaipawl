
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
    if (firebaseInitializationError) {
      setLoading(false);
      // authError is already set by useState
      return;
    }
    
    if (!auth) {
        setLoading(false);
        if (!authError) { 
          const msg = "Firebase Auth service is not available. This might be due to a configuration issue not caught during initial setup.";
          setAuthError(msg);
          toast({
            title: "Authentication Error",
            description: msg,
            variant: "destructive",
          });
        }
        return;
    }

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
  }, [toast, authError]);

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
    setAuthError(null); // Clear previous errors before attempting login
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast({
        title: "Login Successful",
        description: "You've successfully signed in with Google.",
      });
      // authError is already null
    } catch (error: any) {
      console.error("Google login error (full object):", error); 
      let errorMessage = "Failed to sign in with Google. Please try again.";
      if (error.code) {
        switch (error.code) {
          case 'auth/popup-closed-by-user':
            errorMessage = "Login cancelled: The Google Sign-In popup was closed before completion.";
            break;
          case 'auth/cancelled-popup-request':
            errorMessage = "Login cancelled: Multiple popup requests. Please try again.";
            break;
          case 'auth/popup-blocked':
            errorMessage = "Login failed: Popup was blocked by the browser. Please allow popups for this site and try again.";
            break;
          case 'auth/unauthorized-domain':
            errorMessage = "Login Error: This domain is not authorized for Google Sign-In. Please contact support or check Firebase project configuration if you are an admin.";
            break;
          case 'auth/operation-not-allowed':
            errorMessage = "Login Error: Google Sign-In is not enabled for this Firebase project. Please contact support.";
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
    setAuthError(null); // Clear previous errors
    try {
      await firebaseSignOut(auth);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      // authError is already null
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
