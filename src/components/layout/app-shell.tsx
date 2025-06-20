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
import { SidebarNav } from "./sidebar-nav";
import { useAuth } from "@/hooks/use-auth"; // To get user info for sidebar footer if needed

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
              alt="LeoPortal Logo" 
              width={32} 
              height={32} 
              className="h-8 w-8 rounded-sm"
              data-ai-hint="club logo"
            />
            <span className="text-xl font-bold font-headline group-data-[collapsible=icon]:hidden">LeoPortal</span>
          </Link>
        </SidebarHeader>
        <Separator className="my-0" />
        <SidebarContent className="p-2">
          <SidebarNav />
        </SidebarContent>
        <Separator className="my-0" />
        <SidebarFooter className="p-4">
          {/* Footer content, e.g., quick links or user status */}
          <Button variant="outline" size="sm" className="w-full group-data-[collapsible=icon]:hidden">
            Need help?
          </Button>
          {user && (
             <p className="text-xs text-muted-foreground mt-2 group-data-[collapsible=icon]:hidden">Logged in as {user.role}</p>
          )}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            {/* Breadcrumbs or page title can go here */}
             <h1 className="text-lg font-semibold font-headline hidden md:block">LeoPortal</h1>
          </div>
          <UserDropdown />
        </header>
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
        <footer className="border-t p-4 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} LeoPortal. All rights reserved.
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
