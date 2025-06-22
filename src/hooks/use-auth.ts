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
import { useToast } from './use-toast';

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthOperationInProgress: boolean; // New flag
  login: (email: string, pass: string) => Promise<User | null>;
  signup: (name: string, email: string, pass: string) => Promise<User | null>;
  logout: () => Promise<void>;
  performAdminAuthOperation: (asyncTask: () => Promise<void>) => Promise<void>; // New wrapper
  setAuthOperationInProgress: (inProgress: boolean) => void;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthOperationInProgress, setIsAuthOperationInProgress] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setIsLoading(true);
      if (fbUser) {
        setFirebaseUser(fbUser);
        const userProfile = await getUserProfile(fbUser.uid);
        if (userProfile) {
          if (userProfile.status === 'pending') {
             // This can happen if an approved admin signs out and a pending user immediately signs in.
             // We ensure they are logged out and cannot proceed.
             setUser(null);
             await firebaseSignOut(auth);
          } else {
            setUser(userProfile);
          }
        } else {
           // This handles the brief moment after self-signup before the profile is created.
           // Or if a user exists in Auth but not in Firestore.
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

  const login = useCallback(async (email: string, pass: string): Promise<User | null> => {
    setIsAuthOperationInProgress(true);
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const fbUser = userCredential.user;
      const userProfile = await getUserProfile(fbUser.uid);

      if (!userProfile) {
        toast({ title: "Login Failed", description: "Your user profile does not exist. Please contact an admin.", variant: "destructive"});
        await firebaseSignOut(auth);
        setIsLoading(false);
        setIsAuthOperationInProgress(false);
        return null;
      }

      if (userProfile.status === 'pending') {
        toast({ title: "Account Pending", description: "Your account is still awaiting admin approval.", variant: "destructive", duration: 8000 });
        await firebaseSignOut(auth);
        setIsLoading(false);
        setIsAuthOperationInProgress(false);
        return null;
      }
      
      // onAuthStateChanged will handle setting the final user state.
      // This immediate return gives quicker feedback to the caller.
      setUser(userProfile);
      setIsLoading(false);
      setIsAuthOperationInProgress(false);
      return userProfile;

    } catch (error: any) {
      console.error("Firebase login error:", error.message);
      setIsLoading(false);
      setIsAuthOperationInProgress(false);
      return null;
    }
  }, [toast]);

  const signup = useCallback(async (name: string, email: string, pass: string): Promise<User | null> => {
    setIsAuthOperationInProgress(true);
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const fbUser = userCredential.user;
      
      // Create profile with 'pending' status
      await createUserProfile(fbUser.uid, email, name, 'member', 'pending'); 
      const newUserProfile = await getUserProfile(fbUser.uid); 
      
      // Immediately sign the user out after they sign up.
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
    setIsAuthOperationInProgress(true);
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will handle setting user to null and isLoading/isAuthOperationInProgress to false
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
