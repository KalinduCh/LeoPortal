
// src/app/(authenticated)/profile/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ProfileCard } from '@/components/profile/profile-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Terminal, Loader2 } from 'lucide-react';
import type { User, AttendanceRecord, BadgeId } from '@/types';
import { updateUserProfile } from '@/services/userService';
import { useToast } from '@/hooks/use-toast';
import { getAttendanceRecordsForUser } from '@/services/attendanceService';
import { calculateBadgeIds } from '@/services/badgeService';

export default function ProfilePage() {
  const { user, isLoading, firebaseUser } = useAuth(); 
  const { toast } = useToast();
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  
  const [userBadges, setUserBadges] = useState<BadgeId[]>([]);
  const [isFetchingActivity, setIsFetchingActivity] = useState(true);

  // Fetch attendance records for badge calculation
  useEffect(() => {
    if (user?.id) {
      setIsFetchingActivity(true);
      getAttendanceRecordsForUser(user.id)
        .then((records) => {
          const badgeIds = calculateBadgeIds(user, records);
          setUserBadges(badgeIds);
        })
        .catch(err => {
          console.error("Failed to get user activity for badges:", err);
          toast({ title: "Could not load badges", description: "Failed to fetch user activity.", variant: "destructive" });
        })
        .finally(() => {
          setIsFetchingActivity(false);
        });
    } else {
        setIsFetchingActivity(false);
    }
  }, [user, toast]);


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
      
      window.location.reload();

    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ title: "Update Failed", description: "Could not update your profile. Check console for details.", variant: "destructive" });
    }
  };


  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 font-headline text-center md:text-left">My Profile</h1>
      <ProfileCard 
        user={user} 
        onUpdateProfile={handleUpdateProfile} 
        isUpdatingProfile={isUpdatingProfile}
        badges={userBadges}
        isLoadingBadges={isFetchingActivity}
      />
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
    <Separator />
    {/* Badge Skeleton */}
    <div className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
                <div key={i} className="flex flex-col items-center text-center gap-2 p-2 border rounded-lg">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                </div>
            ))}
        </div>
    </div>
    <Skeleton className="h-px w-full my-0" />
    <div className="space-y-6 p-6">
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
