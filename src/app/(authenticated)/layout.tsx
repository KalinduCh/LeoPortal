
// src/app/(authenticated)/layout.tsx
"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/layout/app-shell";
import { Loader2, BellRing, Settings, HelpCircle, Wifi, WifiOff } from "lucide-react";
import { useFcm } from "@/hooks/use-fcm";
import { syncOfflineAttendance } from "@/services/offlineSyncService";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
  
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(true);

  // Effect for online/offline status detection
  React.useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      toast({
        title: "You're back online!",
        description: "Checking for pending offline data to sync.",
        icon: <Wifi className="h-5 w-5 text-green-500" />,
      });
      try {
        const syncedCount = await syncOfflineAttendance();
        if (syncedCount > 0) {
          toast({
            title: "Sync Complete",
            description: `Successfully synced ${syncedCount} offline attendance record(s).`,
          });
        }
      } catch (error) {
        console.error("Error during offline sync:", error);
        toast({
          title: "Sync Failed",
          description: "Could not sync offline attendance records. Please try again later.",
          variant: "destructive",
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "You are currently offline",
        description: "Attendance marking will be saved locally and synced when you reconnect.",
        icon: <WifiOff className="h-5 w-5 text-destructive" />,
        duration: 10000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Set initial state
    if(typeof window !== 'undefined') {
        setIsOnline(navigator.onLine);
        if(navigator.onLine) {
            handleOnline(); // Initial sync check on load if online
        }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Effect to ask for notification permission
  React.useEffect(() => {
    if (user && !isLoading && notificationPermissionStatus === 'default') {
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
    if (isLoading || !user) return;

    if (user.role === 'member' && isAdminPage) {
        router.replace('/dashboard');
    }
    
    if (user.role === 'admin' && adminViewMode === 'member_view' && isAdminPage) {
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
