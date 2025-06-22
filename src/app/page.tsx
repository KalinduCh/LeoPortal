// src/app/page.tsx
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Image from 'next/image';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const logoUrl = "https://i.imgur.com/aRktweQ.png";

  useEffect(() => {
    // We give the animation some time to run before redirecting.
    // The total animation takes about 3.5s to feel complete.
    const redirectTimeout = setTimeout(() => {
        if (!isLoading) {
          if (user) {
            router.replace('/dashboard');
          } else {
            router.replace('/login');
          }
        }
    }, 4000); // Wait 4 seconds before redirecting

    // Cleanup the timeout if the component unmounts or dependencies change
    return () => clearTimeout(redirectTimeout);
  }, [user, isLoading, router]);

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center p-4 text-center text-primary-foreground animate-background-gradient-shift">
        <div className="flex flex-col items-center justify-center gap-4">
            <div className="opacity-0 animate-fade-in-logo">
                <Image
                    src={logoUrl}
                    alt="LEO Portal Logo"
                    width={128}
                    height={128}
                    priority // Preload the logo image
                    className="h-32 w-32 rounded-lg shadow-2xl"
                    data-ai-hint="club logo"
                />
            </div>
            <h1 className="text-5xl font-bold font-headline opacity-0 animate-fade-in-leo-text tracking-wide">LEO Portal</h1>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row sm:gap-8 text-xl font-semibold tracking-wider">
            <h2 className="opacity-0 animate-fade-in-rise-leadership">Leadership</h2>
            <h2 className="opacity-0 animate-fade-in-rise-experience">Experience</h2>
            <h2 className="opacity-0 animate-fade-in-rise-opportunity">Opportunity</h2>
        </div>
    </div>
  );
}
