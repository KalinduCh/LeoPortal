
"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { LogOut, LayoutDashboard, Users, ShieldCheck } from 'lucide-react';

export default function AccessPlatformLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  
  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="h-20 border-b bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto h-full flex items-center justify-between px-4">
          <Link href="/event-access/admin" className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <Image src="https://i.imgur.com/j53LmxF.png" alt="Leo Logo" width={40} height={40} className="object-contain" />
                <Image src="https://i.imgur.com/2MRr4iB.png" alt="Lion Logo" width={40} height={40} className="object-contain" />
                <Image src="https://i.imgur.com/d7gk61F.png" alt="District Logo" width={44} height={44} className="object-contain" />
            </div>
            <div className="hidden lg:block">
                <span className="font-bold text-xl text-primary font-headline tracking-tight uppercase">LeoEntrivo</span>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">D306 D9 Event Platform</p>
            </div>
          </Link>
          
          {user && (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 mr-2">
                <Link href="/event-access/admin">
                  <Button variant="ghost" size="sm" className="font-bold">
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Events
                  </Button>
                </Link>
                {isSuperAdmin && (
                   <Link href="/event-access/admin/users">
                    <Button variant="ghost" size="sm" className="font-bold">
                      <Users className="mr-2 h-4 w-4" /> Manage Organizers
                    </Button>
                  </Link>
                )}
              </div>

              <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
              
              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold leading-none">{user.name}</p>
                  <p className="text-[9px] text-primary font-black uppercase tracking-tighter mt-1 flex items-center justify-end">
                    <ShieldCheck className="h-2.5 w-2.5 mr-1" /> {isSuperAdmin ? 'Super Admin' : 'Organizer'}
                  </p>
                </div>
                <Button variant="outline" size="icon" onClick={logout} title="Log out" className="rounded-full h-9 w-9">
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
