
"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { ShieldCheck, LogOut, LayoutDashboard } from 'lucide-react';

export default function AccessPlatformLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="h-16 border-b bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto h-full flex items-center justify-between px-4">
          <Link href="/event-access/admin" className="flex items-center gap-2">
            <Image src="https://i.imgur.com/MP1YFNf.png" alt="Platform Logo" width={32} height={32} />
            <span className="font-bold text-lg text-primary font-headline tracking-tight uppercase">EventPlatform</span>
          </Link>
          
          {user && (
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="hidden sm:flex">
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Club Portal
                </Button>
              </Link>
              <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold leading-none">{user.name}</p>
                  <p className="text-[10px] text-muted-foreground">Organizer</p>
                </div>
                <Button variant="outline" size="icon" onClick={logout} title="Log out">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>
      <main className="flex-1">
        {children}
      </main>
      <footer className="py-10 border-t bg-white text-center">
        <div className="container mx-auto px-4">
          <p className="text-sm font-bold text-slate-900">
            &copy; 2026 Leo District 306 D9 Event Management Platform
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Designed & Powered by <span className="text-primary font-semibold">Leo Club of Athugalpura</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
