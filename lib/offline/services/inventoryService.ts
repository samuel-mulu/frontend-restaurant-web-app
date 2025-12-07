/**
 * Inventory Service - Offline
 * Handles inventory CRUD operations in IndexedDB
 */

import { v4 as uuidv4 } from "uuid";
import { db, InventoryRecord } from "@/lib/db/indexedDB";
import { addToSyncQueue } from "@/lib/offline/syncQueue";
import { validateOrThrow, createInventorySchema, updateInventorySchema } from "@/lib/offline/validation";

export interface CreateInventoryInput {
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  price: number;
  clientId?: string;
}

export interface UpdateInventoryInput {
  name?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  price?: number;
}

export interface ListInventoryFilters {
  lowStock?: boolean;
}

/**
 * Create inventory item
 */
export async function createInventory(data: CreateInventoryInput): Promise<InventoryRecord> {
  // Validate input
  const validatedData = validateOrThrow(createInventorySchema, data);

  // Check for idempotency
  if (data.clientId) {
    const existing = await db.inventory.where("clientId").equals(data.clientId).first();
    if (existing) {
      return existing;
    }
  }

  const clientId = data.clientId || uuidv4();
  const now = new Date().toISOString();

  const inventory: Omit<InventoryRecord, "id"> = {
    _id: undefined,
    clientId,
    name: validatedData.name.trim(),
    description: validatedData.description?.trim(),
    quantity: validatedData.quantity,
    unit: validatedData.unit.trim(),
    price: validatedData.price,
    createdAt: now,
    updatedAt: now,
    syncStatus: "pending",
    _deleted: false,
  };

  const id = await db.inventory.add(inventory as InventoryRecord);

  // Queue for sync
  await addToSyncQueue({
    clientId,
    type: "inventory",
    data: validatedData,
    timestamp: Date.now(),
    method: "create",
  });

  return { ...inventory, id } as InventoryRecord;
}

/**
 * Update inventory item
 */
export async function updateInventory(
  id: string,
  data: UpdateInventoryInput
): Promise<InventoryRecord | null> {
  // Validate input
  const validatedData = validateOrThrow(updateInventorySchema, data);

  // Find existing inventory
  let inventory = await db.inventory
    .where("_id")
    .equals(id)
    .or("clientId")
    .equals(id)
    .first();

  if (!inventory || inventory._deleted) {
    const error: any = new Error("Inventory record not found");
    error.status = 404;
    throw error;
  }

  // Build updates
  const updates: Partial<InventoryRecord> = {
    updatedAt: new Date().toISOString(),
    syncStatus: "pending",
  };

  if (validatedData.name !== undefined) updates.name = validatedData.name.trim();
  if (validatedData.description !== undefined) updates.description = validatedData.description?.trim();
  if (validatedData.quantity !== undefined) {
    if (validatedData.quantity < 0) {
      const error: any = new Error("Quantity cannot be negative");
      error.status = 400;
      throw error;
    }
    updates.quantity = validatedData.quantity;
  }
  if (validatedData.unit !== undefined) updates.unit = validatedData.unit.trim();
  if (validatedData.price !== undefined) {
    if (validatedData.price < 0) {
      const error: any = new Error("Price cannot be negative");
      error.status = 400;
      throw error;
    }
    updates.price = validatedData.price;
  }

  await db.inventory.update(inventory.id!, updates);

  // Queue for sync
  await addToSyncQueue({
    clientId: inventory.clientId,
    type: "inventory",
    data: validatedData,
    timestamp: Date.now(),
    method: "update",
  });

  return (await db.inventory.get(inventory.id!)) || null;
}

/**
 * List inventory items with filters
 */
export async function listInventory(filters: ListInventoryFilters = {}): Promise<InventoryRecord[]> {
  let query = db.inventory.toCollection();

  // Apply filters
  if (filters.lowStock) {
    query = query.filter((inv) => inv.quantity <= 0);
  }

  // Exclude deleted
  query = query.filter((inv) => !inv._deleted);

  const inventory = await query.toArray();

  // Add virtuals
  return inventory.map((inv) => ({
    ...inv,
    isLowStock: inv.quantity <= 0,
    stockStatus: inv.quantity <= 0 ? "low" : "normal",
  })) as any;
}

/**
 * Get inventory by ID
 */
export async function getInventoryById(id: string): Promise<InventoryRecord | null> {
  const inventory = await db.inventory
    .where("_id")
    .equals(id)
    .or("clientId")
    .equals(id)
    .first();

  if (!inventory || inventory._deleted) {
    return null;
  }

  return {
    ...inventory,
    isLowStock: inventory.quantity <= 0,
    stockStatus: inventory.quantity <= 0 ? "low" : "normal",
  } as any;
}

/**
 * Get low stock items (quantity <= 0)
 */
export async function getLowStockItems(): Promise<InventoryRecord[]> {
  const items = await db.inventory
    .filter((inv) => inv.quantity <= 0 && !inv._deleted)
    .sortBy("quantity");

  return items.map((item) => ({
    ...item,
    isLowStock: true,
    stockStatus: "low",
  })) as any;
}

