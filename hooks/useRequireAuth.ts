"use client";

import { useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import {
  selectAccessToken,
  selectAuthHydrated,
  selectIsAuthenticated,
  selectUser,
} from "@/stores/features/auth/authSlice";
import { Role } from "@/types/auth";

type UseRequireAuthOptions = {
  allowedRoles?: Role[];
  redirectTo?: string;
};

export type RequireAuthResult = {
  user: ReturnType<typeof selectUser>;
  role: Role | null | undefined;
  accessToken: string | null;
  hydrated: boolean;
  isChecking: boolean;
  isAuthenticated: boolean;
  isAuthorized: boolean;
};

export function useRequireAuth(
  options: UseRequireAuthOptions = {}
): RequireAuthResult {
  const { allowedRoles, redirectTo = "/login" } = options;

  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useSelector(selectAuthHydrated);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const accessToken = useSelector(selectAccessToken);
  const role = user?.role;

  const isAuthorized = useMemo(() => {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    if (!role) return false;
    return allowedRoles.includes(role);
  }, [allowedRoles, role]);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated || !isAuthorized) {
      // If redirecting to login, include the current pathname as callbackUrl
      if (redirectTo === "/login" || redirectTo.startsWith("/login")) {
        const callbackUrl = encodeURIComponent(pathname);
        router.replace(`/login?callbackUrl=${callbackUrl}`);
      } else {
        router.replace(redirectTo);
      }
    }
  }, [hydrated, isAuthenticated, isAuthorized, redirectTo, router, pathname]);

  return {
    user,
    role,
    accessToken,
    hydrated,
    isChecking: !hydrated,
    isAuthenticated: isAuthenticated && isAuthorized,
    isAuthorized,
  };
}
