
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function NotificationsTestPage() {
  const router = useRouter();

  useEffect(() => {
    // Feature removed per request. Redirecting away.
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
