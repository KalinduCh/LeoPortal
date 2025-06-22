// src/hooks/use-auth.ts
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  type User as FirebaseUser 
} from 'firebase/auth';
import { auth } from '@/lib/firebase/clientApp';
import { createUserProfile, getUserProfile } from '@/services/userService';
import type { User } from '@/types';
import { useToast } from './use-toast';

// Define a result type for the login function for more detailed feedback
export interface LoginResult {
  user: User | null;
  success: boolean;
  reason?: 'pending' | 'not_found' | 'invalid_credentials';
}

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthOperationInProgress: boolean;
  login: (email: string, pass: string) => Promise<LoginResult>;
  signup: (name: string, email: string, pass: string) => Promise<User | null>;
  logout: () => Promise<void>;
  performAdminAuthOperation: (asyncTask: () => Promise<void>) => Promise<void>;
  setAuthOperationInProgress: (inProgress: boolean) => void;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthOperationInProgress, setIsAuthOperationInProgress] = useState(false);
  const { toast } = useToast();
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const logoutDueToInactivity = useCallback(() => {
    // Directly sign out. The onAuthStateChanged listener will handle state updates.
    firebaseSignOut(auth);
    toast({
        title: "Session Expired",
        description: "You have been logged out due to inactivity.",
        variant: "destructive",
        duration: 7000
    });
  }, [toast]);

  const resetInactivityTimeout = useCallback(() => {
    if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
    }
    
    if (user) { 
        const timeoutDuration = user.role === 'admin' 
            ? 30 * 60 * 1000 // 30 minutes for admins
            : 20 * 60 * 1000; // 20 minutes for members

        inactivityTimeoutRef.current = setTimeout(logoutDueToInactivity, timeoutDuration);
    }
  }, [user, logoutDueToInactivity]);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setIsLoading(true);
      if (fbUser) {
        setFirebaseUser(fbUser);
        const userProfile = await getUserProfile(fbUser.uid);
        if (userProfile) {
          if (userProfile.status === 'pending') {
             setUser(null);
             // Don't sign out here if the login logic already handles it.
             // But if a pending user somehow gets an auth state, clear it.
             if (auth.currentUser) await firebaseSignOut(auth);
          } else {
            setUser(userProfile);
          }
        } else {
           setUser(null);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setIsLoading(false);
      setIsAuthOperationInProgress(false);
    });

    return () => unsubscribe();
  }, []);

  // Set up inactivity listeners when user is authenticated
  useEffect(() => {
    if (user && !isLoading) {
        const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        
        resetInactivityTimeout(); // Set the initial timeout

        // Add event listeners to reset timeout on activity
        events.forEach(event => window.addEventListener(event, resetInactivityTimeout));

        // Cleanup function
        return () => {
            if (inactivityTimeoutRef.current) {
                clearTimeout(inactivityTimeoutRef.current);
            }
            events.forEach(event => window.removeEventListener(event, resetInactivityTimeout));
        };
    }
  }, [user, isLoading, resetInactivityTimeout]);


  const login = useCallback(async (email: string, pass: string): Promise<LoginResult> => {
    setIsAuthOperationInProgress(true);
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const fbUser = userCredential.user;
      const userProfile = await getUserProfile(fbUser.uid);

      if (!userProfile) {
        await firebaseSignOut(auth);
        setIsLoading(false);
        setIsAuthOperationInProgress(false);
        return { user: null, success: false, reason: 'not_found' };
      }

      if (userProfile.status === 'pending') {
        await firebaseSignOut(auth);
        setIsLoading(false);
        setIsAuthOperationInProgress(false);
        return { user: null, success: false, reason: 'pending' };
      }
      
      setUser(userProfile);
      setIsLoading(false);
      setIsAuthOperationInProgress(false);
      return { user: userProfile, success: true };

    } catch (error: any) {
      console.error("Firebase login error:", error.message);
      setIsLoading(false);
      setIsAuthOperationInProgress(false);
      return { user: null, success: false, reason: 'invalid_credentials' };
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, pass: string): Promise<User | null> => {
    setIsAuthOperationInProgress(true);
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const fbUser = userCredential.user;
      
      await createUserProfile(fbUser.uid, email, name, 'member', 'pending'); 
      const newUserProfile = await getUserProfile(fbUser.uid); 
      
      await firebaseSignOut(auth);
      
      setIsLoading(false);
      setIsAuthOperationInProgress(false);
      return newUserProfile;

    } catch (error: any)
    {
      console.error("Firebase signup error:", error.message);
      setIsLoading(false);
      setIsAuthOperationInProgress(false);
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
    }
    setIsAuthOperationInProgress(true);
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      console.error("Firebase logout error:", error.message);
      setIsLoading(false);
      setIsAuthOperationInProgress(false);
    }
  }, []);

  const performAdminAuthOperation = useCallback(async (asyncTask: () => Promise<void>): Promise<void> => {
    setIsAuthOperationInProgress(true);
    setIsLoading(true);
    try {
      await asyncTask();
    } catch (error: any) {
      console.error("Admin auth operation error:", error.message);
      setIsLoading(false);
      setIsAuthOperationInProgress(false);
      throw error;
    }
  }, []);


  return { user, firebaseUser, isLoading, isAuthOperationInProgress, login, signup, logout, performAdminAuthOperation, setAuthOperationInProgress: setIsAuthOperationInProgress };
}
