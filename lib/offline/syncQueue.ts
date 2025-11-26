/**
 * Sync Queue Manager
 * Manages prioritized queue of operations to sync with backend
 */

import { v4 as uuidv4 } from "uuid";
import {
  db,
  SyncQueueRecord,
  SyncOperationType,
  DeadLetterQueueRecord,
} from "@/lib/db/indexedDB";

export type { DeadLetterQueueRecord, SyncQueueRecord };

// Priority mapping (lower number = higher priority)
const PRIORITY_MAP: Record<SyncOperationType, number> = {
  cashLedger: 1, // Highest priority - financial operations
  order: 2,
  inventory: 3,
  item: 4,
  staff: 5,
  category: 6,
  table: 6,
};

const MAX_RETRIES = 5;
const FINANCIAL_BATCH_SIZE = 10;
const REGULAR_BATCH_SIZE = 50;
const MAX_BACKEND_BATCH_SIZE = 100;

export interface SyncOperation {
  clientId: string;
  type: SyncOperationType;
  data: any;
  timestamp: number;
  method: "create" | "update" | "delete";
}

/**
 * Add operation to sync queue
 */
export async function addToSyncQueue(
  operation: Omit<SyncOperation, "clientId"> & { clientId?: string }
): Promise<string> {
  const clientId = operation.clientId || uuidv4();
  const priority = PRIORITY_MAP[operation.type] || 6;

  const queueRecord: Omit<SyncQueueRecord, "id"> = {
    clientId,
    type: operation.type,
    data: operation.data,
    timestamp: operation.timestamp,
    method: operation.method,
    priority,
    retries: 0,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  await db.syncQueue.add(queueRecord as SyncQueueRecord);

  return clientId;
}

/**
 * Get pending operations grouped by priority
 */
export async function getPendingOperations(): Promise<SyncQueueRecord[]> {
  return await db.syncQueue
    .where("status")
    .anyOf(["pending", "error"])
    .sortBy("priority");
}

/**
 * Get operations ready for batching
 */
export async function getOperationsForBatch(): Promise<SyncQueueRecord[]> {
  const pending = await getPendingOperations();

  // Separate financial and non-financial operations
  const financial = pending.filter((op) => op.type === "cashLedger");
  const regular = pending.filter((op) => op.type !== "cashLedger");

  // Take batches: 10 for financial, 50 for regular, but respect backend limit
  const financialBatch = financial.slice(0, FINANCIAL_BATCH_SIZE);
  const regularBatch = regular.slice(0, REGULAR_BATCH_SIZE);

  // Combine but respect total backend limit
  const combined = [...financialBatch, ...regularBatch].slice(
    0,
    MAX_BACKEND_BATCH_SIZE
  );

  return combined;
}

/**
 * Mark operation as syncing
 */
export async function markAsSyncing(ids: number[]): Promise<void> {
  await db.syncQueue.where("id").anyOf(ids).modify({ status: "syncing" });
}

/**
 * Mark operation as synced
 */
export async function markAsSynced(
  clientId: string,
  serverId?: string
): Promise<void> {
  await db.syncQueue
    .where("clientId")
    .equals(clientId)
    .modify((record) => {
      record.status = "synced";
    });

  // Update the actual record with server ID if provided
  if (serverId) {
    // This will be handled by the sync service to update the appropriate table
  }
}

/**
 * Mark operation as error and increment retry count
 */
export async function markAsError(
  clientId: string,
  error: string
): Promise<number> {
  const record = await db.syncQueue.where("clientId").equals(clientId).first();

  if (!record) {
    throw new Error(`Sync queue record not found: ${clientId}`);
  }

  const newRetries = record.retries + 1;
  const shouldMoveToDeadLetter = newRetries >= MAX_RETRIES;

  if (shouldMoveToDeadLetter) {
    // Move to dead letter queue
    const deadLetterRecord: Omit<DeadLetterQueueRecord, "id"> = {
      clientId: record.clientId,
      type: record.type,
      data: record.data,
      timestamp: record.timestamp,
      method: record.method,
      error,
      retries: newRetries,
      createdAt: record.createdAt,
      lastRetryAt: new Date().toISOString(),
    };

    await db.deadLetterQueue.add(deadLetterRecord as DeadLetterQueueRecord);
    await db.syncQueue.delete(record.id!);
  } else {
    // Update retry count and status
    await db.syncQueue.update(record.id!, {
      status: "error",
      error,
      retries: newRetries,
      lastRetryAt: new Date().toISOString(),
    });
  }

  return newRetries;
}

/**
 * Get pending count
 */
export async function getPendingCount(): Promise<number> {
  return await db.syncQueue.where("status").anyOf(["pending", "error"]).count();
}

/**
 * Get dead letter queue items
 */
export async function getDeadLetterQueue(): Promise<DeadLetterQueueRecord[]> {
  return await db.deadLetterQueue.orderBy("createdAt").reverse().toArray();
}

/**
 * Retry operation from dead letter queue
 */
export async function retryFromDeadLetter(
  deadLetterId: number
): Promise<string> {
  const record = await db.deadLetterQueue.get(deadLetterId);
  if (!record) {
    throw new Error(`Dead letter record not found: ${deadLetterId}`);
  }

  // Add back to sync queue
  const queueRecord: Omit<SyncQueueRecord, "id"> = {
    clientId: record.clientId,
    type: record.type,
    data: record.data,
    timestamp: record.timestamp,
    method: record.method,
    priority: PRIORITY_MAP[record.type] || 6,
    retries: 0, // Reset retries
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  await db.syncQueue.add(queueRecord as SyncQueueRecord);
  await db.deadLetterQueue.delete(deadLetterId);

  return record.clientId;
}

/**
 * Clear synced operations (cleanup)
 */
export async function clearSyncedOperations(
  olderThanDays: number = 7
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const cutoffISO = cutoffDate.toISOString();

  return await db.syncQueue
    .where("status")
    .equals("synced")
    .and((record) => {
      const createdAt = record.createdAt;
      return Boolean(createdAt && createdAt < cutoffISO);
    })
    .delete();
}
