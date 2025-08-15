// src/components/layout/sidebar-nav.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { LayoutDashboard, CalendarDays, Users, FileText, Mail, Lightbulb, HandCoins } from "lucide-react"; 

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  role?: "admin" | "member" | "all";
  adminOnly?: boolean; // Hide from admins if they have a replacement
}


const mainNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, role: "all" },
  { href: "/project-ideas", label: "Project Ideas", icon: Lightbulb, role: "all" },
];

const adminNavItems: NavItem[] = [
  { href: "/members", label: "Member Management", icon: Users, role: "admin" },
  { href: "/events", label: "Event Management", icon: CalendarDays, role: "admin" },
  { href: "/admin/finance", label: "Finance", icon: HandCoins, role: "admin" },
  { href: "/admin/communication", label: "Communication", icon: Mail, role: "admin" },
  { href: "/admin/project-ideas", label: "Idea Review", icon: Lightbulb, role: "admin" },
  { href: "/admin/reports", label: "Reports", icon: FileText, role: "admin" },
];


export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  
  if (!user) return null;

  const renderNavItems = (items: NavItem[]) => {
      return items.filter(item => {
          if(user.role === 'admin') return true; // Admins see all admin items
          if(user.role === 'member' && item.role !== 'admin') return true;
          return false;
      }).map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
            tooltip={{ children: item.label, className: "font-sans" }}
          >
            <Link href={item.href}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ));
  }

  return (
    <SidebarMenu>
      {renderNavItems(mainNavItems.filter(item => user.role === 'member' || (user.role === 'admin' && item.href !== '/project-ideas')))}
      {user.role === 'admin' && renderNavItems(adminNavItems)}
    </SidebarMenu>
  );
}
