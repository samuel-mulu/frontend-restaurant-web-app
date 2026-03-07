"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { NotificationBell } from "@/components/notification-bell";
import { Loading } from "@/components/ui/loading";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useEffect, useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const auth = useRequireAuth({
    allowedRoles: ["owner", "cashier", "waiter"],
    redirectTo: "/login",
  });

  useEffect(() => {
    const handleRefresh = () => {
      setRefreshTrigger((prev) => prev + 1);
    };

    window.addEventListener("refreshNotifications", handleRefresh);

    return () => {
      window.removeEventListener("refreshNotifications", handleRefresh);
    };
  }, []);

  if (auth.isChecking || !auth.hydrated) {
    return <Loading fullScreen text="Authenticating..." size="lg" />;
  }

  if (!auth.isAuthenticated) {
    return null; // useRequireAuth handles redirect
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="h-screen overflow-y-auto bg-background/80">
        <main className="flex-1 min-h-screen">
          <div className="page-shell">
            <div className="flex items-center gap-2 mb-4">
              <SidebarTrigger className="rounded-full border border-border bg-card/80 text-muted-foreground shadow-sm backdrop-blur" />
              <NotificationBell refreshTrigger={refreshTrigger} />
            </div>
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
