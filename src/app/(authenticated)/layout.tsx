
"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/layout/app-shell";
import { Loader2, BellRing, Wifi, WifiOff, Smartphone } from "lucide-react";
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
  const { requestPermission, notificationPermissionStatus } = useFcm(user);
  const { toast } = useToast();
  
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = React.useState(false);
  const [isIosPromptOpen, setIsIosPromptOpen] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(true);

  React.useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      try {
        const syncedCount = await syncOfflineAttendance();
        if (syncedCount > 0) {
          toast({
            title: "Offline Sync Complete",
            description: `Synced ${syncedCount} pending records.`,
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
        title: "You are offline",
        description: "Attendance will sync when you reconnect.",
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

  React.useEffect(() => {
    if (user && !isLoading && notificationPermissionStatus === 'default') {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
      if (isIos && !isStandalone) {
          const dismissed = localStorage.getItem('iosPwaPromptDismissed');
          if (!dismissed) setTimeout(() => setIsIosPromptOpen(true), 5000);
      } else {
          setTimeout(() => setIsPermissionDialogOpen(true), 5000);
      }
    }
  }, [user, isLoading, notificationPermissionStatus]);

  React.useEffect(() => {
    if (!isLoading && !user && !isAuthOperationInProgress) router.replace("/login");
  }, [user, isLoading, isAuthOperationInProgress, router]);
  
  React.useEffect(() => {
    if (isLoading || !user) return;
    const isAdminPage = pathname.startsWith('/admin/');
    if (user.role === 'member' && isAdminPage) router.replace('/dashboard');
    if (user.role === 'admin' && adminViewMode === 'member_view' && isAdminPage) router.replace('/dashboard');
  }, [user, isLoading, pathname, router, adminViewMode]);

  if (isLoading || (!user && isAuthOperationInProgress && !pathname.startsWith('/login'))) {
    return <div className="flex h-screen w-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin" /></div>;
  }
  
  if (!user) return null;

  return (
    <>
      <DndProvider backend={HTML5Backend}>
        <AppShell>{children}</AppShell>
      </DndProvider>

      <AlertDialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center"><BellRing className="mr-2 h-5 w-5 text-primary"/> Stay Updated</AlertDialogTitle>
            <AlertDialogDescription>Allow notifications for alerts on tasks, events, and club announcements.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsPermissionDialogOpen(false)}>Maybe Later</AlertDialogCancel>
            <AlertDialogAction onClick={() => { requestPermission(); setIsPermissionDialogOpen(false); }}>Enable Notifications</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isIosPromptOpen} onOpenChange={setIsIosPromptOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center"><Smartphone className="mr-2 h-5 w-5 text-primary"/> Add to Home Screen</AlertDialogTitle>
                  <AlertDialogDescription>To receive notifications on iOS, add this app to your Home Screen using the Share menu.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogAction onClick={() => { setIsIosPromptOpen(false); localStorage.setItem('iosPwaPromptDismissed', 'true'); }}>Got it</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
      <FirebaseErrorListener />
    </>
  );
}
