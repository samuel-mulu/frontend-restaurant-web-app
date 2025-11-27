/**
 * Offline Query Adapter
 * Intercepts RTK Query operations and handles offline mode
 */

import { v4 as uuidv4 } from "uuid";
import { offlineDetector } from "@/lib/offline/offlineDetector";
import { addToSyncQueue } from "@/lib/offline/syncQueue";
import { db } from "@/lib/db/indexedDB";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
// Import offline services
import * as itemService from "@/lib/offline/services/itemService";
import * as categoryService from "@/lib/offline/services/categoryService";
import * as inventoryService from "@/lib/offline/services/inventoryService";
import * as orderService from "@/lib/offline/services/orderService";
import * as staffService from "@/lib/offline/services/staffService";
import * as salaryService from "@/lib/offline/services/salaryService";
import * as shiftService from "@/lib/offline/services/shiftService";
import * as tableService from "@/lib/offline/services/tableService";

/**
 * Determine operation type from URL
 */
function getOperationType(
  url: string
): "order" | "inventory" | "item" | "category" | "staff" | "table" | "salary" | "shift" | null {
  if (url.includes("/orders")) return "order";
  if (url.includes("/inventory")) return "inventory";
  if (url.includes("/items")) return "item";
  if (url.includes("/categories")) return "category";
  if (url.includes("/staff")) return "staff";
  if (url.includes("/tables")) return "table";
  if (url.includes("/salary")) return "salary";
  if (url.includes("/shifts")) return "shift";
  return null;
}

/**
 * Get method from args
 */
function getMethod(
  args: string | FetchArgs
): "GET" | "POST" | "PATCH" | "DELETE" {
  if (typeof args === "string") return "GET";
  return (args.method as any) || "GET";
}

/**
 * Extract entity ID from URL
 */
function extractEntityId(url: string, type: string): string | null {
  const patterns: Record<string, RegExp> = {
    order: /\/orders\/([^\/]+)/,
    item: /\/items\/([^\/]+)/,
    inventory: /\/inventory\/([^\/]+)/,
    category: /\/categories\/([^\/]+)/,
    staff: /\/staff\/([^\/]+)/,
    table: /\/tables\/([^\/]+)/,
    salary: /\/salary\/([^\/]+)/,
    shift: /\/shifts\/([^\/]+)/,
  };

  const pattern = patterns[type];
  if (!pattern) return null;

  const match = url.match(pattern);
  return match ? match[1] : null;
}

/**
 * Find existing record in IndexedDB by ID
 * @param type - Entity type
 * @param entityId - Entity ID to find
 * @param includeDeleted - Whether to include deleted records (default: false for UPDATE, true for DELETE)
 */
async function findExistingRecord(
  type: string,
  entityId: string,
  includeDeleted: boolean = false
): Promise<any> {
  try {
    const checkDeleted = (record: any) => {
      if (!record) return false;
      if (includeDeleted) return true; // Include deleted for DELETE operations
      return !record._deleted; // Exclude deleted for UPDATE operations
    };

    switch (type) {
      case "order": {
        let record = await db.orders.where("_id").equals(entityId).first();
        if (!checkDeleted(record)) {
          record = await db.orders.where("clientId").equals(entityId).first();
        }
        if (!checkDeleted(record)) {
          const all = await db.orders.toArray();
          record = all.find(
            (o) =>
              (o.id?.toString() === entityId ||
                o._id === entityId ||
                o.clientId === entityId) &&
              checkDeleted(o)
          );
        }
        return checkDeleted(record) ? record : null;
      }
      case "item": {
        let record = await db.items.where("_id").equals(entityId).first();
        if (!checkDeleted(record)) {
          record = await db.items.where("clientId").equals(entityId).first();
        }
        if (!checkDeleted(record)) {
          const all = await db.items.toArray();
          record = all.find(
            (i) =>
              (i.id?.toString() === entityId ||
                i._id === entityId ||
                i.clientId === entityId) &&
              checkDeleted(i)
          );
        }
        return checkDeleted(record) ? record : null;
      }
      case "inventory": {
        let record = await db.inventory.where("_id").equals(entityId).first();
        if (!checkDeleted(record)) {
          record = await db.inventory
            .where("clientId")
            .equals(entityId)
            .first();
        }
        if (!checkDeleted(record)) {
          const all = await db.inventory.toArray();
          record = all.find(
            (i) =>
              (i.id?.toString() === entityId ||
                i._id === entityId ||
                i.clientId === entityId) &&
              checkDeleted(i)
          );
        }
        return checkDeleted(record) ? record : null;
      }
      case "category": {
        let record = await db.categories.where("_id").equals(entityId).first();
        if (!checkDeleted(record)) {
          record = await db.categories
            .where("clientId")
            .equals(entityId)
            .first();
        }
        if (!checkDeleted(record)) {
          const all = await db.categories.toArray();
          record = all.find(
            (c) =>
              (c.id?.toString() === entityId ||
                c._id === entityId ||
                c.clientId === entityId) &&
              checkDeleted(c)
          );
        }
        return checkDeleted(record) ? record : null;
      }
      case "staff": {
        let record = await db.staff.where("_id").equals(entityId).first();
        if (!checkDeleted(record)) {
          record = await db.staff.where("clientId").equals(entityId).first();
        }
        if (!checkDeleted(record)) {
          const all = await db.staff.toArray();
          record = all.find(
            (s) =>
              (s.id?.toString() === entityId ||
                s._id === entityId ||
                s.clientId === entityId) &&
              checkDeleted(s)
          );
        }
        return checkDeleted(record) ? record : null;
      }
      case "table": {
        let record = await db.restaurantTables
          .where("_id")
          .equals(entityId)
          .first();
        if (!checkDeleted(record)) {
          record = await db.restaurantTables
            .where("clientId")
            .equals(entityId)
            .first();
        }
        if (!checkDeleted(record)) {
          const all = await db.restaurantTables.toArray();
          record = all.find(
            (t) =>
              (t.id?.toString() === entityId ||
                t._id === entityId ||
                t.clientId === entityId) &&
              checkDeleted(t)
          );
        }
        return checkDeleted(record) ? record : null;
      }
      case "salary": {
        let record = await db.salary.where("_id").equals(entityId).first();
        if (!checkDeleted(record)) {
          record = await db.salary.where("clientId").equals(entityId).first();
        }
        if (!checkDeleted(record)) {
          const all = await db.salary.toArray();
          record = all.find(
            (s) =>
              (s.id?.toString() === entityId ||
                s._id === entityId ||
                s.clientId === entityId) &&
              checkDeleted(s)
          );
        }
        return checkDeleted(record) ? record : null;
      }
      case "shift": {
        let record = await db.shifts.where("_id").equals(entityId).first();
        if (!checkDeleted(record)) {
          record = await db.shifts.where("clientId").equals(entityId).first();
        }
        if (!checkDeleted(record)) {
          const all = await db.shifts.toArray();
          record = all.find(
            (s) =>
              (s.id?.toString() === entityId ||
                s._id === entityId ||
                s.clientId === entityId) &&
              checkDeleted(s)
          );
        }
        return checkDeleted(record) ? record : null;
      }
      default:
        return null;
    }
  } catch (error) {
    console.error(`Failed to find existing ${type} record:`, error);
    return null;
  }
}

/**
 * Store query result in IndexedDB for offline access (excluding deleted records)
 */
async function cacheQueryResult(url: string, data: any): Promise<void> {
  const type = getOperationType(url);
  if (!type) return;

  try {
    const items = Array.isArray(data) ? data : data?.data || [data];
    const itemsArray = Array.isArray(items) ? items : [items];

    for (const item of itemsArray) {
      // Skip if item is null/undefined or doesn't have an id or _id
      if (!item || (!item.id && !item._id && !item.clientId)) continue;

      const clientId = item.clientId || uuidv4();
      const now = new Date().toISOString();

      // Don't cache deleted records
      if (item._deleted) continue;

      switch (type) {
        case "order":
          await db.orders.put({
            ...item,
            clientId,
            syncStatus: "synced",
            syncedAt: now,
            _deleted: false,
          } as any);
          break;
        case "item":
          await db.items.put({
            ...item,
            clientId,
            syncStatus: "synced",
            syncedAt: now,
            _deleted: false,
          } as any);
          break;
        case "inventory":
          await db.inventory.put({
            ...item,
            clientId,
            syncStatus: "synced",
            syncedAt: now,
            _deleted: false,
          } as any);
          break;
        case "category":
          await db.categories.put({
            ...item,
            clientId,
            syncStatus: "synced",
            syncedAt: now,
            _deleted: false,
          } as any);
          break;
        case "staff":
          await db.staff.put({
            ...item,
            clientId,
            syncStatus: "synced",
            syncedAt: now,
            _deleted: false,
          } as any);
          break;
        case "table":
          await db.restaurantTables.put({
            ...item,
            clientId,
            syncStatus: "synced",
            syncedAt: now,
            _deleted: false,
          } as any);
          break;
        case "salary":
          await db.salary.put({
            ...item,
            clientId,
            syncStatus: "synced",
            syncedAt: now,
            _deleted: false,
          } as any);
          break;
        case "shift":
          await db.shifts.put({
            ...item,
            clientId,
            syncStatus: "synced",
            syncedAt: now,
            _deleted: false,
          } as any);
          break;
      }
    }
  } catch (error) {
    console.error("Failed to cache query result:", error);
  }
}

/**
 * Get cached data from IndexedDB (filtering out deleted records)
 */
async function getCachedData(url: string): Promise<any> {
  const type = getOperationType(url);
  if (!type) return null;

  try {
    let allRecords: any[] = [];
    switch (type) {
      case "order":
        allRecords = await db.orders.toArray();
        break;
      case "item":
        allRecords = await db.items.toArray();
        break;
      case "inventory":
        allRecords = await db.inventory.toArray();
        break;
      case "category":
        allRecords = await db.categories.toArray();
        break;
      case "staff":
        allRecords = await db.staff.toArray();
        break;
      case "table":
        allRecords = await db.restaurantTables.toArray();
        break;
      case "salary":
        allRecords = await db.salary.toArray();
        break;
      case "shift":
        allRecords = await db.shifts.toArray();
        break;
      default:
        return null;
    }
    // Filter out deleted records
    return allRecords.filter((record) => !record._deleted);
  } catch (error) {
    console.error("Failed to get cached data:", error);
    return null;
  }
}

/**
 * Create offline base query wrapper
 */
export function createOfflineBaseQuery(
  baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>
): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> {
  return async (args, api, extraOptions) => {
    const isOnline = offlineDetector.getOnlineStatus();
    const url = typeof args === "string" ? args : args.url;
    const method = getMethod(args);
    const isMutation = method !== "GET";

    // For GET queries when offline: serve from cache
    if (!isOnline && !isMutation) {
      const cachedData = await getCachedData(url);
      if (cachedData) {
        return {
          data: cachedData,
          meta: { cached: true, offline: true },
        } as any;
      }
      // If no cache, return error
      return {
        error: {
          status: "CACHE_ERROR",
          data: { message: "No cached data available" },
        },
      } as any;
    }

    // For mutations when offline: queue and return optimistic response
    if (!isOnline && isMutation) {
      const type = getOperationType(url);
      if (type) {
        // Handle FormData (for file uploads)
        let body: any = {};
        if (typeof args !== "string" && args.body) {
          if (args.body instanceof FormData) {
            // Extract data from FormData for queueing
            // Note: File objects will be stored as blobs in IndexedDB
            const formData = args.body as FormData;
            body = Object.fromEntries(formData.entries());
            // Convert File to object for storage
            for (const [key, value] of formData.entries()) {
              if (value instanceof File) {
                // Store file metadata, actual file will be recreated on sync
                body[key] = {
                  name: value.name,
                  type: value.type,
                  size: value.size,
                  _isFile: true,
                };
              }
            }
          } else {
            body = args.body as any;
          }
        }

        const now = new Date().toISOString();
        const isDelete = method === "DELETE";
        const isUpdate = method === "PATCH";

        // Extract entity ID from URL for DELETE and UPDATE operations
        const entityId =
          isDelete || isUpdate ? extractEntityId(url, type) : null;
        const existingRecord = entityId
          ? await findExistingRecord(type, entityId, isDelete) // Include deleted for DELETE operations
          : null;

        // Handle DELETE operations with soft-delete
        if (isDelete && existingRecord) {
          const recordClientId = existingRecord.clientId || uuidv4();

          // Include entity ID in sync queue data for DELETE
          const deleteData = {
            id: existingRecord.id || existingRecord._id || entityId,
            _id: existingRecord._id || entityId,
            clientId: recordClientId,
          };

          // Add to sync queue with DELETE data
          await addToSyncQueue({
            clientId: recordClientId,
            type,
            data: deleteData,
            timestamp: Date.now(),
            method: "delete",
          });

          // Mark as deleted and update sync status
          const deletedRecord = {
            ...existingRecord,
            _deleted: true,
            syncStatus: "pending" as const,
            updatedAt: now,
          };

          // Store soft-deleted record
          try {
            switch (type) {
              case "order":
                await db.orders.put(deletedRecord as any);
                break;
              case "item":
                await db.items.put(deletedRecord as any);
                break;
              case "inventory":
                await db.inventory.put(deletedRecord as any);
                break;
              case "category":
                await db.categories.put(deletedRecord as any);
                break;
              case "staff":
                await db.staff.put(deletedRecord as any);
                break;
              case "table":
                await db.restaurantTables.put(deletedRecord as any);
                break;
              case "salary":
                await db.salary.put(deletedRecord as any);
                break;
              case "shift":
                await db.shifts.put(deletedRecord as any);
                break;
            }
          } catch (error) {
            console.error("Failed to store deleted record:", error);
          }

          // Return optimistic response for DELETE
          return {
            data: { id: entityId, _id: entityId, deleted: true },
            meta: {
              pending: true,
              clientId: recordClientId,
              synced: false,
              offline: true,
            },
          } as any;
        }

        // Handle UPDATE operations - merge with existing record
        if (isUpdate && existingRecord) {
          const recordClientId = existingRecord.clientId || uuidv4();

          // Merge update data with existing record
          const mergedData = {
            ...existingRecord,
            ...body,
            // Preserve IDs
            id: existingRecord.id,
            _id: existingRecord._id || entityId,
            clientId: recordClientId,
            // Preserve timestamps
            createdAt: existingRecord.createdAt || now,
            updatedAt: now,
            syncStatus: "pending" as const,
            _deleted: false, // Ensure not deleted
          };

          // Prepare sync queue data with merged fields
          const updateData = { ...body, clientId: recordClientId };

          // Add to sync queue
          await addToSyncQueue({
            clientId: recordClientId,
            type,
            data: updateData,
            timestamp: Date.now(),
            method: "update",
          });
          // Preserve required fields based on entity type
          switch (type) {
            case "order":
              (mergedData as any).orderNumber =
                body.orderNumber || existingRecord.orderNumber;
              (mergedData as any).totalAmount =
                body.totalAmount !== undefined
                  ? body.totalAmount
                  : existingRecord.totalAmount;
              (mergedData as any).placedAt =
                body.placedAt ||
                existingRecord.placedAt ||
                existingRecord.createdAt ||
                now;
              (mergedData as any).items =
                body.items || existingRecord.items || [];
              (mergedData as any).status =
                body.status || existingRecord.status || "OPEN";
              break;
            case "item":
              (mergedData as any).name = body.name || existingRecord.name;
              (mergedData as any).price =
                body.price !== undefined ? body.price : existingRecord.price;
              (mergedData as any).categoryId =
                body.categoryId || existingRecord.categoryId;
              (mergedData as any).isAvailable =
                body.isAvailable !== undefined
                  ? body.isAvailable
                  : existingRecord.isAvailable;
              break;
            case "inventory":
              (mergedData as any).name = body.name || existingRecord.name;
              (mergedData as any).quantity =
                body.quantity !== undefined
                  ? body.quantity
                  : existingRecord.quantity;
              (mergedData as any).unit = body.unit || existingRecord.unit;
              (mergedData as any).price =
                body.price !== undefined ? body.price : existingRecord.price;
              break;
            case "category":
              (mergedData as any).name = body.name || existingRecord.name;
              break;
            case "staff":
              (mergedData as any).name = body.name || existingRecord.name;
              (mergedData as any).role = body.role || existingRecord.role;
              break;
            case "table":
              (mergedData as any).tableNumber =
                body.tableNumber || existingRecord.tableNumber;
              break;
            case "salary":
              (mergedData as any).amount = body.amount !== undefined ? body.amount : existingRecord.amount;
              (mergedData as any).status = body.status || existingRecord.status;
              (mergedData as any).month = body.month || existingRecord.month;
              (mergedData as any).year = body.year !== undefined ? body.year : existingRecord.year;
              break;
            case "shift":
              (mergedData as any).status = body.status || existingRecord.status;
              (mergedData as any).endTime = body.endTime || existingRecord.endTime;
              (mergedData as any).revenue = body.revenue !== undefined ? body.revenue : existingRecord.revenue;
              break;
          }

          // Store merged record
          try {
            switch (type) {
              case "order":
                await db.orders.put(mergedData as any);
                break;
              case "item":
                await db.items.put(mergedData as any);
                break;
              case "inventory":
                await db.inventory.put(mergedData as any);
                break;
              case "category":
                await db.categories.put(mergedData as any);
                break;
              case "staff":
                await db.staff.put(mergedData as any);
                break;
              case "table":
                await db.restaurantTables.put(mergedData as any);
                break;
              case "salary":
                await db.salary.put(mergedData as any);
                break;
              case "shift":
                await db.shifts.put(mergedData as any);
                break;
            }
          } catch (error) {
            console.error("Failed to store updated record:", error);
          }

          // Return optimistic response for UPDATE
          return {
            data: mergedData,
            meta: {
              pending: true,
              clientId: recordClientId,
              synced: false,
              offline: true,
            },
          } as any;
        }

        // Handle CREATE operations
        const clientId = body.clientId || uuidv4();
        const bodyWithClientId = { ...body, clientId };

        // Add to sync queue
        await addToSyncQueue({
          clientId,
          type,
          data: bodyWithClientId,
          timestamp: Date.now(),
          method: "create",
        });

        const optimisticData = {
          ...bodyWithClientId,
          id: clientId,
          _id: clientId,
          clientId,
          createdAt: now,
          updatedAt: now,
          syncStatus: "pending" as const,
          _deleted: false,
        };

        // Add required fields for CREATE based on entity type
        switch (type) {
          case "order":
            (optimisticData as any).orderNumber =
              body.orderNumber || `OFFLINE-${clientId.slice(0, 8)}`;
            (optimisticData as any).status = body.status || "OPEN";
            (optimisticData as any).totalAmount = body.totalAmount || 0;
            (optimisticData as any).items = body.items || [];
            (optimisticData as any).placedAt = body.placedAt || now;
            break;
          case "item":
            (optimisticData as any).isAvailable =
              body.isAvailable !== undefined ? body.isAvailable : true;
            break;
          case "salary":
            (optimisticData as any).status = body.status || "pending";
            (optimisticData as any).amount = body.amount || 0;
            break;
          case "shift":
            (optimisticData as any).status = body.status || "active";
            (optimisticData as any).revenue = body.revenue || 0;
            (optimisticData as any).ordersHandled = body.ordersHandled || [];
            break;
        }

        // Store in appropriate table
        try {
          switch (type) {
            case "order":
              await db.orders.put(optimisticData as any);
              break;
            case "item":
              await db.items.put(optimisticData as any);
              break;
            case "inventory":
              await db.inventory.put(optimisticData as any);
              break;
            case "category":
              await db.categories.put(optimisticData as any);
              break;
            case "staff":
              await db.staff.put(optimisticData as any);
              break;
            case "table":
              await db.restaurantTables.put(optimisticData as any);
              break;
            case "salary":
              await db.salary.put(optimisticData as any);
              break;
            case "shift":
              await db.shifts.put(optimisticData as any);
              break;
          }
        } catch (error) {
          console.error("Failed to store optimistic data:", error);
        }

        // Return optimistic response
        return {
          data: optimisticData,
          meta: {
            pending: true,
            clientId,
            synced: false,
            offline: true,
          },
        } as any;
      }
    }

    // Online: proceed with normal query
    const result = await baseQuery(args, api, extraOptions);

    // Cache successful GET responses
    if (isOnline && !isMutation && result.data) {
      await cacheQueryResult(url, result.data);
    }

    return result;
  };
}
