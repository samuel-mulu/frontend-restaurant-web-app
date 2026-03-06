"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { Loading } from "@/components/ui/loading";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/notification-bell";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = useRequireAuth({
    allowedRoles: ["owner", "cashier", "waiter"],
    redirectTo: "/login",
  });

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
              <NotificationBell />
            </div>
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
