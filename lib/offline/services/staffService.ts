/**
 * Staff Service - Offline
 * Handles staff CRUD operations in IndexedDB
 */

import { v4 as uuidv4 } from "uuid";
import { db, StaffRecord } from "@/lib/db/indexedDB";
import { addToSyncQueue } from "@/lib/offline/syncQueue";
import { validateOrThrow, createStaffSchema, updateStaffSchema } from "@/lib/offline/validation";

export interface CreateStaffInput {
  name: string;
  email?: string | null;
  password?: string;
  phone?: string | null;
  role: "cashier" | "waiter" | "staff";
  salary: number;
  clientId?: string;
}

export interface UpdateStaffInput {
  phone?: string | null;
  salary?: number;
  role?: "cashier" | "waiter" | "staff";
}

export interface ListStaffFilters {
  role?: "cashier" | "waiter" | "staff";
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Create a new staff member
 */
export async function createStaff(data: CreateStaffInput): Promise<StaffRecord> {
  // Validate input
  const validatedData = validateOrThrow(createStaffSchema, data);

  // Check for idempotency
  if (data.clientId) {
    const existing = await db.staff.where("clientId").equals(data.clientId).first();
    if (existing) {
      return existing;
    }
  }

  // Check email uniqueness if provided
  if (validatedData.email && validatedData.email.trim()) {
    const existingEmail = await db.staff
      .filter((staff) => staff.email?.toLowerCase() === validatedData.email?.toLowerCase() && !staff._deleted && !staff.isDeleted)
      .first();

    if (existingEmail) {
      const error: any = new Error("Email already exists");
      error.status = 409;
      throw error;
    }
  }

  // Check phone uniqueness if provided
  if (validatedData.phone && validatedData.phone.trim()) {
    const existingPhone = await db.staff
      .filter((staff) => staff.phone === validatedData.phone?.trim() && !staff._deleted && !staff.isDeleted)
      .first();

    if (existingPhone) {
      const error: any = new Error("Phone number already exists");
      error.status = 409;
      throw error;
    }
  }

  const clientId = data.clientId || uuidv4();
  const now = new Date().toISOString();

  const staff: Omit<StaffRecord, "id"> = {
    _id: undefined,
    clientId,
    name: validatedData.name,
    email: validatedData.email?.toLowerCase().trim() || undefined,
    phone: validatedData.phone?.trim() || undefined,
    role: validatedData.role,
    salary: validatedData.salary,
    isDeleted: false,
    deletedAt: undefined,
    createdAt: now,
    updatedAt: now,
    syncStatus: "pending",
    _deleted: false,
    // Note: password is not stored offline - backend handles on sync
  };

  const id = await db.staff.add(staff as StaffRecord);

  // Queue for sync (include password in sync data)
  await addToSyncQueue({
    clientId,
    type: "staff",
    data: {
      ...validatedData,
      password: validatedData.password, // Will be hashed by backend
    },
    timestamp: Date.now(),
    method: "create",
  });

  return { ...staff, id } as StaffRecord;
}

/**
 * Update a staff member
 */
export async function updateStaff(id: string, data: UpdateStaffInput): Promise<StaffRecord | null> {
  // Validate input
  const validatedData = validateOrThrow(updateStaffSchema, data);

  // Find existing staff
  let staff = await db.staff
    .where("_id")
    .equals(id)
    .or("clientId")
    .equals(id)
    .first();

  if (!staff || staff._deleted || staff.isDeleted) {
    const error: any = new Error("Staff member not found");
    error.status = 404;
    throw error;
  }

  // Validate role if provided
  if (validatedData.role) {
    if (!["cashier", "waiter", "staff"].includes(validatedData.role)) {
      const error: any = new Error("Role must be cashier, waiter, or staff");
      error.status = 400;
      throw error;
    }
  }

  // Check phone uniqueness if updating
  if (validatedData.phone !== undefined && validatedData.phone !== staff.phone) {
    const existingPhone = await db.staff
      .filter(
        (s) =>
          s.phone === validatedData.phone?.trim() &&
          s.clientId !== staff.clientId &&
          !s._deleted &&
          !s.isDeleted
      )
      .first();

    if (existingPhone) {
      const error: any = new Error("Phone number already exists");
      error.status = 409;
      throw error;
    }
  }

  const updates: Partial<StaffRecord> = {
    updatedAt: new Date().toISOString(),
    syncStatus: "pending",
  };

  if (validatedData.phone !== undefined) updates.phone = validatedData.phone?.trim() || undefined;
  if (validatedData.salary !== undefined) updates.salary = validatedData.salary;
  if (validatedData.role !== undefined) updates.role = validatedData.role;

  await db.staff.update(staff.id!, updates);

  // Queue for sync
  await addToSyncQueue({
    clientId: staff.clientId,
    type: "staff",
    data: validatedData,
    timestamp: Date.now(),
    method: "update",
  });

  return (await db.staff.get(staff.id!)) || null;
}

/**
 * Delete a staff member (soft delete)
 */
export async function deleteStaff(id: string): Promise<StaffRecord | null> {
  const staff = await db.staff
    .where("_id")
    .equals(id)
    .or("clientId")
    .equals(id)
    .first();

  if (!staff || staff._deleted || staff.isDeleted) {
    const error: any = new Error("Staff member not found");
    error.status = 404;
    throw error;
  }

  const now = new Date().toISOString();
  await db.staff.update(staff.id!, {
    isDeleted: true,
    deletedAt: now,
    updatedAt: now,
    syncStatus: "pending",
  });

  // Queue for sync
  await addToSyncQueue({
    clientId: staff.clientId,
    type: "staff",
    data: {},
    timestamp: Date.now(),
    method: "delete",
  });

  return (await db.staff.get(staff.id!)) || null;
}

/**
 * List staff with filters
 */
export async function listStaff(filters: ListStaffFilters = {}): Promise<{
  staff: StaffRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}> {
  let query = db.staff.toCollection();

  // Filter by role
  if (filters.role) {
    query = query.filter((staff) => staff.role === filters.role);
  } else {
    // Only staff roles (cashier, waiter, staff)
    query = query.filter((staff) => ["cashier", "waiter", "staff"].includes(staff.role));
  }

  // Exclude deleted
  query = query.filter((staff) => !staff._deleted && !staff.isDeleted);

  // Apply search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    query = query.filter((staff) => {
      const nameMatch = (staff.name || "").toLowerCase().includes(searchLower);
      const emailMatch = (staff.email || "").toLowerCase().includes(searchLower);
      const phoneMatch = (staff.phone || "").includes(searchLower);
      return nameMatch || emailMatch || phoneMatch;
    });
  }

  const allStaff = await query.toArray();

  // Pagination
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const skip = (page - 1) * limit;
  const total = allStaff.length;
  const staff = allStaff.slice(skip, skip + limit);

  return {
    staff,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get staff by ID
 */
export async function getStaffById(id: string): Promise<StaffRecord | null> {
  const staff = await db.staff
    .where("_id")
    .equals(id)
    .or("clientId")
    .equals(id)
    .first();

  if (!staff || staff._deleted || staff.isDeleted) {
    return null;
  }

  // Validate it's a staff member
  if (!["cashier", "waiter", "staff"].includes(staff.role)) {
    const error: any = new Error("User is not a staff member");
    error.status = 400;
    throw error;
  }

  return staff;
}

