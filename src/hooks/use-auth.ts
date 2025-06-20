
// src/hooks/use-auth.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
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

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthOperationInProgress: boolean; // New flag
  login: (email: string, pass: string) => Promise<User | null>;
  signup: (name: string, email: string, pass: string) => Promise<User | null>;
  logout: () => Promise<void>;
  performAdminAuthOperation: (asyncTask: () => Promise<void>) => Promise<void>; // New wrapper
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthOperationInProgress, setIsAuthOperationInProgress] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      // Do not set isAuthOperationInProgress = true here, let actions do that.
      setIsLoading(true);
      if (fbUser) {
        setFirebaseUser(fbUser);
        const userProfile = await getUserProfile(fbUser.uid);
        if (userProfile) {
          setUser(userProfile);
        } else {
           const defaultUserName = fbUser.displayName || 'New User';
           const placeholderChar = defaultUserName.trim().length > 0 ? defaultUserName.trim().charAt(0).toUpperCase() : 'U';
           const defaultNewUser: User = { 
             id: fbUser.uid, 
             email: fbUser.email || '', 
             name: defaultUserName, 
             role: 'member', 
             photoUrl: fbUser.photoURL || `https://placehold.co/100x100.png?text=${placeholderChar}`
           };
           setUser(defaultNewUser);
           if (!userProfile && fbUser.email) {
             try {
                await createUserProfile(fbUser.uid, fbUser.email, defaultUserName, 'member', fbUser.photoURL || undefined);
                const newProfile = await getUserProfile(fbUser.uid);
                if (newProfile) setUser(newProfile);
             } catch (profileError) {
                console.error("Error creating missing profile for user:", fbUser.uid, profileError);
             }
           }
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setIsLoading(false);
      setIsAuthOperationInProgress(false); // Auth state has stabilized
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, pass: string): Promise<User | null> => {
    setIsAuthOperationInProgress(true);
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will handle setting user and isLoading/isAuthOperationInProgress to false
      const fbUser = userCredential.user;
      const userProfile = await getUserProfile(fbUser.uid); // Fetch profile immediately for return
      return userProfile;
    } catch (error: any) {
      console.error("Firebase login error:", error.message);
      setIsLoading(false);
      setIsAuthOperationInProgress(false);
      return null;
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, pass: string): Promise<User | null> => {
    setIsAuthOperationInProgress(true);
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const fbUser = userCredential.user;
      await createUserProfile(fbUser.uid, email, name, 'member', fbUser.photoURL || undefined); 
      // onAuthStateChanged will handle setting user and isLoading/isAuthOperationInProgress to false
      const newUserProfile = await getUserProfile(fbUser.uid); // Fetch profile immediately for return
      return newUserProfile;
    } catch (error: any) {
      console.error("Firebase signup error:", error.message);
      setIsLoading(false);
      setIsAuthOperationInProgress(false);
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    setIsAuthOperationInProgress(true);
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will handle setting user to null and isLoading/isAuthOperationInProgress to false
    } catch (error: any) {
      console.error("Firebase logout error:", error.message);
      setIsLoading(false); // Ensure loading stops on error
      setIsAuthOperationInProgress(false);
    }
  }, []);

  const performAdminAuthOperation = useCallback(async (asyncTask: () => Promise<void>): Promise<void> => {
    setIsAuthOperationInProgress(true);
    setIsLoading(true); // Indicate that something is happening that might affect auth
    try {
      await asyncTask();
      // After the task (which includes its own signOut), onAuthStateChanged will eventually fire,
      // restore the admin's session, and then set isLoading and isAuthOperationInProgress to false.
    } catch (error: any) {
      console.error("Admin auth operation error:", error.message);
      // If the task itself fails, we should probably reset flags.
      // However, onAuthStateChanged might still fire if auth state was changed before error.
      // It's safer to let onAuthStateChanged be the primary mechanism to reset these.
      // For an immediate UI response to the error, the calling page should handle it.
      setIsLoading(false); // Reset loading on direct error from task
      setIsAuthOperationInProgress(false); // Reset flag on direct error
      throw error; // Re-throw for the calling page to handle
    }
  }, []);


  return { user, firebaseUser, isLoading, isAuthOperationInProgress, login, signup, logout, performAdminAuthOperation };
}
