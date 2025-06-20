
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
import { LayoutDashboard, UserCircle, CalendarDays, Users, Settings, ChevronDown, ChevronUp, Bot, Mail } from "lucide-react"; // Added Mail

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  role?: "admin" | "member" | "all";
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, role: "all" },
  { href: "/profile", label: "Profile", icon: UserCircle, role: "all" },
  { href: "/events", label: "Event Management", icon: CalendarDays, role: "admin" },
  { href: "/members", label: "Member Management", icon: Users, role: "admin" },
  { href: "/admin/communication", label: "Communication", icon: Mail, role: "admin" }, // New communication link
  // Example with sub-menu
  // {
  //   href: "#", label: "Reports", icon: BarChart3, role: "admin", children: [
  //     { href: "/reports/attendance", label: "Attendance", icon: CheckSquare },
  //     { href: "/reports/membership", label: "Membership", icon: UserCheck },
  //   ]
  // },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [openSubMenus, setOpenSubMenus] = React.useState<Record<string, boolean>>({});

  const toggleSubMenu = (label: string) => {
    setOpenSubMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  if (!user) return null;

  const filteredNavItems = navItems.filter(item => item.role === "all" || item.role === user.role);

  return (
    <SidebarMenu>
      {filteredNavItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          {item.children ? (
            <>
              <SidebarMenuButton
                onClick={() => toggleSubMenu(item.label)}
                className="justify-between"
                isActive={item.children.some(child => pathname.startsWith(child.href))}
                aria-expanded={openSubMenus[item.label]}
              >
                <div className="flex items-center gap-2">
                  <item.icon />
                  <span>{item.label}</span>
                </div>
                {openSubMenus[item.label] ? <ChevronUp /> : <ChevronDown />}
              </SidebarMenuButton>
              {openSubMenus[item.label] && (
                <SidebarMenuSub>
                  {item.children.map(child => (
                    <SidebarMenuSubItem key={child.href}>
                       <Link href={child.href}>
                        <SidebarMenuSubButton
                          isActive={pathname === child.href || pathname.startsWith(child.href + "/")}
                        >
                          <child.icon />
                          <span>{child.label}</span>
                        </SidebarMenuSubButton>
                      </Link>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              )}
            </>
          ) : (
            <Link href={item.href} asChild>
              <SidebarMenuButton
                isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                tooltip={{ children: item.label, className: "font-sans" }}
              >
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </Link>
          )}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

    
