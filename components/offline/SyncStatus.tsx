"use client";

import { useEffect, useState } from "react";
import { useSync } from "@/hooks/useSync";
import { useOffline } from "@/hooks/useOffline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertCircle, Clock, Loader2 } from "lucide-react";
import {
  getDeadLetterQueue,
  DeadLetterQueueRecord,
} from "@/lib/offline/syncQueue";

export function SyncStatus() {
  const { sync, isSyncing, pendingCount, lastSyncTime, syncStatus } = useSync();
  const { isOnline } = useOffline();
  const [deadLetterItems, setDeadLetterItems] = useState<
    DeadLetterQueueRecord[]
  >([]);
  const [showDetails, setShowDetails] = useState(false);

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

  if (!isOnline && pendingCount === 0 && deadLetterItems.length === 0) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Sync Status</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="h-6 px-2"
          >
            {showDetails ? "Hide" : "Show"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Pending</span>
            <Badge variant="secondary">{syncStatus.pending}</Badge>
          </div>
          {syncStatus.deadLetter > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Failed</span>
              <Badge variant="destructive">{syncStatus.deadLetter}</Badge>
            </div>
          )}
          {lastSyncTime && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                Last sync: {new Date(lastSyncTime).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        {isSyncing && (
          <div className="space-y-1">
            <Progress value={undefined} className="h-1" />
            <p className="text-xs text-muted-foreground">
              Syncing operations...
            </p>
          </div>
        )}

        {showDetails && (
          <div className="space-y-2 border-t pt-2">
            <div className="text-xs font-medium">Details</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Pending:</span>
                <span>{syncStatus.pending}</span>
              </div>
              <div className="flex justify-between">
                <span>Syncing:</span>
                <span>{syncStatus.syncing}</span>
              </div>
              <div className="flex justify-between">
                <span>Errors:</span>
                <span>{syncStatus.errors}</span>
              </div>
              <div className="flex justify-between">
                <span>Dead Letter:</span>
                <span>{syncStatus.deadLetter}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSync}
            disabled={!isOnline || isSyncing || pendingCount === 0}
            className="flex-1"
          >
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-3 w-3" />
                Sync Now
              </>
            )}
          </Button>
        </div>

        {deadLetterItems.length > 0 && (
          <div className="border-t pt-2">
            <div className="mb-2 flex items-center gap-1 text-xs font-medium text-destructive">
              <AlertCircle className="h-3 w-3" />
              <span>Failed Operations</span>
            </div>
            <div className="max-h-32 space-y-1 overflow-y-auto text-xs">
              {deadLetterItems.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded bg-destructive/10 p-1">
                  <div className="font-medium">{item.type}</div>
                  <div className="text-muted-foreground">{item.error}</div>
                </div>
              ))}
              {deadLetterItems.length > 3 && (
                <div className="text-muted-foreground">
                  +{deadLetterItems.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
