"use client";

import { useEffect, useState } from "react";
import { useSync } from "@/hooks/useSync";
import { useOffline } from "@/hooks/useOffline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  AlertCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  getDeadLetterQueue,
  DeadLetterQueueRecord,
} from "@/lib/offline/syncQueue";
import { cn } from "@/lib/utils";

export function SyncStatus() {
  const { sync, isSyncing, pendingCount, lastSyncTime, syncStatus } = useSync();
  const { isOnline } = useOffline();
  const [deadLetterItems, setDeadLetterItems] = useState<
    DeadLetterQueueRecord[]
  >([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const loadDeadLetter = async () => {
      const items = await getDeadLetterQueue();
      setDeadLetterItems(items);
    };
    loadDeadLetter();
    const interval = setInterval(loadDeadLetter, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    try {
      await sync();
    } catch (error) {
      console.error("Manual sync failed:", error);
    }
  };

  // Don't show if offline and no pending items
  if (!isOnline && pendingCount === 0 && deadLetterItems.length === 0) {
    return null;
  }

  const hasPending = pendingCount > 0;
  const hasErrors = deadLetterItems.length > 0;

  return (
    <div className="fixed top-4 right-[calc(1rem+120px)] z-50 flex items-start gap-2">
      {/* Compact sync button/indicator */}
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          {/* Sync button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleSync}
            disabled={!isOnline || isSyncing || pendingCount === 0}
            className={cn(
              "h-8 px-3 text-xs",
              hasPending && !isSyncing && "border-primary text-primary",
              isSyncing && "border-primary"
            )}
          >
            {isSyncing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>

          {/* Expand/collapse button */}
          {(hasPending || hasErrors || lastSyncTime) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>

        {/* Expanded details panel */}
        {isExpanded && (
          <div className="w-64 rounded-lg border bg-background/95 backdrop-blur-sm shadow-lg p-3 space-y-2 text-xs">
            {/* Status summary */}
            <div className="space-y-1.5">
              {hasPending && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Pending</span>
                  <Badge variant="secondary" className="text-xs">
                    {syncStatus.pending}
                  </Badge>
                </div>
              )}
              {hasErrors && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Failed</span>
                  <Badge variant="destructive" className="text-xs">
                    {syncStatus.deadLetter}
                  </Badge>
                </div>
              )}
              {lastSyncTime && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    Last: {new Date(lastSyncTime).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>

            {/* Detailed status */}
            {(hasPending || hasErrors) && (
              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending:</span>
                  <span className="font-medium">{syncStatus.pending}</span>
                </div>
                {syncStatus.syncing > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Syncing:</span>
                    <span className="font-medium">{syncStatus.syncing}</span>
                  </div>
                )}
                {syncStatus.errors > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Errors:</span>
                    <span className="font-medium text-destructive">
                      {syncStatus.errors}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Failed operations */}
            {hasErrors && (
              <div className="border-t pt-2">
                <div className="mb-1.5 flex items-center gap-1.5 font-medium text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  <span>Failed Operations</span>
                </div>
                <div className="max-h-32 space-y-1 overflow-y-auto">
                  {deadLetterItems.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="rounded bg-destructive/10 p-1.5"
                    >
                      <div className="font-medium">{item.type}</div>
                      <div className="text-muted-foreground text-[10px]">
                        {item.error}
                      </div>
                    </div>
                  ))}
                  {deadLetterItems.length > 3 && (
                    <div className="text-muted-foreground text-[10px]">
                      +{deadLetterItems.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
