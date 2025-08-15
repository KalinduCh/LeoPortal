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
import { LayoutDashboard, CalendarDays, Users, FileText, Mail, Lightbulb, HandCoins, Settings } from "lucide-react"; 

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const memberNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/project-ideas", label: "Project Ideas", icon: Lightbulb },
];

const adminNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/members", label: "Members", icon: Users },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/admin/finance", label: "Finance", icon: HandCoins },
  { href: "/admin/communication", label: "Communication", icon: Mail },
  { href: "/admin/project-ideas", label: "Idea Review", icon: Lightbulb },
  { href: "/admin/reports", label: "Reports", icon: FileText },
];

const superAdminNavItems: NavItem[] = [
    ...adminNavItems,
    { href: "/admin/settings", label: "Settings", icon: Settings },
];


export function SidebarNav() {
  const pathname = usePathname();
  const { user, adminViewMode } = useAuth();
  
  if (!user) return null;

  let itemsToShow = memberNavItems;
  
  if (user.role === 'super_admin') {
      itemsToShow = superAdminNavItems;
  } else if (user.role === 'admin' && adminViewMode === 'admin_view') {
      itemsToShow = adminNavItems;
  }

  return (
    <SidebarMenu>
      {itemsToShow.map((item) => (
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
      ))}
    </SidebarMenu>
  );
}
