
// src/app/(authenticated)/layout.tsx
"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation"; // Added usePathname
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/layout/app-shell";
import { Loader2 } from "lucide-react";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthOperationInProgress } = useAuth(); // Added isAuthOperationInProgress
  const router = useRouter();
  const pathname = usePathname(); // Get current path

  React.useEffect(() => {
    // If not loading, no user, and no auth operation in progress, then redirect.
    if (!isLoading && !user && !isAuthOperationInProgress) {
      router.replace("/login");
    }
  }, [user, isLoading, isAuthOperationInProgress, router]);

  // Show loading spinner if:
  // 1. Auth is genuinely loading.
  // 2. Or, there's no user AND an auth operation is in progress (e.g., admin creating user, temp sign out),
  //    AND we are not already on the login page (to prevent spinner on login page if redirect happens too fast).
  if (isLoading || (!user && isAuthOperationInProgress && !pathname.startsWith('/login'))) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="sr-only">Loading application...</p>
      </div>
    );
  }
  
  // If, after loading and no auth op, there's still no user, it means redirect should have happened or is about to.
  // Rendering null here can prevent a brief flash of AppShell before redirect.
  if (!user) {
      return (
         <div className="flex h-screen w-screen items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="sr-only">Redirecting...</p>
         </div>
      );
  }

  return <AppShell>{children}</AppShell>;
}
