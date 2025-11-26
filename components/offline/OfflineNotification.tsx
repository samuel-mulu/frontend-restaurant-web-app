"use client";

import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useOffline } from "@/hooks/useOffline";
import { useSync } from "@/hooks/useSync";
import { selectIsAuthenticated } from "@/stores/features/auth/authSlice";
import { toast } from "sonner";

export function OfflineNotification() {
  const { isOffline, isOnline } = useOffline();
  const { pendingCount, sync } = useSync();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  useEffect(() => {
    if (isOffline) {
      toast.warning("You are now offline", {
        description: "Your changes will be synced when connection is restored",
      });
    }
  }, [isOffline]);

  useEffect(() => {
    // Only attempt sync if user is authenticated (token may be in HTTP-only cookie)
    if (isOnline && pendingCount > 0 && isAuthenticated) {
      // Auto-sync when coming online (with small delay to ensure connection is stable)
      const timeoutId = setTimeout(() => {
        sync().catch((error) => {
          // Silently handle errors - useSync hook already handles auto-sync
          // This is just a fallback, so we don't need to show errors here
          if (error.message !== "Not authenticated") {
            console.error("Auto-sync failed:", error);
          }
        });
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [isOnline, pendingCount, isAuthenticated, sync]);

  useEffect(() => {
    if (isOnline && pendingCount === 0) {
      toast.success("All changes synced", {
        description: "Your offline changes have been synchronized",
      });
    }
  }, [isOnline, pendingCount]);

  return null; // This component only shows toasts
}
