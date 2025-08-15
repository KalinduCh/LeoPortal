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
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { LayoutDashboard, CalendarDays, Users, FileText, Mail, Lightbulb, Settings, DollarSign, ChevronDown } from "lucide-react"; 

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  role?: "admin" | "member" | "all";
  adminOnly?: boolean; // Hide from admins if they have a replacement
}

interface NavGroup {
    label: string;
    icon: React.ElementType;
    role: "admin" | "member";
    items: NavItem[];
}

const mainNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, role: "all" },
  { href: "/project-ideas", label: "Project Ideas", icon: Lightbulb, role: "all" },
];

const adminNavItems: NavItem[] = [
  { href: "/events", label: "Event Management", icon: CalendarDays, role: "admin" },
  { href: "/members", label: "Member Management", icon: Users, role: "admin" },
  { href: "/admin/project-ideas", label: "Idea Review", icon: Lightbulb, role: "admin" },
  { href: "/admin/reports", label: "Reports", icon: FileText, role: "admin" },
  { href: "/admin/communication", label: "Communication", icon: Mail, role: "admin" },
];

const settingsGroup: NavGroup = {
    label: "Settings",
    icon: Settings,
    role: "admin",
    items: [
        { href: "/admin/finance", label: "Finance", icon: DollarSign, role: "admin" },
    ]
}


export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  
  React.useEffect(() => {
    // Open the settings group if the current path is inside it
    if (settingsGroup.items.some(item => pathname.startsWith(item.href))) {
      setIsSettingsOpen(true);
    }
  }, [pathname]);


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

  const renderGroup = (group: NavGroup) => {
    const isGroupActive = group.items.some(item => pathname.startsWith(item.href));
    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                isActive={isGroupActive}
                className="justify-between"
            >
                <div className="flex items-center gap-2">
                    <group.icon />
                    <span>{group.label}</span>
                </div>
                <ChevronDown className={`transition-transform duration-200 ${isSettingsOpen ? 'rotate-180' : ''}`} />
            </SidebarMenuButton>
            {isSettingsOpen && (
                <SidebarMenuSub>
                    {group.items.map(item => (
                        <SidebarMenuSubItem key={item.href}>
                            <SidebarMenuSubButton asChild isActive={pathname.startsWith(item.href)}>
                                <Link href={item.href}>
                                    <item.icon />
                                    <span>{item.label}</span>
                                </Link>
                            </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                    ))}
                </SidebarMenuSub>
            )}
        </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenu>
      {renderNavItems(mainNavItems.filter(item => user.role === 'member' || (user.role === 'admin' && item.href !== '/project-ideas')))}
      {user.role === 'admin' && renderNavItems(adminNavItems)}
      {user.role === 'admin' && renderGroup(settingsGroup)}
    </SidebarMenu>
  );
}
