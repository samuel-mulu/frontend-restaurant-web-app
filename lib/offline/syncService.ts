/**
 * Sync Service
 * Processes sync queue and syncs with backend
 */

import { apiConfig } from "@/config/apiConfig";
import {
  getOperationsForBatch,
  markAsSyncing,
  markAsSynced,
  markAsError,
  SyncQueueRecord,
} from "./syncQueue";
import { offlineDetector } from "./offlineDetector";
import { db } from "@/lib/db/indexedDB";

export interface SyncResult {
  synced: number;
  errors: number;
  conflicts: number;
}

/**
 * Calculate exponential backoff with jitter
 */
function calculateBackoff(retries: number): number {
  const base = 1000; // 1 second
  const max = 60000; // 60 seconds
  const exponential = Math.min(base * Math.pow(2, retries), max);
  const jitter = exponential * 0.2 * (Math.random() * 2 - 1); // ±20% jitter
  return Math.max(1000, exponential + jitter);
}

/**
 * Format sync operation for backend
 */
function formatSyncOperation(record: SyncQueueRecord) {
  return {
    type: record.type,
    clientId: record.clientId,
    data: record.data,
    timestamp: record.timestamp,
    method: record.method,
  };
}

/**
 * Process sync batch
 */
async function processBatch(
  operations: SyncQueueRecord[],
  accessToken: string
): Promise<{
  synced: Array<{ clientId: string; serverId: string; type: string }>;
  conflicts: Array<{ clientId: string; reason: string }>;
  errors: Array<{ clientId: string; error: string }>;
}> {
  const formattedOps = operations.map(formatSyncOperation);

  const response = await fetch(`${apiConfig.BASE_URL}/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: "include",
    body: JSON.stringify({ operations: formattedOps }),
  });

  if (!response.ok) {
    throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  // Backend returns: { success: true, data: { synced: [], conflicts: [], errors: [] } }
  if (result.success && result.data) {
    return result.data;
  }
  // Fallback to direct result if structure is different
  return result;
}

/**
 * Update local records with server IDs
 */
async function updateLocalRecords(
  synced: Array<{ clientId: string; serverId: string; type: string }>
): Promise<void> {
  for (const item of synced) {
    // Update the appropriate table based on type
    switch (item.type) {
      case "order":
        await db.orders
          .where("clientId")
          .equals(item.clientId)
          .modify({ _id: item.serverId, syncStatus: "synced" });
        break;
      case "item":
        await db.items
          .where("clientId")
          .equals(item.clientId)
          .modify({ _id: item.serverId, syncStatus: "synced" });
        break;
      case "inventory":
        await db.inventory
          .where("clientId")
          .equals(item.clientId)
          .modify({ _id: item.serverId, syncStatus: "synced" });
        break;
      case "category":
        await db.categories
          .where("clientId")
          .equals(item.clientId)
          .modify({ _id: item.serverId, syncStatus: "synced" });
        break;
      case "staff":
        await db.staff
          .where("clientId")
          .equals(item.clientId)
          .modify({ _id: item.serverId, syncStatus: "synced" });
        break;
      case "table":
        await db.tables
          .where("clientId")
          .equals(item.clientId)
          .modify({ _id: item.serverId, syncStatus: "synced" });
        break;
      case "cashLedger":
        await db.cashLedger
          .where("clientId")
          .equals(item.clientId)
          .modify({ _id: item.serverId, syncStatus: "synced" });
        break;
    }
  }
}

/**
 * Main sync function
 */
export async function sync(accessToken: string): Promise<SyncResult> {
  if (!offlineDetector.getOnlineStatus()) {
    throw new Error("Cannot sync while offline");
  }

  const result: SyncResult = {
    synced: 0,
    errors: 0,
    conflicts: 0,
  };

  let hasMore = true;
  let retryCount = 0;
  const maxRetries = 3;

  while (hasMore && retryCount < maxRetries) {
    try {
      const operations = await getOperationsForBatch();

      if (operations.length === 0) {
        hasMore = false;
        break;
      }

      const operationIds = operations.map((op) => op.id!).filter((id) => id !== undefined);

      // Mark as syncing
      await markAsSyncing(operationIds);

      try {
        // Process batch
        const batchResult = await processBatch(operations, accessToken);

        // Mark synced operations
        for (const synced of batchResult.synced) {
          await markAsSynced(synced.clientId, synced.serverId);
          result.synced++;
        }

        // Update local records with server IDs
        await updateLocalRecords(batchResult.synced);

        // Handle conflicts
        for (const conflict of batchResult.conflicts) {
          await markAsError(conflict.clientId, `Conflict: ${conflict.reason}`);
          result.conflicts++;
        }

        // Handle errors
        for (const error of batchResult.errors) {
          await markAsError(error.clientId, error.error);
          result.errors++;
        }

        retryCount = 0; // Reset retry count on success
      } catch (error: any) {
        // Mark all operations as error
        for (const op of operations) {
          await markAsError(
            op.clientId,
            error.message || "Sync failed"
          );
          result.errors++;
        }

        // Retry with backoff
        if (retryCount < maxRetries) {
          const backoff = calculateBackoff(retryCount);
          await new Promise((resolve) => setTimeout(resolve, backoff));
          retryCount++;
        } else {
          hasMore = false;
        }
      }
    } catch (error: any) {
      console.error("Sync error:", error);
      hasMore = false;
    }
  }

  return result;
}

/**
 * Get sync status
 */
export async function getSyncStatus(): Promise<{
  pending: number;
  syncing: number;
  errors: number;
  deadLetter: number;
}> {
  const pending = await db.syncQueue
    .where("status")
    .anyOf(["pending", "error"])
    .count();
  const syncing = await db.syncQueue.where("status").equals("syncing").count();
  const deadLetter = await db.deadLetterQueue.count();

  return {
    pending,
    syncing,
    errors: pending, // Errors are included in pending
    deadLetter,
  };
}

