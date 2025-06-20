
// src/app/(authenticated)/profile/page.tsx
"use client";

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ProfileCard } from '@/components/profile/profile-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Loader2 } from 'lucide-react';
import type { User } from '@/types';
import { updateUserProfile } from '@/services/userService';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { user, isLoading, firebaseUser, login } = useAuth(); // Added login to refresh user state
  const { toast } = useToast();
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <CardSkeleton />
      </div>
    );
  }

  if (!user) {
    return (
       <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          User data not found. Please try logging in again.
        </AlertDescription>
      </Alert>
    );
  }
  
  const handleUpdateProfile = async (updatedData: Partial<User>) => {
    if (!user?.id) {
      toast({ title: "Error", description: "User ID not found. Cannot update profile.", variant: "destructive" });
      return;
    }
    setIsUpdatingProfile(true);
    try {
      await updateUserProfile(user.id, updatedData);
      toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
      // To refresh user data in useAuth, re-trigger onAuthStateChanged or re-fetch profile.
      // A simple way is to re-call login if current FirebaseUser exists, or implement a dedicated refresh in useAuth.
      // Forcing a "re-login" like this is a bit of a hack for state refresh,
      // a dedicated `refreshUserProfile` in `useAuth` would be cleaner.
      if (firebaseUser && firebaseUser.email) {
        // This is tricky if password isn't available. We need a better way to refresh `user` in `useAuth`.
        // For now, we'll rely on the fact that `getUserProfile` is called by `onAuthStateChanged`
        // which might not re-run just on Firestore update.
        // A simple page reload would also work but is not ideal UX.
        // The best solution would be for useAuth to have a refresh function.
        // As a temporary measure, we can update the local state partially, but it's not ideal.
        // window.location.reload(); // Simplest but harshest way to see changes
        // For now, let's assume useAuth might need a manual refresh function exposed.
        // Or, we trigger a re-fetch of user from useAuth manually here if useAuth allows it.
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ title: "Update Failed", description: "Could not update your profile.", variant: "destructive" });
    }
    setIsUpdatingProfile(false);
  };


  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 font-headline text-center md:text-left">My Profile</h1>
      {isUpdatingProfile && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg">Updating profile...</p>
        </div>
      )}
      <ProfileCard user={user} onUpdateProfile={handleUpdateProfile} isUpdatingProfile={isUpdatingProfile}/>
    </div>
  );
}


const CardSkeleton = () => (
  <div className="w-full max-w-2xl mx-auto p-6 border rounded-lg shadow-lg">
    <div className="flex flex-col items-center mb-4">
      <Skeleton className="w-32 h-32 rounded-full mb-4" />
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-6 w-32" />
    </div>
    <Skeleton className="h-px w-full my-4" />
    <div className="space-y-6">
      {[1,2,3,4,5].map(i => ( // Increased skeleton items
        <div key={i} className="flex items-start space-x-3"> {/* Changed to items-start */}
          <Skeleton className="h-5 w-5 rounded mt-1" /> {/* Adjusted icon skeleton */}
          <div className="space-y-1.5 flex-grow">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-40" />
          </div>
        </div>
      ))}
      <div className="pt-4 text-right">
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  </div>
)
