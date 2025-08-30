
// src/hooks/use-auth.ts
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  type User as FirebaseUser
} from 'firebase/auth';
import { auth } from '@/lib/firebase/clientApp';
import { createUserProfile, getUserProfile, updateFcmToken } from '@/services/userService';
import type { User, UserRole } from '@/types';
import { useToast } from './use-toast';
import { useRouter } from 'next/navigation'; // Import useRouter

export type AdminViewMode = 'admin_view' | 'member_view';
const SUPER_ADMIN_EMAIL = "check22@gmail.com";

export interface LoginResult {
  user: User | null;
  success: boolean;
  reason?: 'pending' | 'not_found' | 'invalid_credentials';
}

export interface PasswordResetResult {
    success: boolean;
    message?: string;
}

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthOperationInProgress: boolean;
  adminViewMode: AdminViewMode;
  setAdminViewMode: (mode: AdminViewMode) => void;
  login: (email: string, pass: string) => Promise<LoginResult>;
  signup: (name: string, email: string, pass: string) => Promise<User | null>;
  logout: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<PasswordResetResult>;
  performAdminAuthOperation: (asyncTask: () => Promise<void>) => Promise<void>;
  setAuthOperationInProgress: (inProgress: boolean) => void;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthOperationInProgress, setIsAuthOperationInProgress] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [adminViewMode, setAdminViewMode] = useState<AdminViewMode>('admin_view');
  const { toast } = useToast();
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter(); 

  useEffect(() => {
    const storedViewMode = localStorage.getItem('adminViewMode') as AdminViewMode;
    if (storedViewMode) {
      setAdminViewMode(storedViewMode);
    }
  }, []);

  const handleSetAdminViewMode = (mode: AdminViewMode) => {
    setAdminViewMode(mode);
    localStorage.setItem('adminViewMode', mode);
    // Use a full page reload to ensure all components re-evaluate the auth state and view mode
    window.location.href = '/dashboard';
  };

  const logoutDueToInactivity = useCallback(() => {
    firebaseSignOut(auth).then(() => {
        toast({
            title: "Session Expired",
            description: "You have been logged out due to inactivity.",
            variant: "destructive",
            duration: 7000
        });
        // Redirect to login page after signing out
        window.location.href = '/login';
    });
  }, [toast]);

  const resetInactivityTimeout = useCallback(() => {
    if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
    }
    
    if (user) {
        const timeoutDuration = user.role === 'admin' || user.role === 'super_admin'
            ? 30 * 60 * 1000 // 30 minutes for admins
            : 20 * 60 * 1000; // 20 minutes for members

        inactivityTimeoutRef.current = setTimeout(logoutDueToInactivity, timeoutDuration);
    }
  }, [user, logoutDueToInactivity]);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (isSigningUp) return;

      setIsLoading(true);
      if (fbUser) {
        setFirebaseUser(fbUser);
        let userProfile = await getUserProfile(fbUser.uid);
        if (userProfile) {
          // SUPER_ADMIN logic override
          if (userProfile.email === SUPER_ADMIN_EMAIL && userProfile.role !== 'super_admin') {
            userProfile.role = 'super_admin';
          }

          if (userProfile.status === 'pending' || userProfile.status === 'rejected') {
             setUser(null);
             if (auth.currentUser) await firebaseSignOut(auth);
          } else {
            setUser(userProfile);
          }
        } else {
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
  }, [isSigningUp]);

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
      let userProfile = await getUserProfile(fbUser.uid);

      if (!userProfile) {
        await firebaseSignOut(auth);
        return { user: null, success: false, reason: 'not_found' };
      }
      
      // SUPER_ADMIN logic override
      if (userProfile.email === SUPER_ADMIN_EMAIL && userProfile.role !== 'super_admin') {
        userProfile.role = 'super_admin';
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
    setIsSigningUp(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const fbUser = userCredential.user;
      
      await createUserProfile(fbUser.uid, email, name, 'member', 'pending');
      const newUserProfile = await getUserProfile(fbUser.uid);

      await firebaseSignOut(auth);
      
      return newUserProfile;

    } catch (error: any) {
      console.error("Firebase signup error:", error.message);
      if (auth.currentUser) {
          await firebaseSignOut(auth);
      }
      return null;
    } finally {
        setIsSigningUp(false);
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

   const sendPasswordResetEmail = useCallback(async (email: string): Promise<PasswordResetResult> => {
    setIsAuthOperationInProgress(true);
    try {
        await firebaseSendPasswordResetEmail(auth, email);
        return { success: true };
    } catch (error: any) {
        console.error("Password reset error:", error);
        if (error.code === 'auth/user-not-found') {
            // To prevent email enumeration, we can return success even if user not found.
            // The user won't get an email, which is the same UX as if they did it correctly.
            return { success: true };
        }
        return { success: false, message: "Failed to send reset email. Please try again later." };
    } finally {
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
      throw error;
    } finally {
       setIsLoading(false);
       setIsAuthOperationInProgress(false);
    }
  }, []);

  return { 
      user, 
      firebaseUser, 
      isLoading, 
      isAuthOperationInProgress, 
      login, 
      signup, 
      logout,
      sendPasswordResetEmail,
      performAdminAuthOperation, 
      setAuthOperationInProgress: setIsAuthOperationInProgress, 
      adminViewMode, 
      setAdminViewMode: handleSetAdminViewMode 
    };
}
