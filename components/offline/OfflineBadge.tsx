"use client";

import { useOffline } from "@/hooks/useOffline";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

export function OfflineBadge() {
  const { isOffline, isOnline, syncStatus } = useOffline();

  if (isOnline && syncStatus === "idle") {
    return null; // Don't show badge when online and synced
  }

  return (
    <Badge
      variant={isOffline ? "destructive" : "secondary"}
      className="fixed top-4 right-4 z-50 flex items-center gap-2"
    >
      {isOffline ? (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Offline</span>
        </>
      ) : syncStatus === "syncing" ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Syncing...</span>
        </>
      ) : (
        <>
          <Wifi className="h-3 w-3" />
          <span>Online</span>
        </>
      )}
    </Badge>
  );
}

