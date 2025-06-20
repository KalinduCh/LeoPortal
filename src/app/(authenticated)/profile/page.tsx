// src/app/(authenticated)/profile/page.tsx
"use client";

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ProfileCard } from '@/components/profile/profile-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default function ProfilePage() {
  const { user, isLoading } = useAuth();

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
  
  // Placeholder for future profile update functionality
  const handleUpdateProfile = async (updatedData: Partial<typeof user>) => {
    console.log("Updating profile with:", updatedData);
    // Call an API or server action here
    // Then potentially update the user state in useAuth or refetch
  };


  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 font-headline text-center md:text-left">My Profile</h1>
      <ProfileCard user={user} onUpdateProfile={handleUpdateProfile} />
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
      {[1,2,3].map(i => (
        <div key={i} className="flex items-center space-x-3">
          <Skeleton className="h-5 w-5 rounded" />
          <div className="space-y-1.5">
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
