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

// const AUTH_STORAGE_KEY = 'leoPortalUser'; // We might not need this if relying purely on Firebase's persistence

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<User | null>;
  signup: (name: string, email: string, pass: string) => Promise<User | null>;
  logout: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setIsLoading(true);
      if (fbUser) {
        setFirebaseUser(fbUser);
        // Fetch extended user profile from Firestore
        const userProfile = await getUserProfile(fbUser.uid);
        if (userProfile) {
          setUser(userProfile);
        } else {
          // This case might happen if Firestore profile creation failed or user was created directly in Firebase Auth console
          // For simplicity, we'll create a default user object.
           const defaultNewUser: User = { 
             id: fbUser.uid, 
             email: fbUser.email || '', 
             name: fbUser.displayName || 'New User', 
             role: 'member', 
             photoUrl: fbUser.photoURL || `https://placehold.co/100x100.png` 
           };
           setUser(defaultNewUser);
           // Attempt to create profile if missing and basic info is available
           if (!userProfile && fbUser.email) {
             try {
                await createUserProfile(fbUser.uid, fbUser.email, fbUser.displayName || 'New User', 'member', fbUser.photoURL || undefined);
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
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, pass: string): Promise<User | null> => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const fbUser = userCredential.user;
      const userProfile = await getUserProfile(fbUser.uid);
      if (userProfile) {
        setUser(userProfile); // This will also be set by onAuthStateChanged, but good for immediate feedback
        setIsLoading(false);
        return userProfile;
      }
      // Fallback if profile somehow doesn't exist but auth succeeded (should be rare with useEffect logic)
      const tempUser: User = { id: fbUser.uid, email: fbUser.email || '', name: fbUser.displayName || 'User', role: 'member', photoUrl: fbUser.photoURL || `https://placehold.co/100x100.png` };
      setUser(tempUser);
      setIsLoading(false);
      return tempUser; 
    } catch (error: any) {
      console.error("Firebase login error object:", error);
      if (error.code) {
        console.error("Firebase login error code:", error.code);
      }
      if (error.message) {
        console.error("Firebase login error message:", error.message);
      }
      setIsLoading(false);
      return null;
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, pass: string): Promise<User | null> => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const fbUser = userCredential.user;
      // Create user profile in Firestore
      // Using a placeholder photoUrl initially, can be updated by user later
      const photoUrl = `https://placehold.co/100x100.png`;
      await createUserProfile(fbUser.uid, email, name, 'member', photoUrl); 
      const newUserProfile = await getUserProfile(fbUser.uid);
      // User state will be set by onAuthStateChanged
      setIsLoading(false);
      return newUserProfile;
    } catch (error: any) {
      console.error("Firebase signup error object:", error);
      if (error.code) {
        console.error("Firebase signup error code:", error.code);
      }
      if (error.message) {
        console.error("Firebase signup error message:", error.message);
      }
      setIsLoading(false);
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
      // User state will be cleared by onAuthStateChanged
    } catch (error: any) {
      console.error("Firebase logout error object:", error);
       if (error.code) {
        console.error("Firebase logout error code:", error.code);
      }
      if (error.message) {
        console.error("Firebase logout error message:", error.message);
      }
    }
    setIsLoading(false);
  }, []);

  return { user, firebaseUser, isLoading, login, signup, logout };
}
