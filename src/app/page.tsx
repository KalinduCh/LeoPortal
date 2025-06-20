// src/app/page.tsx
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <p className="sr-only">Loading LeoPortal...</p>
    </div>
  );
}
