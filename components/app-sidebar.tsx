"use client";

import {
  AlertTriangle,
  BarChart3,
  ClipboardCheck,
  History,
  List,
  LogOut,
  Package,
  Printer,
  ShoppingCart,
  User,
  Users,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "./theme-toggle";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { branding } from "@/config/branding";
import { useCalendarSystem } from "@/hooks/useCalendarSystem";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";
import { useLogoutMutation } from "@/stores/features/auth/authApi";
import {
  selectAuthHydrated,
  selectUser,
} from "@/stores/features/auth/authSlice";
import { useSelector } from "react-redux";
import { toast } from "sonner";

// Navigation items based on role — keys map to i18n translation keys
const getNavigationItems = (role?: string) => {
  const baseItems = [
    { nameKey: "nav_menus" as const, href: "/menus", icon: Utensils },
    { nameKey: "nav_inventory" as const, href: "/inventory", icon: Package },
    { nameKey: "nav_categories" as const, href: "/categories", icon: List },
    { nameKey: "nav_history" as const, href: "/history", icon: History },
  ];

  if (role === "owner") {
    return [
      { nameKey: "nav_staff_management" as const, href: "/staff-management", icon: Users },
      { nameKey: "nav_analytics" as const, href: "/analytics", icon: BarChart3 },
      { nameKey: "nav_reports" as const, href: "/reports", icon: ClipboardCheck },
      { nameKey: "nav_approvals" as const, href: "/approvals", icon: ClipboardCheck },
      ...baseItems,
    ];
  }

  if (role === "cashier" || role === "waiter") {
    return [
      { nameKey: "nav_create_order" as const, href: "/create-order", icon: ShoppingCart },
      { nameKey: "nav_printer" as const, href: "/printer", icon: Printer },
      ...baseItems,
    ];
  }

  return baseItems;
};

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useSelector(selectAuthHydrated);
  const user = useSelector(selectUser);
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const { t } = useLanguage();
  const { calSystem, setCalSystem } = useCalendarSystem();

  const handleLogoutClick = () => {
    setIsLogoutDialogOpen(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      await logout().unwrap();
      toast.success("Logged out successfully");
      setIsLogoutDialogOpen(false);
      router.push("/login");
    } catch (err: unknown) {
      const error = err as {
        data?: { message?: string };
        message?: string;
      };
      const message =
        error?.data?.message || error?.message || "Failed to logout";
      toast.error(message);
      setIsLogoutDialogOpen(false);
      router.push("/login");
    }
  };

  if (!hydrated) {
    return (
      <Sidebar className="w-64 bg-white border-r border-gray-200 animate-pulse dark:bg-gray-900 dark:border-gray-800">
        <SidebarHeader className="px-6 py-4 h-16 border-b border-[#e5e9f2]/60 dark:border-gray-800" />
        <SidebarContent className="px-3 py-6 space-y-4">
          <div className="h-4 bg-muted rounded w-2/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-3/4" />
        </SidebarContent>
      </Sidebar>
    );
  }

  const isProfileActive = pathname === "/profile";

  return (
    <Sidebar className="w-64 bg-white border-r border-gray-200 dark:bg-gray-900 dark:border-gray-800">
      <SidebarHeader className="px-6 py-4 h-20 flex items-center gap-3 border-b border-[#e5e9f2]/60 bg-white/95 backdrop-blur-md supports-backdrop-filter:bg-white/80 dark:bg-gray-900/95 dark:border-gray-800">
        <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-white">
          <img
            src={branding.logo}
            alt={branding.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-gray-900 dark:text-white font-bold text-sm leading-tight">
            {branding.name}
          </span>
          <span className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold">
            {t("sidebar_management")}
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {getNavigationItems(user?.role).map((item) => {
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
                          ? "bg-primary text-white hover:text-white font-lato font-bold dark:bg-primary dark:text-white"
                          : "text-gray-600 font-normal hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800",
                      )}
                    >
                      <Link
                        href={item.href}
                        className="flex items-center gap-3"
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-sm font-lato leading-[22px] tracking-normal align-middle">
                          {t(item.nameKey)}
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

      <SidebarFooter className="border-t border-gray-200 dark:border-gray-800 p-2 space-y-2">
        {/* Theme Toggle + Language Toggle row */}
        <div className="flex items-center gap-1">
          <div className="flex-1">
            <ThemeToggle />
          </div>
          <div className="flex-1">
            <LanguageToggle />
          </div>
        </div>

        {/* Calendar System Toggle */}
        <SidebarMenuItem>
          <Button
            variant="ghost"
            onClick={() => setCalSystem(calSystem === "gc" ? "ec" : "gc")}
            className="w-full justify-start py-2 px-4 rounded-sm font-lato font-normal leading-[22px] tracking-normal align-middle text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <span className="text-base mr-3">📅</span>
            <span className="text-sm font-lato leading-[22px] tracking-normal align-middle">
              {calSystem === "gc" ? t("cal_ec") : t("cal_gc")}
            </span>
          </Button>
        </SidebarMenuItem>

        {/* Profile Link */}
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={isProfileActive}
            className={cn(
              "py-2 px-4 rounded-sm font-lato font-normal leading-[22px] tracking-normal align-middle w-full",
              isProfileActive
                ? "bg-primary text-white hover:text-white font-lato font-bold dark:bg-primary dark:text-white"
                : "text-gray-600 font-normal hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800",
            )}
          >
            <Link href="/profile" className="flex items-center gap-3">
              <User className="h-5 w-5" />
              <span className="text-sm font-lato leading-[22px] tracking-normal align-middle">
                {t("nav_profile")}
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        {/* Logout Button */}
        <Button
          variant="ghost"
          onClick={handleLogoutClick}
          disabled={isLoggingOut}
          className={cn(
            "w-full justify-start py-2 px-4 rounded-sm font-lato font-normal leading-[22px] tracking-normal align-middle text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800",
            isLoggingOut && "opacity-50 cursor-not-allowed",
          )}
        >
          <LogOut className="h-5 w-5 mr-3" />
          <span className="text-sm font-lato leading-[22px] tracking-normal align-middle">
            {t("sidebar_logout")}
          </span>
        </Button>

        {/* User Info */}
        {user && (
          <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800 mt-2 pt-2">
            <div className="font-medium text-gray-700 dark:text-gray-300 truncate">
              {user.name}
            </div>
            <div className="text-gray-500 dark:text-gray-500 capitalize">
              {user.role === "owner"
                ? t("role_owner")
                : user.role === "cashier"
                ? t("role_cashier")
                : user.role === "waiter"
                ? t("role_waiter")
                : user.role}
            </div>
          </div>
        )}
      </SidebarFooter>

      {/* Logout Confirmation Dialog */}
      <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <DialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 dark:text-white">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t("logout_confirm_title")}
            </DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              {t("logout_confirm_description")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsLogoutDialogOpen(false)}
              disabled={isLoggingOut}
              className="dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
            >
              {t("logout_cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleLogoutConfirm}
              disabled={isLoggingOut}
              className="dark:bg-red-600 dark:text-white dark:hover:bg-red-700"
            >
              {isLoggingOut ? (
                <>
                  <LogOut className="h-4 w-4 mr-2 animate-spin" />
                  {t("logout_loading")}
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  {t("logout_confirm_button")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
