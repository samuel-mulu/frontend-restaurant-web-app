"use client";

import { useEffect, useState } from "react";
import { offlineDetector } from "@/lib/offline/offlineDetector";

export interface UseOfflineReturn {
  isOffline: boolean;
  isOnline: boolean;
  lastOnline: Date | null;
  syncStatus: "idle" | "syncing" | "synced" | "error";
}

/**
 * Hook to access offline state and sync status
 */
export function useOffline(): UseOfflineReturn {
  const [isOnline, setIsOnline] = useState(offlineDetector.getOnlineStatus());
  const [lastOnline, setLastOnline] = useState<Date | null>(
    offlineDetector.getLastKnownOnline()
  );
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "synced" | "error"
  >("idle");

  useEffect(() => {
    const unsubscribe = offlineDetector.subscribe((online) => {
      setIsOnline(online);
      if (online) {
        setLastOnline(new Date());
      }
    });

    return unsubscribe;
  }, []);

  return {
    isOffline: !isOnline,
    isOnline,
    lastOnline,
    syncStatus,
  };
}

