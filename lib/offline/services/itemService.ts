/**
 * Item Service - Offline
 * Handles item CRUD operations in IndexedDB
 */

import { v4 as uuidv4 } from "uuid";
import { db, ItemRecord } from "@/lib/db/indexedDB";
import { addToSyncQueue } from "@/lib/offline/syncQueue";
import {
  validateOrThrow,
  createItemSchema,
  updateItemSchema,
} from "@/lib/offline/validation";

interface ServiceError extends Error {
  status: number;
}

export interface CreateItemInput {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  isAvailable?: boolean;
  image?: { url?: string; publicId?: string };
  clientId?: string;
}

export interface UpdateItemInput {
  categoryId?: string;
  name?: string;
  description?: string;
  price?: number;
  isAvailable?: boolean;
  image?: { url?: string; publicId?: string };
}

export interface ListItemsFilters {
  categoryId?: string;
  includeDeleted?: boolean;
  includeUnavailable?: boolean;
}

/**
 * Convert image file to base64 for storage in IndexedDB
 */
async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Create a new item
 */
export async function createItem(
  data: CreateItemInput,
  imageFile?: File
): Promise<ItemRecord> {
  // Validate input
  const validatedData = validateOrThrow(createItemSchema, data);

  // Check if category exists
  const category = await db.categories
    .where("_id")
    .equals(validatedData.categoryId)
    .or("clientId")
    .equals(validatedData.categoryId)
    .first();

  if (!category || category._deleted) {
    const error = new Error("Category not found") as ServiceError;
    error.status = 404;
    throw error;
  }

  // Check for idempotency
  if (data.clientId) {
    const existing = await db.items
      .where("clientId")
      .equals(data.clientId)
      .first();
    if (existing) {
      return existing;
    }
  }

  const clientId = data.clientId || uuidv4();
  const now = new Date().toISOString();

  // Handle image
  let imageData: { url?: string; publicId?: string } | undefined;
  if (imageFile) {
    const base64 = await imageToBase64(imageFile);
    imageData = { url: base64, publicId: undefined }; // Store base64, upload on sync
  } else if (validatedData.image) {
    imageData = validatedData.image;
  }

  // Store price as-is (no conversion)
  const item: Omit<ItemRecord, "id"> = {
    _id: undefined,
    clientId,
    name: validatedData.name,
    price: validatedData.price,
    categoryId: validatedData.categoryId,
    description: validatedData.description,
    image: imageData,
    isAvailable: validatedData.isAvailable ?? true,
    isDeleted: false,
    deletedAt: undefined,
    createdAt: now,
    updatedAt: now,
    syncStatus: "pending",
    _deleted: false,
  };

  const id = await db.items.add(item as ItemRecord);

  // Queue for sync - send price in DOLLARS (backend model setter will convert to cents)
  await addToSyncQueue({
    clientId,
    type: "item",
    data: {
      ...validatedData,
      // Price should be in dollars for backend (model setter converts to cents)
      // validatedData.price is already in dollars from the input
      image: imageData,
    },
    timestamp: Date.now(),
    method: "create",
  });

  return { ...item, id } as ItemRecord;
}

/**
 * Update an item
 */
export async function updateItem(
  id: string,
  data: UpdateItemInput,
  imageFile?: File
): Promise<ItemRecord | null> {
  // Validate input
  const validatedData = validateOrThrow(updateItemSchema, data);

  // Find existing item
  const item = await db.items
    .where("_id")
    .equals(id)
    .or("clientId")
    .equals(id)
    .first();

  if (!item || item._deleted || item.isDeleted) {
    const error = new Error("Item not found") as ServiceError;
    error.status = 404;
    throw error;
  }

  // Check category if provided
  if (validatedData.categoryId) {
    const category = await db.categories
      .where("_id")
      .equals(validatedData.categoryId)
      .or("clientId")
      .equals(validatedData.categoryId)
      .first();

    if (!category || category._deleted) {
      const error = new Error("Category not found") as ServiceError;
      error.status = 404;
      throw error;
    }
  }

  // Handle image
  let imageData = validatedData.image;
  if (imageFile) {
    const base64 = await imageToBase64(imageFile);
    imageData = { url: base64, publicId: undefined };
  }

  // Update fields
  const updates: Partial<ItemRecord> = {
    updatedAt: new Date().toISOString(),
    syncStatus: "pending",
  };

  if (validatedData.name !== undefined) updates.name = validatedData.name;
  if (validatedData.description !== undefined)
    updates.description = validatedData.description;
  if (validatedData.categoryId !== undefined)
    updates.categoryId = validatedData.categoryId;
  if (validatedData.isAvailable !== undefined)
    updates.isAvailable = validatedData.isAvailable;
  if (imageData !== undefined) updates.image = imageData;
  if (validatedData.price !== undefined) {
    // Store price as-is (no conversion)
    updates.price = validatedData.price;
  }

  await db.items.update(item.id!, updates);

  // Queue for sync - send price in DOLLARS (backend model setter will convert to cents)
  await addToSyncQueue({
    clientId: item.clientId,
    type: "item",
    data: {
      ...validatedData,
      // Price should be in dollars for backend (model setter converts to cents)
      // validatedData.price is already in dollars from the form
      image: imageData,
    },
    timestamp: Date.now(),
    method: "update",
  });

  return (await db.items.get(item.id!)) || null;
}

/**
 * Delete an item (soft delete)
 */
export async function deleteItem(id: string): Promise<ItemRecord | null> {
  const item = await db.items
    .where("_id")
    .equals(id)
    .or("clientId")
    .equals(id)
    .first();

  if (!item || item._deleted || item.isDeleted) {
    const error = new Error("Item not found") as ServiceError;
    error.status = 404;
    throw error;
  }

  const now = new Date().toISOString();
  await db.items.update(item.id!, {
    isDeleted: true,
    deletedAt: now,
    updatedAt: now,
    syncStatus: "pending",
  });

  // Queue for sync
  await addToSyncQueue({
    clientId: item.clientId,
    type: "item",
    data: {},
    timestamp: Date.now(),
    method: "delete",
  });

  return (await db.items.get(item.id!)) || null;
}

/**
 * Restore a deleted item
 */
export async function restoreItem(id: string): Promise<ItemRecord | null> {
  const item = await db.items
    .where("_id")
    .equals(id)
    .or("clientId")
    .equals(id)
    .first();

  if (!item) {
    const error = new Error("Item not found") as ServiceError;
    error.status = 404;
    throw error;
  }

  const now = new Date().toISOString();
  await db.items.update(item.id!, {
    isDeleted: false,
    deletedAt: undefined,
    updatedAt: now,
    syncStatus: "pending",
  });

  // Queue for sync
  await addToSyncQueue({
    clientId: item.clientId,
    type: "item",
    data: { isDeleted: false },
    timestamp: Date.now(),
    method: "update",
  });

  return (await db.items.get(item.id!)) || null;
}

/**
 * Permanently delete an item
 */
export async function permanentDeleteItem(id: string): Promise<void> {
  const item = await db.items
    .where("_id")
    .equals(id)
    .or("clientId")
    .equals(id)
    .first();

  if (!item) {
    const error = new Error("Item not found") as ServiceError;
    error.status = 404;
    throw error;
  }

  await db.items.delete(item.id!);
}

/**
 * List items with filters
 */
export async function listItems(
  filters: ListItemsFilters = {}
): Promise<ItemRecord[]> {
  let query = db.items.toCollection();

  // Apply filters
  if (!filters.includeDeleted) {
    query = query.filter((item) => !item._deleted && !item.isDeleted);
  }

  if (!filters.includeUnavailable) {
    query = query.filter((item) => item.isAvailable);
  }

  if (filters.categoryId) {
    query = query.filter((item) => item.categoryId === filters.categoryId);
  }

  const items = await query.toArray();

  // Populate category relationship
  const itemsWithCategory = await Promise.all(
    items.map(async (item) => {
      const category = await db.categories
        .where("_id")
        .equals(item.categoryId)
        .or("clientId")
        .equals(item.categoryId)
        .first();

      return {
        ...item,
        category: category
          ? {
              id: category._id || category.clientId,
              name: category.name,
            }
          : null,
      };
    })
  );

  return itemsWithCategory as ItemRecord[];
}

/**
 * Get item by ID
 */
export async function getItemById(id: string): Promise<ItemRecord | null> {
  const item = await db.items
    .where("_id")
    .equals(id)
    .or("clientId")
    .equals(id)
    .first();

  if (!item || item._deleted || item.isDeleted) {
    return null;
  }

  // Populate category
  const category = await db.categories
    .where("_id")
    .equals(item.categoryId)
    .or("clientId")
    .equals(item.categoryId)
    .first();

  return {
    ...item,
    isDeleted: item.isDeleted ?? false,
    category: category
      ? {
          id: category._id || category.clientId,
          name: category.name,
        }
      : null,
  } as ItemRecord;
}

/**
 * Get deleted items
 */
export async function getDeletedItems(): Promise<ItemRecord[]> {
  return db.items
    .filter((item) => {
      const isDeleted = item.isDeleted ?? false;
      const isDeletedFlag = item._deleted ?? false;
      return isDeleted || isDeletedFlag;
    })
    .toArray();
}

/**
 * Get unavailable items
 */
export async function getUnavailableItems(): Promise<ItemRecord[]> {
  return db.items
    .filter((item) => !item.isAvailable && !item._deleted && !item.isDeleted)
    .toArray();
}

/**
 * Update item availability
 */
export async function updateAvailability(
  id: string,
  isAvailable: boolean
): Promise<ItemRecord | null> {
  const item = await db.items
    .where("_id")
    .equals(id)
    .or("clientId")
    .equals(id)
    .first();

  if (!item || item._deleted || item.isDeleted) {
    const error = new Error("Item not found") as ServiceError;
    error.status = 404;
    throw error;
  }

  const now = new Date().toISOString();
  await db.items.update(item.id!, {
    isAvailable,
    updatedAt: now,
    syncStatus: "pending",
  });

  // Queue for sync
  await addToSyncQueue({
    clientId: item.clientId,
    type: "item",
    data: { isAvailable },
    timestamp: Date.now(),
    method: "update",
  });

  return (await db.items.get(item.id!)) || null;
}
