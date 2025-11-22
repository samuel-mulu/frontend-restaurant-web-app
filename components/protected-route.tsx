"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import {
  selectIsAuthenticated,
  selectAuthHydrated,
} from "@/stores/features/auth/authSlice";
import { useGetProfileQuery } from "@/stores/features/auth/authApi";
import { Loading } from "@/components/ui/loading";

// Auth routes that should be accessible without authentication
const AUTH_ROUTES = ["/login", "/forgot-password"];

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const hydrated = useSelector(selectAuthHydrated);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const { isFetching } = useGetProfileQuery(); // always loads profile

  // Check if current route is an auth route
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  useEffect(() => {
    // Skip protection check for auth routes
    if (isAuthRoute) return;

    if (!hydrated || isFetching) return;

    if (!isAuthenticated) {
      const callbackUrl = encodeURIComponent(pathname);
      router.replace(`/login?callbackUrl=${callbackUrl}`);
    }
  }, [hydrated, isFetching, isAuthenticated, router, pathname, isAuthRoute]);

  if (!hydrated || isFetching) {
    return <Loading fullScreen text="Loading..." size="lg" />;
  }

  return <>{children}</>;
}
