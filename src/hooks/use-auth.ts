
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
             photoUrl: fbUser.photoURL || `https://placehold.co/100x100.png?text=${placeholderChar}` // Default placeholder
           };
           setUser(defaultNewUser);
           if (!userProfile && fbUser.email) {
             try {
                // When creating profile, photoURL from fbUser (if exists) or undefined will be passed.
                // createUserProfile will then apply its own placeholder logic if photoUrl is undefined.
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
        setUser(userProfile); 
        setIsLoading(false);
        return userProfile;
      }
      const tempUserName = fbUser.displayName || 'User';
      const placeholderChar = tempUserName.trim().length > 0 ? tempUserName.trim().charAt(0).toUpperCase() : 'U';
      const tempUser: User = { id: fbUser.uid, email: fbUser.email || '', name: tempUserName, role: 'member', photoUrl: fbUser.photoURL || `https://placehold.co/100x100.png?text=${placeholderChar}` };
      setUser(tempUser);
      setIsLoading(false);
      return tempUser; 
    } catch (error: any) {
      console.error("Firebase login error object:", error);
      if (error.code) console.error("Firebase login error code:", error.code);
      if (error.message) console.error("Firebase login error message:", error.message);
      setIsLoading(false);
      return null;
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, pass: string): Promise<User | null> => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const fbUser = userCredential.user;
      // createUserProfile will handle the placeholder logic if fbUser.photoURL is null/undefined
      await createUserProfile(fbUser.uid, email, name, 'member', fbUser.photoURL || undefined); 
      const newUserProfile = await getUserProfile(fbUser.uid);
      setIsLoading(false);
      return newUserProfile;
    } catch (error: any) {
      console.error("Firebase signup error object:", error);
      if (error.code) console.error("Firebase signup error code:", error.code);
      if (error.message) console.error("Firebase signup error message:", error.message);
      setIsLoading(false);
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      console.error("Firebase logout error object:", error);
       if (error.code) console.error("Firebase logout error code:", error.code);
      if (error.message) console.error("Firebase logout error message:", error.message);
    }
    setIsLoading(false);
  }, []);

  return { user, firebaseUser, isLoading, login, signup, logout };
}
