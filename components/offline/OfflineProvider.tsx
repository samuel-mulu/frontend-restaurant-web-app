"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { OfflineNotification } from "./OfflineNotification";
import { offlineDetector } from "@/lib/offline/offlineDetector";
import { registerServiceWorker } from "@/lib/sw/serviceWorker";
import { getCachedAuth } from "@/lib/offline/authCache";
import { useDispatch } from "react-redux";
import {
  setToken,
  setUser,
  markHydrated,
} from "@/stores/features/auth/authSlice";

// Dynamically import client-only components to prevent SSR hydration mismatches
const DynamicOfflineBadge = dynamic(
  () => import("./OfflineBadge").then((mod) => ({ default: mod.OfflineBadge })),
  {
    ssr: false,
  }
);

const DynamicSyncStatus = dynamic(
  () => import("./SyncStatus").then((mod) => ({ default: mod.SyncStatus })),
  {
    ssr: false,
  }
);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();

  useEffect(() => {
    // Register service worker
    registerServiceWorker();

    // Load cached auth on app start
    const loadCachedAuth = async () => {
      try {
        const cachedAuth = await getCachedAuth();
        if (cachedAuth) {
          dispatch(setToken(cachedAuth.accessToken));
          dispatch(
            setUser({
              id: cachedAuth.userId,
              name: "", // Will be loaded from profile if needed
              role: cachedAuth.role as any,
              email: "",
              phone: "",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
          );
        }
      } catch (error) {
        console.error("Failed to load cached auth:", error);
      } finally {
        dispatch(markHydrated());
      }
    };

    loadCachedAuth();

    // Listen for background sync messages
    if ("serviceWorker" in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "SYNC_QUEUE") {
          // Trigger sync when service worker requests it
          window.dispatchEvent(new Event("sync-queue"));
        }
      };
      navigator.serviceWorker.addEventListener("message", handleMessage);

      // Also listen for sync-queue custom events
      const handleSyncQueue = () => {
        // This will be handled by useSync hook
      };
      window.addEventListener("sync-queue", handleSyncQueue);

      return () => {
        navigator.serviceWorker.removeEventListener("message", handleMessage);
        window.removeEventListener("sync-queue", handleSyncQueue);
      };
    }

    // Cleanup on unmount
    return () => {
      offlineDetector.destroy();
    };
  }, [dispatch]);

  return (
    <>
      {children}
      <DynamicOfflineBadge />
      <DynamicSyncStatus />
      <OfflineNotification />
    </>
  );
}
