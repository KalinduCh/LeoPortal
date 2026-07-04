// src/app/(authenticated)/layout.tsx
"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/layout/app-shell";
import { Loader2, BellRing, Smartphone, Wifi, WifiOff } from "lucide-react";
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
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { FirebaseErrorListener } from "@/components/FirebaseErrorListener";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthOperationInProgress, adminViewMode } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { requestPermission, notificationPermissionStatus } = useFcm(user);
  
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(true);

  // Connectivity and Offline Sync
  React.useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      try {
        const syncedCount = await syncOfflineAttendance();
        if (syncedCount > 0) {
          toast({
            title: "Data Synced",
            description: `Successfully uploaded ${syncedCount} pending attendance records.`,
            icon: <Wifi className="h-5 w-5 text-green-500" />,
          });
        }
      } catch (error) {
        console.error("Sync Error:", error);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Connection Lost",
        description: "You are currently offline. Attendance data will be saved locally.",
        icon: <WifiOff className="h-5 w-5 text-destructive" />,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if(typeof window !== 'undefined') setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Push Notification Onboarding
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
  
  // Navigation Guards
  React.useEffect(() => {
    if (isLoading || !user) return;

    const isAdminPage = pathname.startsWith('/admin/');
    const isEntrivoPage = pathname.startsWith('/event-access');

    if (user.source === 'entrivo' && !isEntrivoPage) {
        router.replace('/event-access/admin');
        return;
    }

    if (user.role === 'member' && isAdminPage) {
        router.replace('/dashboard');
        return;
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
  
  if (!user) return null;

  return (
    <>
      <DndProvider backend={HTML5Backend}>
        <AppShell>
          {children}
        </AppShell>
      </DndProvider>

      {/* Push Notification Opt-in */}
      <AlertDialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="mx-auto h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <BellRing className="h-8 w-8 text-primary"/>
            </div>
            <AlertDialogTitle className="text-center font-black uppercase tracking-tight">Stay Updated</AlertDialogTitle>
            <AlertDialogDescription className="text-center font-medium">
              Enable notifications to receive instant alerts for new events, task assignments, and club announcements.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:flex-col gap-2">
            <AlertDialogAction onClick={() => { requestPermission(); setIsPermissionDialogOpen(false); }} className="w-full h-12 rounded-xl font-bold bg-primary shadow-lg">
                Enable Notifications
            </AlertDialogAction>
            <AlertDialogCancel onClick={() => setIsPermissionDialogOpen(false)} className="w-full h-12 rounded-xl border-none font-bold text-slate-400">
                Maybe Later
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FirebaseErrorListener />
    </>
  );
}
