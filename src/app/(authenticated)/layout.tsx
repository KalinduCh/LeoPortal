
// src/app/(authenticated)/layout.tsx
"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/layout/app-shell";
import { Loader2, BellRing, Settings, HelpCircle } from "lucide-react";
import { useFcm } from "@/hooks/use-fcm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthOperationInProgress, adminViewMode } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { requestPermission, notificationPermissionStatus } = useFcm(user);
  
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = React.useState(false);

  // Effect to ask for notification permission
  React.useEffect(() => {
    // Only ask if user is logged in, not loading, and permission is 'default'
    if (user && !isLoading && notificationPermissionStatus === 'default') {
      // Delay the dialog slightly to not be too intrusive on login
      const timer = setTimeout(() => setIsPermissionDialogOpen(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [user, isLoading, notificationPermissionStatus]);

  React.useEffect(() => {
    if (!isLoading && !user && !isAuthOperationInProgress) {
      router.replace("/login");
    }
  }, [user, isLoading, isAuthOperationInProgress, router]);
  
  // Security check for admin pages
  React.useEffect(() => {
    const isAdminPage = pathname.startsWith('/admin/');
    if (!isLoading && user && isAdminPage && user.role !== 'admin' && user.role !== 'super_admin') {
        router.replace('/dashboard');
    }
    // Also check when view mode is 'member_view'
    const isSuperOrAdmin = user?.role === 'admin' || user?.role === 'super_admin';
    if (!isLoading && isSuperOrAdmin && adminViewMode === 'member_view' && isAdminPage) {
        router.replace('/dashboard');
    }

  }, [user, isLoading, pathname, router, adminViewMode]);


  if (isLoading || (!user && isAuthOperationInProgress && !pathname.startsWith('/login'))) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
      return (
         <div className="flex h-screen w-screen items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
         </div>
      );
  }

  const handleAllowNotifications = async () => {
    await requestPermission();
    setIsPermissionDialogOpen(false);
  };
  
  const handleDenyNotifications = () => {
    setIsPermissionDialogOpen(false);
  };
  
  return (
    <>
      <AppShell>
        {children}
      </AppShell>
      <AlertDialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <BellRing className="mr-2 h-5 w-5 text-primary"/> Stay Updated with Notifications
            </AlertDialogTitle>
            <AlertDialogDescription>
              Allow notifications to get instant alerts about new events, attendance confirmations, and important club announcements right on your device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDenyNotifications}>Maybe Later</AlertDialogCancel>
            <AlertDialogAction onClick={handleAllowNotifications}>Allow Notifications</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
