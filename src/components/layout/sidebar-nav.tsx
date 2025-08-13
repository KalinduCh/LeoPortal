// src/components/layout/sidebar-nav.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { LayoutDashboard, CalendarDays, Users, FileText, Mail, ChevronDown, ChevronUp, Lightbulb, UserPlus } from "lucide-react"; 

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  role?: "admin" | "member" | "all";
  adminOnly?: boolean; // Hide from admins if they have a replacement
  memberOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, role: "all" },
  { href: "/project-ideas", label: "Project Ideas", icon: Lightbulb, role: "all", adminOnly: false }, // Visible to members, hidden for admins
  { href: "/events", label: "Event Management", icon: CalendarDays, role: "admin" },
  { href: "/members", label: "Member Management", icon: Users, role: "admin" },
  { href: "/admin/project-ideas", label: "Idea Review", icon: Lightbulb, role: "admin" },
  { href: "/admin/reports", label: "Reports", icon: FileText, role: "admin" },
  { href: "/admin/communication", label: "Communication", icon: Mail, role: "admin" },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  const filteredNavItems = navItems.filter(item => {
    if (user.role === 'admin') {
      // Show 'admin' and 'all' roles, but respect the adminOnly flag
      return item.role === 'admin' || (item.role === 'all' && item.adminOnly !== false);
    }
    if (user.role === 'member') {
      // Show 'member' and 'all' roles
      return item.role === 'member' || item.role === 'all';
    }
    return false;
  });

  return (
    <SidebarMenu>
      {filteredNavItems.map((item) => (
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
