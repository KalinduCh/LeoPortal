// src/hooks/use-auth.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { User } from '@/types';
import { mockUsers } from '@/lib/data'; // For mock login

const AUTH_STORAGE_KEY = 'leoPortalUser';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<User | null>;
  signup: (name: string, email: string, pass: string) => Promise<User | null>;
  logout: () => void;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to load user from localStorage", error);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, _: string): Promise<User | null> => {
    // Mock login: find user by email
    // In a real app, this would be an API call
    const foundUser = mockUsers.find(u => u.email === email);
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(foundUser));
      return foundUser;
    }
    return null;
  }, []);

  const signup = useCallback(async (name: string, email: string, _: string): Promise<User | null> => {
    // Mock signup: create a new member user
    // In a real app, this would be an API call
    const existingUser = mockUsers.find(u => u.email === email);
    if (existingUser) {
      // User already exists
      return null; 
    }
    const newUser: User = {
      id: `user${mockUsers.length + 1}`,
      name,
      email,
      role: 'member', // Default role for new signups
      photoUrl: 'https://placehold.co/100x100.png',
    };
    // In a real app, you'd add this to your backend. Here, we're just mocking.
    // mockUsers.push(newUser); // This won't persist across reloads unless you also update lib/data.ts or a backend
    setUser(newUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
    return newUser;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    // Optionally redirect to login page using Next.js router
    // This hook shouldn't directly handle navigation, the component using it should.
  }, []);

  return { user, isLoading, login, signup, logout };
}
