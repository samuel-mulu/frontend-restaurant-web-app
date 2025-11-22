"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ShoppingCart, Package, Utensils, List, History } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useSelector } from "react-redux";
import { selectAuthHydrated } from "@/stores/features/auth/authSlice";

const navigation = [
  { name: "Create Order", href: "/create-order", icon: ShoppingCart },
  { name: "Menus", href: "/menus", icon: Utensils },
  { name: "Products", href: "/products", icon: Package },
  { name: "Categories", href: "/categories", icon: List },
  { name: "History", href: "/history", icon: History },
];

export function AppSidebar() {
  const pathname = usePathname();
  const hydrated = useSelector(selectAuthHydrated);

  if (!hydrated) {
    return (
      <Sidebar className="w-64 bg-white border-r border-gray-200 animate-pulse">
        <SidebarHeader className="px-6 py-4 h-16 border-b border-[#e5e9f2]/60" />
        <SidebarContent className="px-3 py-6 space-y-4">
          <div className="h-4 bg-muted rounded w-2/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-3/4" />
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar className="w-64 bg-white border-r border-gray-200">
      <SidebarHeader className="px-6 py-4 h-16 flex items-center justify-between border-b border-[#e5e9f2]/60 bg-white/95 backdrop-blur-md supports-backdrop-filter:bg-white/80">
        Logo Restaurant
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href} className="text-base">
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={cn(
                        "py-2 px-4 rounded-sm font-lato font-normal leading-[22px] tracking-normal align-middle",
                        isActive
                          ? "bg-primary text-white hover:text-white font-lato font-bold"
                          : "text-gray-600 font-normal hover:bg-gray-50"
                      )}
                    >
                      <Link
                        href={item.href}
                        className="flex items-center gap-3"
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-sm font-lato leading-[22px] tracking-normal align-middle">
                          {item.name}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
