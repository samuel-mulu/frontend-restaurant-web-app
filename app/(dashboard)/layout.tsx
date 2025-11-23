"use client";

import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Loading } from "@/components/ui/loading";

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
      <SidebarInset className="h-screen overflow-y-auto bg-slate-50/80">
        <main className="flex-1 min-h-screen">
          <div className="page-shell">
            <SidebarTrigger className="rosunded-full border border-slate-200/70 bg-white/80  text-slate-500 shadow-sm backdrop-blur" />
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
