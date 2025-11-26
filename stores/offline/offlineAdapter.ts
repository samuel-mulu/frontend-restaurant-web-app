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

/**
 * Determine operation type from URL
 */
function getOperationType(
  url: string
): "order" | "inventory" | "item" | "category" | "staff" | "table" | null {
  if (url.includes("/orders")) return "order";
  if (url.includes("/inventory")) return "inventory";
  if (url.includes("/items")) return "item";
  if (url.includes("/categories")) return "category";
  if (url.includes("/staff")) return "staff";
  if (url.includes("/tables")) return "table";
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
 * Store query result in IndexedDB for offline access
 */
async function cacheQueryResult(url: string, data: any): Promise<void> {
  const type = getOperationType(url);
  if (!type) return;

  try {
    const items = Array.isArray(data) ? data : data?.data || [data];
    const itemsArray = Array.isArray(items) ? items : [items];

    for (const item of itemsArray) {
      if (!item || !item.id) continue;

      const clientId = item.clientId || uuidv4();
      const now = new Date().toISOString();

      switch (type) {
        case "order":
          await db.orders.put({
            ...item,
            clientId,
            syncStatus: "synced",
            syncedAt: now,
          } as any);
          break;
        case "item":
          await db.items.put({
            ...item,
            clientId,
            syncStatus: "synced",
            syncedAt: now,
          } as any);
          break;
        case "inventory":
          await db.inventory.put({
            ...item,
            clientId,
            syncStatus: "synced",
            syncedAt: now,
          } as any);
          break;
        case "category":
          await db.categories.put({
            ...item,
            clientId,
            syncStatus: "synced",
            syncedAt: now,
          } as any);
          break;
        case "staff":
          await db.staff.put({
            ...item,
            clientId,
            syncStatus: "synced",
            syncedAt: now,
          } as any);
          break;
        case "table":
          await db.restaurantTables.put({
            ...item,
            clientId,
            syncStatus: "synced",
            syncedAt: now,
          } as any);
          break;
      }
    }
  } catch (error) {
    console.error("Failed to cache query result:", error);
  }
}

/**
 * Get cached data from IndexedDB
 */
async function getCachedData(url: string): Promise<any> {
  const type = getOperationType(url);
  if (!type) return null;

  try {
    switch (type) {
      case "order":
        return await db.orders.toArray();
      case "item":
        return await db.items.toArray();
      case "inventory":
        return await db.inventory.toArray();
      case "category":
        return await db.categories.toArray();
      case "staff":
        return await db.staff.toArray();
      case "table":
        return await db.restaurantTables.toArray();
      default:
        return null;
    }
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

        const clientId = body.clientId || uuidv4();

        // Ensure clientId is in body
        const bodyWithClientId = { ...body, clientId };

        // Add to sync queue
        await addToSyncQueue({
          clientId,
          type,
          data: bodyWithClientId,
          timestamp: Date.now(),
          method:
            method === "POST"
              ? "create"
              : method === "PATCH"
              ? "update"
              : "delete",
        });

        // Store in local DB for immediate UI access
        const now = new Date().toISOString();

        // For updates (PATCH), extract order ID from URL and fetch existing order
        const isUpdate = method === "PATCH";
        let existingOrder: any = null;

        if (isUpdate && type === "order") {
          // Extract order ID from URL (e.g., /orders/123 or /orders/123/status)
          const urlMatch = url.match(/\/orders\/([^\/]+)/);
          if (urlMatch) {
            const orderId = urlMatch[1];
            // Try to find by _id or clientId
            existingOrder = await db.orders
              .where("_id")
              .equals(orderId)
              .first();
            if (!existingOrder) {
              existingOrder = await db.orders
                .where("clientId")
                .equals(orderId)
                .first();
            }
            // If still not found, try by id field
            if (!existingOrder) {
              const allOrders = await db.orders.toArray();
              existingOrder = allOrders.find(
                (o) =>
                  o.id?.toString() === orderId ||
                  o._id === orderId ||
                  o.clientId === orderId
              );
            }
          }
        }

        const optimisticData = {
          ...bodyWithClientId,
          id: existingOrder?.id || clientId,
          _id: existingOrder?._id || clientId,
          clientId: existingOrder?.clientId || clientId,
          createdAt: existingOrder?.createdAt || now,
          updatedAt: now,
          syncStatus: "pending" as const,
        };

        // Store in appropriate table
        try {
          switch (type) {
            case "order":
              // For updates, merge with existing order data
              const baseOrderData = existingOrder
                ? {
                    ...existingOrder,
                    ...optimisticData,
                    // Preserve existing required fields if not in update
                    orderNumber:
                      optimisticData.orderNumber || existingOrder.orderNumber,
                    totalAmount:
                      optimisticData.totalAmount !== undefined
                        ? optimisticData.totalAmount
                        : existingOrder.totalAmount,
                    placedAt:
                      optimisticData.placedAt ||
                      existingOrder.placedAt ||
                      existingOrder.createdAt ||
                      now,
                    items: optimisticData.items || existingOrder.items || [],
                    status:
                      optimisticData.status || existingOrder.status || "OPEN",
                  }
                : {
                    ...optimisticData,
                    orderNumber:
                      optimisticData.orderNumber ||
                      `OFFLINE-${clientId.slice(0, 8)}`,
                    status: optimisticData.status || "OPEN",
                    totalAmount: optimisticData.totalAmount || 0,
                    items: optimisticData.items || [],
                    placedAt: optimisticData.placedAt || now,
                  };

              await db.orders.put(baseOrderData as any);
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
