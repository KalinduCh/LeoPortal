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
import { createUserProfile, getUserProfile, updateFcmToken } from '@/services/userService';
import type { User } from '@/types';
import { useToast } from './use-toast';

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
  signup: (name: string, email: string, pass: string) => Promise<User | null>; // Return User or null
  logout: () => Promise<void>;
  performAdminAuthOperation: (asyncTask: () => Promise<void>) => Promise<void>;
  setAuthOperationInProgress: (inProgress: boolean) => void;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthOperationInProgress, setIsAuthOperationInProgress] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false); // New state to manage signup flow
  const { toast } = useToast();
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const logoutDueToInactivity = useCallback(() => {
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
      // Guard clause: If a signup is in progress, don't run the listener logic.
      // The signup function will handle the state changes, including signing out.
      if (isSigningUp) return;

      setIsLoading(true);
      if (fbUser) {
        setFirebaseUser(fbUser);
        const userProfile = await getUserProfile(fbUser.uid);
        if (userProfile) {
          if (userProfile.status === 'pending' || userProfile.status === 'rejected') {
             setUser(null);
             // This sign out is important for pending/rejected users trying to log in
             if (auth.currentUser) await firebaseSignOut(auth);
          } else {
            setUser(userProfile);
          }
        } else {
           // If a user exists in Auth but not in Firestore (e.g., race condition, or deleted profile)
           // sign them out to prevent a broken state.
           setUser(null);
           if (auth.currentUser) await firebaseSignOut(auth);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setIsLoading(false);
      setIsAuthOperationInProgress(false);
    });

    return () => unsubscribe();
  }, [isSigningUp]); // Add isSigningUp to dependency array

  useEffect(() => {
    if (user && !isLoading) {
        const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        resetInactivityTimeout();
        events.forEach(event => window.addEventListener(event, resetInactivityTimeout));
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
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const fbUser = userCredential.user;
      const userProfile = await getUserProfile(fbUser.uid);

      if (!userProfile) {
        await firebaseSignOut(auth);
        return { user: null, success: false, reason: 'not_found' };
      }

      if (userProfile.status === 'pending' || userProfile.status === 'rejected') {
        await firebaseSignOut(auth);
        return { user: null, success: false, reason: 'pending' };
      }
      
      setUser(userProfile);
      return { user: userProfile, success: true };

    } catch (error: any) {
      console.error("Firebase login error:", error.message);
      return { user: null, success: false, reason: 'invalid_credentials' };
    } finally {
        setIsAuthOperationInProgress(false);
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, pass: string): Promise<User | null> => {
    setIsSigningUp(true); // Start of the signup critical section
    try {
      // Step 1: Create the user in Firebase Auth. This auto-signs them in,
      // which is why we need the `isSigningUp` flag to pause the listener.
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const fbUser = userCredential.user;
      
      // Step 2: Create the user profile in Firestore with 'pending' status
      await createUserProfile(fbUser.uid, email, name, 'member', 'pending');
      const newUserProfile = await getUserProfile(fbUser.uid);

      // Step 3: Immediately sign the user out to enforce the pending status.
      await firebaseSignOut(auth);
      
      // Step 4: Return the newly created profile for the success message.
      return newUserProfile;

    } catch (error: any) {
      console.error("Firebase signup error:", error.message);
      // Ensure user is signed out even if profile creation fails.
      if (auth.currentUser) {
          await firebaseSignOut(auth);
      }
      return null;
    } finally {
        setIsSigningUp(false); // End of the signup critical section
    }
  }, []);

  const logout = useCallback(async () => {
    if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
    }
    
    if (user?.id) {
        try {
            await updateFcmToken(user.id, null);
            console.log("FCM token cleared on logout.");
        } catch (error) {
            console.error("Failed to clear FCM token on logout:", error);
        }
    }

    setIsAuthOperationInProgress(true);
    await firebaseSignOut(auth).catch(error => {
        console.error("Firebase logout error:", error.message);
    }).finally(() => {
        setIsAuthOperationInProgress(false);
    });
  }, [user]);

  const performAdminAuthOperation = useCallback(async (asyncTask: () => Promise<void>): Promise<void> => {
    setIsAuthOperationInProgress(true);
    setIsLoading(true);
    try {
      await asyncTask();
    } catch (error: any) {
      console.error("Admin auth operation error:", error.message);
      throw error;
    } finally {
       setIsLoading(false);
       setIsAuthOperationInProgress(false);
    }
  }, []);

  return { user, firebaseUser, isLoading, isAuthOperationInProgress, login, signup, logout, performAdminAuthOperation, setAuthOperationInProgress: setIsAuthOperationInProgress };
}
