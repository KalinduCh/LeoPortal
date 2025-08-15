// src/app/(authenticated)/dashboard/page.tsx
"use client";

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { AdminDashboard } from '@/app/(authenticated)/dashboard/admin-dashboard';
import { MemberDashboard } from '@/app/(authenticated)/dashboard/member-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default function DashboardPage() {
  const { user, isLoading, adminViewMode } = useAuth();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Authentication Error</AlertTitle>
        <AlertDescription>
          User not found. Please try logging in again.
        </AlertDescription>
      </Alert>
    );
  }

  const isSuperAdmin = user.role === 'super_admin';
  const isAdmin = user.role === 'admin';
  
  // Super Admin always sees admin dashboard.
  if (isSuperAdmin) {
    return <AdminDashboard user={user} />;
  }
  
  // Admin view depends on the toggle state.
  if (isAdmin) {
    return adminViewMode === 'admin_view' ? <AdminDashboard user={user} /> : <MemberDashboard user={user} />;
  }
  
  // Default to member dashboard for members.
  return <MemberDashboard user={user} />;
}

const DashboardSkeleton = () => (
  <div className="space-y-8">
    <div className="space-y-2">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
    </div>
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map(i => (
        <CardSkeleton key={i} />
      ))}
    </div>
    <CardSkeleton />
  </div>
);

const CardSkeleton = () => (
  <div className="p-6 border rounded-lg shadow">
    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-5 w-5 rounded-full" />
    </div>
    <div>
      <Skeleton className="h-8 w-1/2 mb-1" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  </div>
);