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
import { cn } from "@/lib/utils";
import { useLogoutMutation } from "@/stores/features/auth/authApi";
import {
  selectAuthHydrated,
  selectUser,
} from "@/stores/features/auth/authSlice";
import { useSelector } from "react-redux";
import { toast } from "sonner";


// Navigation items based on role
const getNavigationItems = (role?: string) => {
  const baseItems = [
    { name: "Menus", href: "/menus", icon: Utensils },
    { name: "Inventory", href: "/inventory", icon: Package },
    { name: "Categories", href: "/categories", icon: List },
    { name: "History", href: "/history", icon: History },
  ];

  // Owner gets Staff Management, Analytics, and Approvals instead of Create Order
  if (role === "owner") {
    return [
      { name: "Staff Management", href: "/staff-management", icon: Users },
      { name: "Analytics", href: "/analytics", icon: BarChart3 },
      { name: "Approvals", href: "/approvals", icon: ClipboardCheck },
      ...baseItems,
    ];
  }

  // Cashier and Waiter get Create Order and Printer Management
  if (role === "cashier" || role === "waiter") {
    return [
      { name: "Create Order", href: "/create-order", icon: ShoppingCart },
      { name: "Printer", href: "/printer", icon: Printer },
      ...baseItems,
    ];
  }

  // Staff role or unknown role - no Create Order or Staff Management
  return baseItems;
};

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useSelector(selectAuthHydrated);
  const user = useSelector(selectUser);
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

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
      // Still redirect to login even if logout fails
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
            src="/logo1.jpg"
            alt="kandino's kitchen"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-gray-900 dark:text-white font-bold text-sm leading-tight">
            kandino's kitchen
          </span>
          <span className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold">
            Management
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
                          : "text-gray-600 font-normal hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
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

      <SidebarFooter className="border-t border-gray-200 dark:border-gray-800 p-2 space-y-2">
        {/* Profile Link */}
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={isProfileActive}
            className={cn(
              "py-2 px-4 rounded-sm font-lato font-normal leading-[22px] tracking-normal align-middle w-full",
              isProfileActive
                ? "bg-primary text-white hover:text-white font-lato font-bold dark:bg-primary dark:text-white"
                : "text-gray-600 font-normal hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
            )}
          >
            <Link href="/profile" className="flex items-center gap-3">
              <User className="h-5 w-5" />
              <span className="text-sm font-lato leading-[22px] tracking-normal align-middle">
                Profile
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
            isLoggingOut && "opacity-50 cursor-not-allowed"
          )}
        >
          <LogOut className="h-5 w-5 mr-3" />
          <span className="text-sm font-lato leading-[22px] tracking-normal align-middle">
            Logout
          </span>
        </Button>

        {/* User Info */}
        {user && (
          <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800 mt-2 pt-2">
            <div className="font-medium text-gray-700 dark:text-gray-300 truncate">
              {user.name}
            </div>
            <div className="text-gray-500 dark:text-gray-500 capitalize">
              {user.role}
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
              Confirm Logout
            </DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              Are you sure you want to logout? You will need to login again to
              access your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsLogoutDialogOpen(false)}
              disabled={isLoggingOut}
              className="dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Cancel
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
                  Logging out...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
