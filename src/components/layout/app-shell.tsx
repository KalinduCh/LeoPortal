
// src/components/layout/app-shell.tsx
"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UserDropdown } from "./user-dropdown";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserCircle, Mail, Phone } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";


export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const logoUrl = "https://i.imgur.com/aRktweQ.png";

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon" variant="sidebar" className="border-r border-sidebar-border shadow-md">
        <SidebarRail />
        <SidebarHeader className="p-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-primary hover:text-accent transition-colors">
            <Image 
              src={logoUrl} 
              alt="LEO Portal Logo" 
              width={32} 
              height={32} 
              className="h-8 w-8 rounded-sm"
              data-ai-hint="club logo"
            />
            <span className="text-xl font-bold font-headline group-data-[collapsible=icon]:hidden">LEO Portal</span>
          </Link>
        </SidebarHeader>
        <Separator className="my-0" />
        <SidebarContent className="p-2">
          <SidebarNav />
        </SidebarContent>
        <Separator className="my-0" />
        <SidebarFooter className="p-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full group-data-[collapsible=icon]:hidden">
                Need help?
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Help & Support</DialogTitle>
                <DialogDescription>
                  If you have any questions or need assistance, please contact one of the administrators below.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-2">
                <div>
                  <h4 className="font-semibold text-primary mb-2">Club President</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-muted-foreground" />
                      <span>Alex Perera</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href="mailto:president@leoclub.com" className="hover:underline">president@leoclub.com</a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href="tel:+94771234567" className="hover:underline">+94 77 123 4567</a>
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold text-primary mb-2">IT Support</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-muted-foreground" />
                      <span>Chris Fernando</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href="mailto:support@leoclub.com" className="hover:underline">support@leoclub.com</a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href="tel:+94711234567" className="hover:underline">+94 71 123 4567</a>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          {user && (
             <p className="text-xs text-muted-foreground mt-2 group-data-[collapsible=icon]:hidden">Logged in as {user.role}</p>
          )}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-lg font-semibold font-headline hidden md:block">Welcome to Leo Club of Athugalpura...</h1>
          </div>
          <UserDropdown />
        </header>
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
        <footer className="border-t p-4 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} LEO Portal. All rights reserved.
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
