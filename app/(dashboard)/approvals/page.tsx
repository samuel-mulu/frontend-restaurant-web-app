"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApprovalManagement } from "@/components/features/ApprovalManagement";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Loading } from "@/components/ui/loading";

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<"menu" | "inventory">("menu");
  const auth = useRequireAuth({
    allowedRoles: ["owner"],
    redirectTo: "/",
  });

  if (auth.isChecking || !auth.hydrated) {
    return <Loading fullScreen text="Loading..." size="lg" />;
  }

  if (!auth.isAuthenticated || auth.user?.role !== "owner") {
    return null; // useRequireAuth handles redirect
  }

  return (
    <div className="flex flex-col gap-3">
      <header>
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
          Approvals
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Review and approve pending menu items and inventory items
        </p>
      </header>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "menu" | "inventory")} className="w-full">
        <TabsList>
          <TabsTrigger value="menu">Menu Items</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Items</TabsTrigger>
        </TabsList>
        <TabsContent value="menu" className="mt-4">
          {activeTab === "menu" && <ApprovalManagement type="menu" />}
        </TabsContent>
        <TabsContent value="inventory" className="mt-4">
          {activeTab === "inventory" && <ApprovalManagement type="inventory" />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

