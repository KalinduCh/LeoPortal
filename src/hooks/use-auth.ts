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

const AUTH_STORAGE_KEY = 'leoPortalUser'; // We might not need this if relying purely on Firebase's persistence

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
          // For simplicity, we'll clear local user if profile doesn't exist.
          // A more robust solution might attempt to create the profile here or handle it differently.
           setUser({ id: fbUser.uid, email: fbUser.email || '', name: fbUser.displayName || 'New User', role: 'member', photoUrl: fbUser.photoURL || `https://placehold.co/100x100.png` });
           // Attempt to create profile if missing
           if (!userProfile && fbUser.email && fbUser.displayName) {
             try {
                await createUserProfile(fbUser.uid, fbUser.email, fbUser.displayName);
                const newProfile = await getUserProfile(fbUser.uid);
                if (newProfile) setUser(newProfile);
             } catch (profileError) {
                console.error("Error creating missing profile:", profileError);
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
      // Handle case where profile might not exist - though onAuthStateChanged should also cover this
      setIsLoading(false);
      return null; // Or a default user object
    } catch (error) {
      console.error("Firebase login error:", error);
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
      await createUserProfile(fbUser.uid, email, name, 'member'); // Default new users to 'member'
      const newUserProfile = await getUserProfile(fbUser.uid);
      // User state will be set by onAuthStateChanged
      setIsLoading(false);
      return newUserProfile;
    } catch (error) {
      console.error("Firebase signup error:", error);
      setIsLoading(false);
      // Check for specific errors like 'auth/email-already-in-use'
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
      // User state will be cleared by onAuthStateChanged
    } catch (error) {
      console.error("Firebase logout error:", error);
    }
    setIsLoading(false);
  }, []);

  return { user, firebaseUser, isLoading, login, signup, logout };
}
