"use client";

import { useState, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectAccessToken } from "@/stores/features/auth/authSlice";
import { sync, getSyncStatus } from "@/lib/offline/syncService";
import { offlineDetector } from "@/lib/offline/offlineDetector";
import { useOffline } from "./useOffline";

export interface UseSyncReturn {
  sync: () => Promise<void>;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: Date | null;
  syncStatus: {
    pending: number;
    syncing: number;
    errors: number;
    deadLetter: number;
  };
}

/**
 * Hook to trigger sync and monitor sync progress
 */
export function useSync(): UseSyncReturn {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState({
    pending: 0,
    syncing: 0,
    errors: 0,
    deadLetter: 0,
  });

  const accessToken = useSelector(selectAccessToken);
  const { isOnline } = useOffline();

  // Update sync status periodically
  const updateSyncStatus = useCallback(async () => {
    const status = await getSyncStatus();
    setSyncStatus(status);
  }, []);

  const performSync = useCallback(async () => {
    if (!isOnline) {
      throw new Error("Cannot sync while offline");
    }

    if (!accessToken) {
      throw new Error("Not authenticated");
    }

    setIsSyncing(true);
    try {
      await sync(accessToken);
      setLastSyncTime(new Date());
      await updateSyncStatus();
    } catch (error) {
      console.error("Sync failed:", error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, accessToken, updateSyncStatus]);

  // Initial load and periodic updates
  useEffect(() => {
    updateSyncStatus();
    const interval = setInterval(updateSyncStatus, 5000); // Update every 5s
    return () => clearInterval(interval);
  }, [updateSyncStatus]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && syncStatus.pending > 0 && accessToken) {
      // Small delay to ensure connection is stable
      const timeoutId = setTimeout(() => {
        performSync().catch((error) => {
          console.error("Auto-sync on reconnect failed:", error);
        });
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [isOnline, syncStatus.pending, accessToken, performSync]);

  // Listen for sync-queue events from service worker
  useEffect(() => {
    const handleSyncQueue = () => {
      if (isOnline && accessToken) {
        performSync().catch((error) => {
          console.error("Background sync failed:", error);
        });
      }
    };

    window.addEventListener("sync-queue", handleSyncQueue);
    return () => window.removeEventListener("sync-queue", handleSyncQueue);
  }, [isOnline, accessToken, performSync]);

  return {
    sync: performSync,
    isSyncing,
    pendingCount: syncStatus.pending,
    lastSyncTime,
    syncStatus,
  };
}
