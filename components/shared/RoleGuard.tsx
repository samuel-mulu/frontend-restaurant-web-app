"use client";

import { Loading } from "@/components/ui/loading";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Role } from "@/types/auth";
import { ReactNode } from "react";

export function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: Role[];
  children: ReactNode;
}) {
  const auth = useRequireAuth({
    allowedRoles,
    redirectTo: "/",
  });

  if (auth.isChecking || !auth.hydrated) {
    return <Loading fullScreen text="Loading..." size="lg" />;
  }

  if (!auth.isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
