/**
 * Table Service - Offline
 * Handles table CRUD operations in IndexedDB
 */

import { v4 as uuidv4 } from "uuid";
import { db, TableRecord } from "@/lib/db/indexedDB";
import { addToSyncQueue } from "@/lib/offline/syncQueue";
import { validateOrThrow, createTableSchema, updateTableSchema } from "@/lib/offline/validation";

export interface CreateTableInput {
  tableNumber: string;
  clientId?: string;
}

export interface UpdateTableInput {
  tableNumber?: string;
}

export interface ListTablesFilters {
  search?: string;
}

/**
 * Create a new table
 */
export async function createTable(data: CreateTableInput): Promise<TableRecord> {
  // Validate input
  const validatedData = validateOrThrow(createTableSchema, data);

  // Normalize table number (uppercase, trim)
  const normalizedTableNumber = validatedData.tableNumber.trim().toUpperCase();

  // Check for duplicate table number
  const existing = await db.restaurantTables
    .filter(
      (table) => table.tableNumber === normalizedTableNumber && !table._deleted
    )
    .first();

  if (existing) {
    const error: any = new Error(`Table "${normalizedTableNumber}" already exists`);
    error.status = 409;
    error.code = "DUPLICATE_TABLE";
    throw error;
  }

  // Check for idempotency
  if (data.clientId) {
    const existingById = await db.restaurantTables
      .where("clientId")
      .equals(data.clientId)
      .first();
    if (existingById) {
      return existingById;
    }
  }

  const clientId = data.clientId || uuidv4();
  const now = new Date().toISOString();

  const table: Omit<TableRecord, "id"> = {
    _id: undefined,
    clientId,
    tableNumber: normalizedTableNumber,
    createdAt: now,
    updatedAt: now,
    syncStatus: "pending",
    _deleted: false,
  };

  const id = await db.restaurantTables.add(table as TableRecord);

  // Queue for sync
  await addToSyncQueue({
    clientId,
    type: "table",
    data: { tableNumber: normalizedTableNumber },
    timestamp: Date.now(),
    method: "create",
  });

  return { ...table, id } as TableRecord;
}

/**
 * Update a table
 */
export async function updateTable(
  id: string,
  data: UpdateTableInput
): Promise<TableRecord | null> {
  // Validate input
  const validatedData = validateOrThrow(updateTableSchema, data);

  // Find existing table
  let table = await db.restaurantTables
    .where("_id")
    .equals(id)
    .or("clientId")
    .equals(id)
    .first();

  if (!table || table._deleted) {
    const error: any = new Error("Table not found");
    error.status = 404;
    error.code = "NOT_FOUND";
    throw error;
  }

  // If tableNumber is being updated, check for duplicates
  if (validatedData.tableNumber !== undefined) {
    const normalizedTableNumber = validatedData.tableNumber.trim().toUpperCase();

    // Check if tableNumber is different
    if (normalizedTableNumber !== table.tableNumber) {
      // Check for duplicate
      const existing = await db.restaurantTables
        .filter(
          (t) =>
            t.tableNumber === normalizedTableNumber &&
            t.clientId !== table.clientId &&
            !t._deleted
        )
        .first();

      if (existing) {
        const error: any = new Error(`Table "${normalizedTableNumber}" already exists`);
        error.status = 409;
        error.code = "DUPLICATE_TABLE";
        throw error;
      }

      const updates: Partial<TableRecord> = {
        tableNumber: normalizedTableNumber,
        updatedAt: new Date().toISOString(),
        syncStatus: "pending",
      };

      await db.restaurantTables.update(table.id!, updates);

      // Queue for sync
      await addToSyncQueue({
        clientId: table.clientId,
        type: "table",
        data: { tableNumber: normalizedTableNumber },
        timestamp: Date.now(),
        method: "update",
      });
    }
  }

  return (await db.restaurantTables.get(table.id!)) || null;
}

/**
 * Delete a table (permanent delete)
 */
export async function deleteTable(id: string): Promise<void> {
  const table = await db.restaurantTables
    .where("_id")
    .equals(id)
    .or("clientId")
    .equals(id)
    .first();

  if (!table) {
    const error: any = new Error("Table not found");
    error.status = 404;
    error.code = "NOT_FOUND";
    throw error;
  }

  // Permanent delete
  await db.restaurantTables.delete(table.id!);

  // Queue for sync
  await addToSyncQueue({
    clientId: table.clientId,
    type: "table",
    data: {},
    timestamp: Date.now(),
    method: "delete",
  });
}

/**
 * List all tables with optional search
 */
export async function listTables(filters: ListTablesFilters = {}): Promise<TableRecord[]> {
  let query = db.restaurantTables.toCollection();

  // Exclude deleted
  query = query.filter((table) => !table._deleted);

  // Apply search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    query = query.filter((table) =>
      table.tableNumber.toLowerCase().includes(searchLower)
    );
  }

  const tables = await query.toArray();

  // Sort by table number
  tables.sort((a, b) => a.tableNumber.localeCompare(b.tableNumber));

  return tables;
}

/**
 * Get table by ID
 */
export async function getTableById(id: string): Promise<TableRecord | null> {
  const table = await db.restaurantTables
    .where("_id")
    .equals(id)
    .or("clientId")
    .equals(id)
    .first();

  if (!table || table._deleted) {
    return null;
  }

  return table;
}

/**
 * Get table by table number
 */
export async function getTableByNumber(tableNumber: string): Promise<TableRecord | null> {
  const normalizedTableNumber = tableNumber.trim().toUpperCase();
  const table = await db.restaurantTables
    .filter(
      (table) => table.tableNumber === normalizedTableNumber && !table._deleted
    )
    .first();

  if (!table) {
    return null;
  }

  return table;
}

