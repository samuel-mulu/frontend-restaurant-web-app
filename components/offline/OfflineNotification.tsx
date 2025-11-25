"use client";

import { useEffect } from "react";
import { useOffline } from "@/hooks/useOffline";
import { useSync } from "@/hooks/useSync";
import { toast } from "sonner";

export function OfflineNotification() {
  const { isOffline, isOnline } = useOffline();
  const { pendingCount, sync } = useSync();

  useEffect(() => {
    if (isOffline) {
      toast.warning("You are now offline", {
        description: "Your changes will be synced when connection is restored",
      });
    }
  }, [isOffline]);

  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      // Auto-sync when coming online (with small delay to ensure connection is stable)
      const timeoutId = setTimeout(() => {
        sync().catch((error) => {
          console.error("Auto-sync failed:", error);
        });
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [isOnline, pendingCount, sync]);

  useEffect(() => {
    if (isOnline && pendingCount === 0) {
      toast.success("All changes synced", {
        description: "Your offline changes have been synchronized",
      });
    }
  }, [isOnline, pendingCount]);

  return null; // This component only shows toasts
}

