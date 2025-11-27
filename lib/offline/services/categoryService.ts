/**
 * Category Service - Offline
 * Handles category CRUD operations in IndexedDB
 */

import { v4 as uuidv4 } from "uuid";
import { db, CategoryRecord } from "@/lib/db/indexedDB";
import { addToSyncQueue } from "@/lib/offline/syncQueue";
import { validateOrThrow, createCategorySchema, updateCategorySchema } from "@/lib/offline/validation";

export interface CreateCategoryInput {
  name: string;
  clientId?: string;
}

export interface UpdateCategoryInput {
  name?: string;
}

/**
 * Create a new category
 */
export async function createCategory(data: CreateCategoryInput): Promise<CategoryRecord> {
  // Validate input
  const validatedData = validateOrThrow(createCategorySchema, data);

  // Normalize name (lowercase, trim)
  const normalizedName = validatedData.name.trim().toLowerCase();

  // Check for duplicate name (case-insensitive)
  const existing = await db.categories
    .filter((cat) => cat.name.toLowerCase() === normalizedName && !cat._deleted)
    .first();

  if (existing) {
    const error: any = new Error(`Category "${normalizedName}" already exists`);
    error.status = 409;
    error.code = "DUPLICATE_CATEGORY";
    throw error;
  }

  // Check for idempotency
  if (data.clientId) {
    const existingById = await db.categories.where("clientId").equals(data.clientId).first();
    if (existingById) {
      return existingById;
    }
  }

  const clientId = data.clientId || uuidv4();
  const now = new Date().toISOString();

  const category: Omit<CategoryRecord, "id"> = {
    _id: undefined,
    clientId,
    name: normalizedName,
    createdAt: now,
    updatedAt: now,
    syncStatus: "pending",
    _deleted: false,
  };

  const id = await db.categories.add(category as CategoryRecord);

  // Queue for sync
  await addToSyncQueue({
    clientId,
    type: "category",
    data: { name: normalizedName },
    timestamp: Date.now(),
    method: "create",
  });

  return { ...category, id } as CategoryRecord;
}

/**
 * Update a category
 */
export async function updateCategory(
  id: string,
  data: UpdateCategoryInput
): Promise<CategoryRecord | null> {
  // Validate input
  const validatedData = validateOrThrow(updateCategorySchema, data);

  // Find existing category
  let category = await db.categories
    .where("_id")
    .equals(id)
    .or("clientId")
    .equals(id)
    .first();

  if (!category || category._deleted) {
    const error: any = new Error("Category not found");
    error.status = 404;
    error.code = "NOT_FOUND";
    throw error;
  }

  // If name is being updated, check for duplicates
  if (validatedData.name !== undefined) {
    const normalizedName = validatedData.name.trim().toLowerCase();

    // Check if name is different
    if (normalizedName !== category.name.toLowerCase()) {
      // Check for duplicate
      const existing = await db.categories
        .filter(
          (cat) =>
            cat.name.toLowerCase() === normalizedName &&
            cat.clientId !== category.clientId &&
            !cat._deleted
        )
        .first();

      if (existing) {
        const error: any = new Error(`Category "${normalizedName}" already exists`);
        error.status = 409;
        error.code = "DUPLICATE_CATEGORY";
        throw error;
      }

      const updates: Partial<CategoryRecord> = {
        name: normalizedName,
        updatedAt: new Date().toISOString(),
        syncStatus: "pending",
      };

      await db.categories.update(category.id!, updates);

      // Queue for sync
      await addToSyncQueue({
        clientId: category.clientId,
        type: "category",
        data: { name: normalizedName },
        timestamp: Date.now(),
        method: "update",
      });
    }
  }

  return (await db.categories.get(category.id!)) || null;
}

/**
 * Delete a category (soft delete)
 */
export async function deleteCategory(id: string): Promise<CategoryRecord | null> {
  const category = await db.categories
    .where("_id")
    .equals(id)
    .or("clientId")
    .equals(id)
    .first();

  if (!category || category._deleted) {
    const error: any = new Error("Category not found");
    error.status = 404;
    error.code = "NOT_FOUND";
    throw error;
  }

  const now = new Date().toISOString();
  await db.categories.update(category.id!, {
    _deleted: true,
    updatedAt: now,
    syncStatus: "pending",
  });

  // Mark all items in this category as unavailable (don't delete them)
  await db.items
    .where("categoryId")
    .equals(category._id || category.clientId)
    .modify((item) => {
      item.isAvailable = false;
      item.updatedAt = now;
      item.syncStatus = "pending";
    });

  // Queue for sync
  await addToSyncQueue({
    clientId: category.clientId,
    type: "category",
    data: {},
    timestamp: Date.now(),
    method: "delete",
  });

  return (await db.categories.get(category.id!)) || null;
}

/**
 * List all categories (non-deleted)
 */
export async function listCategories(): Promise<CategoryRecord[]> {
  return db.categories
    .filter((cat) => !cat._deleted)
    .sortBy("name");
}

/**
 * Get category by ID
 */
export async function getCategoryById(id: string): Promise<CategoryRecord | null> {
  const category = await db.categories
    .where("_id")
    .equals(id)
    .or("clientId")
    .equals(id)
    .first();

  if (!category || category._deleted) {
    return null;
  }

  return category;
}

