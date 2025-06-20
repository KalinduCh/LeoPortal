
// src/app/(authenticated)/profile/page.tsx
"use client";

import React, { useState, useEffect } from 'react'; // Added useEffect
import { useAuth } from '@/hooks/use-auth';
import { ProfileCard } from '@/components/profile/profile-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Loader2 } from 'lucide-react';
import type { User } from '@/types';
import { updateUserProfile } from '@/services/userService';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { user, isLoading, firebaseUser, login } = useAuth(); 
  const { toast } = useToast();
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // This effect ensures that if `user` from `useAuth` changes (e.g., after a reload or re-auth),
  // the loading state is handled correctly.
  useEffect(() => {
    if (!isLoading && !user && firebaseUser) {
      // If auth is loaded, firebaseUser exists, but local user profile is not yet set,
      // it might still be fetching. This case needs careful handling by useAuth.
      // For now, if user is null AFTER auth loading, it's an issue.
    }
  }, [user, isLoading, firebaseUser]);


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
      
      // Force a reload to ensure all parts of the app (especially useAuth) get the latest user data.
      // A more sophisticated approach might involve a dedicated refresh function in useAuth.
      window.location.reload();

    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ title: "Update Failed", description: "Could not update your profile. Check console for details.", variant: "destructive" });
    }
    // setIsUpdatingProfile(false); // This won't be reached if reload happens
  };


  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 font-headline text-center md:text-left">My Profile</h1>
      {/* isUpdatingProfile from this page is passed to ProfileCard to disable its own internal submit button if parent is busy */}
      {/* ProfileCard now manages its own image uploading spinner */}
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
      {[1,2,3,4,5].map(i => ( 
        <div key={i} className="flex items-start space-x-3"> 
          <Skeleton className="h-5 w-5 rounded mt-1" /> 
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
