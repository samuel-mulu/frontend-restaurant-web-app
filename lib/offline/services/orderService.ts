/**
 * Order Service - Offline
 * Handles order CRUD operations in IndexedDB
 */

import { v4 as uuidv4 } from "uuid";
import { db, OrderRecord, InventoryRecord } from "@/lib/db/indexedDB";
import { addToSyncQueue } from "@/lib/offline/syncQueue";
import {
  validateOrThrow,
  createOrderSchema,
  updateOrderSchema,
  updateOrderStatusSchema,
} from "@/lib/offline/validation";

export interface CreateOrderInput {
  tableNumber?: string;
  items: Array<{
    itemId: string;
    qty: number;
    nameSnapshot: string;
    priceSnapshot: number;
  }>;
  note?: string;
  waiterId: string;
  cashierId?: string;
  clientId?: string;
}

export interface UpdateOrderInput {
  items?: Array<{
    itemId: string;
    qty: number;
    nameSnapshot: string;
    priceSnapshot: number;
  }>;
  note?: string;
  tableNumber?: string;
  discount?: number;
}

export interface ListOrdersFilters {
  status?: string | string[];
  waiterId?: string;
  cashierId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  tableNumber?: string;
}

/**
 * Generate order number for offline orders
 */
function generateOfflineOrderNumber(clientId: string): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const shortId = clientId.slice(0, 8).toUpperCase();
  return `OFFLINE-${dateStr}-${shortId}`;
}

/**
 * Create a new order
 */
export async function createOrder(data: CreateOrderInput): Promise<OrderRecord> {
  // Validate input
  const validatedData = validateOrThrow(createOrderSchema, data);

  // Check waiter exists
  const waiter = await db.staff
    .where("_id")
    .equals(validatedData.waiterId || "")
    .or("clientId")
    .equals(validatedData.waiterId || "")
    .first();

  if (!waiter || waiter._deleted || waiter.isDeleted || waiter.role !== "waiter") {
    const error: any = new Error("Invalid waiter ID or user is not a waiter");
    error.status = 400;
    throw error;
  }

  // Validate inventory quantities and decrement
  const inventoryItemsToUpdate: Array<{ inventory: InventoryRecord; qty: number }> = [];

  for (const item of validatedData.items) {
    // Check if this itemId exists in Inventory
    const inventory = await db.inventory
      .where("_id")
      .equals(item.itemId)
      .or("clientId")
      .equals(item.itemId)
      .first();

    if (inventory && !inventory._deleted) {
      // This is an inventory item - validate quantity
      if (inventory.quantity < item.qty) {
        const error: any = new Error(
          `Insufficient quantity for ${inventory.name}. Available: ${inventory.quantity}, Requested: ${item.qty}`
        );
        error.status = 400;
        throw error;
      }
      // Store for later decrement
      inventoryItemsToUpdate.push({ inventory, qty: item.qty });
    }
  }

  // Calculate total amount
  const subtotal = validatedData.items.reduce(
    (sum, item) => sum + item.priceSnapshot * item.qty,
    0
  );

  // Check for idempotency
  if (data.clientId) {
    const existing = await db.orders.where("clientId").equals(data.clientId).first();
    if (existing) {
      return existing;
    }
  }

  const clientId = data.clientId || uuidv4();
  const now = new Date().toISOString();
  const orderNumber = generateOfflineOrderNumber(clientId);

  // Decrement inventory quantities
  for (const { inventory, qty } of inventoryItemsToUpdate) {
    await db.inventory.update(inventory.id!, {
      quantity: inventory.quantity - qty,
      updatedAt: now,
      syncStatus: "pending",
    });

    // Queue inventory update for sync
    await addToSyncQueue({
      clientId: inventory.clientId,
      type: "inventory",
      data: { quantity: inventory.quantity - qty },
      timestamp: Date.now(),
      method: "update",
    });
  }

  const order: Omit<OrderRecord, "id"> = {
    _id: undefined,
    clientId,
    orderNumber,
    tableNumber: validatedData.tableNumber,
    items: validatedData.items.map((i) => ({
      itemId: i.itemId,
      qty: i.qty,
      nameSnapshot: i.nameSnapshot,
      priceSnapshot: i.priceSnapshot,
    })),
    note: validatedData.note,
    totalAmount: subtotal,
    status: "OPEN",
    waiterId: validatedData.waiterId,
    cashierId: validatedData.cashierId,
    placedAt: now,
    createdAt: now,
    updatedAt: now,
    syncStatus: "pending",
    _deleted: false,
  };

  const id = await db.orders.add(order as OrderRecord);

  // Queue for sync
  await addToSyncQueue({
    clientId,
    type: "order",
    data: {
      ...validatedData,
      orderNumber,
      totalAmount: subtotal,
      status: "OPEN",
      placedAt: now,
    },
    timestamp: Date.now(),
    method: "create",
  });

  return { ...order, id } as OrderRecord;
}

/**
 * Update an order
 */
export async function updateOrder(id: string, data: UpdateOrderInput): Promise<OrderRecord | null> {
  // Validate input
  const validatedData = validateOrThrow(updateOrderSchema, data);

  // Find existing order
  let order = await db.orders
    .where("_id")
    .equals(id)
    .or("clientId")
    .equals(id)
    .first();

  if (!order || order._deleted) {
    const error: any = new Error("Order not found");
    error.status = 404;
    throw error;
  }

  const updates: Partial<OrderRecord> = {
    updatedAt: new Date().toISOString(),
    syncStatus: "pending",
  };

  // Update items if provided
  if (validatedData.items !== undefined) {
    updates.items = validatedData.items.map((i) => ({
      itemId: i.itemId,
      qty: i.qty,
      nameSnapshot: i.nameSnapshot,
      priceSnapshot: i.priceSnapshot,
    }));

    // Recalculate total amount
    updates.totalAmount = validatedData.items.reduce(
      (sum, item) => sum + item.priceSnapshot * item.qty,
      0
    );
  }

  if (validatedData.note !== undefined) updates.note = validatedData.note;
  if (validatedData.tableNumber !== undefined) updates.tableNumber = validatedData.tableNumber;

  await db.orders.update(order.id!, updates);

  // Queue for sync
  await addToSyncQueue({
    clientId: order.clientId,
    type: "order",
    data: validatedData,
    timestamp: Date.now(),
    method: "update",
  });

  return (await db.orders.get(order.id!)) || null;
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  id: string,
  status: string,
  userId?: string,
  paymentMethod?: "cash" | "mobile_banking",
  paymentProofImage?: { url: string; publicId: string }
): Promise<OrderRecord | null> {
  // Validate status
  validateOrThrow(updateOrderStatusSchema, { status });

  const order = await db.orders
    .where("_id")
    .equals(id)
    .or("clientId")
    .equals(id)
    .first();

  if (!order || order._deleted) {
    const error: any = new Error("Order not found");
    error.status = 404;
    throw error;
  }

  const now = new Date().toISOString();
  const updates: Partial<OrderRecord> = {
    status,
    updatedAt: now,
    syncStatus: "pending",
  };

  // Update timestamps based on status
  if (status === "VOIDED") {
    updates.cancelledAt = now;
    if (userId) updates.cancelledBy = userId;
  } else if (status === "PAID_TO_CASHIER") {
    updates.paymentReceivedAt = now;
  } else if (status === "TRANSFERRED_TO_OWNER") {
    updates.paymentDeliveredAt = now;
    if (userId) updates.transferredToOwnerBy = userId;
  } else if (status === "OWNER_CONFIRMED") {
    updates.completedAt = now;
    if (userId) updates.confirmedBy = userId;
  } else if (status === "DISPUTED") {
    if (userId) updates.disputedBy = userId;
  }

  if (paymentMethod) updates.paymentMethod = paymentMethod;
  if (paymentProofImage) updates.paymentProofImage = paymentProofImage;

  await db.orders.update(order.id!, updates);

  // Queue for sync
  await addToSyncQueue({
    clientId: order.clientId,
    type: "order",
    data: {
      status,
      paymentMethod,
      paymentProofImage,
      ...updates,
    },
    timestamp: Date.now(),
    method: "update",
  });

  return (await db.orders.get(order.id!)) || null;
}

/**
 * Cancel an order
 */
export async function cancelOrder(id: string, userId?: string): Promise<OrderRecord | null> {
  return updateOrderStatus(id, "VOIDED", userId);
}

/**
 * List orders with filters
 */
export async function listOrders(filters: ListOrdersFilters = {}): Promise<OrderRecord[]> {
  let query = db.orders.toCollection();

  // Apply filters
  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    query = query.filter((order) => statuses.includes(order.status));
  }

  if (filters.waiterId) {
    query = query.filter((order) => order.waiterId === filters.waiterId);
  }

  if (filters.cashierId) {
    query = query.filter((order) => order.cashierId === filters.cashierId);
  }

  if (filters.tableNumber) {
    query = query.filter((order) => order.tableNumber === filters.tableNumber);
  }

  if (filters.startDate || filters.endDate) {
    query = query.filter((order) => {
      const orderDate = new Date(order.placedAt || order.createdAt);
      if (filters.startDate && orderDate < filters.startDate) return false;
      if (filters.endDate && orderDate > filters.endDate) return false;
      return true;
    });
  }

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    query = query.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(searchLower) ||
        order.tableNumber?.toLowerCase().includes(searchLower) ||
        order.items.some((item) => item.nameSnapshot.toLowerCase().includes(searchLower))
    );
  }

  // Exclude deleted
  query = query.filter((order) => !order._deleted);

  const orders = await query.reverse().sortBy("createdAt");

  // Populate relationships
  return Promise.all(
    orders.map(async (order) => {
      const waiter = order.waiterId
        ? await db.staff
            .where("_id")
            .equals(order.waiterId)
            .or("clientId")
            .equals(order.waiterId)
            .first()
        : null;

      const cashier = order.cashierId
        ? await db.staff
            .where("_id")
            .equals(order.cashierId)
            .or("clientId")
            .equals(order.cashierId)
            .first()
        : null;

      return {
        ...order,
        waiterId: waiter
          ? {
              id: waiter._id || waiter.clientId,
              name: waiter.name,
              email: waiter.email,
              phone: waiter.phone,
            }
          : order.waiterId,
        cashierId: cashier
          ? {
              id: cashier._id || cashier.clientId,
              name: cashier.name,
              email: cashier.email,
              phone: cashier.phone,
            }
          : order.cashierId,
      };
    })
  ) as any;
}

/**
 * Get order by ID
 */
export async function getOrderById(id: string): Promise<OrderRecord | null> {
  const order = await db.orders
    .where("_id")
    .equals(id)
    .or("clientId")
    .equals(id)
    .or("orderNumber")
    .equals(id)
    .first();

  if (!order || order._deleted) {
    return null;
  }

  // Populate relationships
  const waiter = order.waiterId
    ? await db.staff
        .where("_id")
        .equals(order.waiterId)
        .or("clientId")
        .equals(order.waiterId)
        .first()
    : null;

  const cashier = order.cashierId
    ? await db.staff
        .where("_id")
        .equals(order.cashierId)
        .or("clientId")
        .equals(order.cashierId)
        .first()
    : null;

  return {
    ...order,
    waiterId: waiter
      ? {
          id: waiter._id || waiter.clientId,
          name: waiter.name,
          email: waiter.email,
          phone: waiter.phone,
        }
      : order.waiterId,
    cashierId: cashier
      ? {
          id: cashier._id || cashier.clientId,
          name: cashier.name,
          email: cashier.email,
          phone: cashier.phone,
        }
      : order.cashierId,
  } as any;
}

/**
 * Get orders by waiter
 */
export async function getOrdersByWaiter(waiterId: string): Promise<OrderRecord[]> {
  return listOrders({ waiterId });
}

/**
 * Get orders by cashier
 */
export async function getOrdersByCashier(cashierId: string): Promise<OrderRecord[]> {
  return listOrders({ cashierId });
}

