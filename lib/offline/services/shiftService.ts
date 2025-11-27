/**
 * Shift Service - Offline
 * Handles shift CRUD operations in IndexedDB
 */

import { v4 as uuidv4 } from "uuid";
import { db, ShiftRecord } from "@/lib/db/indexedDB";
import { addToSyncQueue } from "@/lib/offline/syncQueue";
import { validateOrThrow, createShiftSchema, updateShiftSchema } from "@/lib/offline/validation";

export interface CreateShiftInput {
  staffId: string;
  notes?: string;
  clientId?: string;
}

export interface UpdateShiftInput {
  endTime?: string | Date;
  notes?: string;
}

export interface ListShiftFilters {
  staffId?: string;
  status?: "active" | "completed";
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * Start a new shift
 */
export async function startShift(data: CreateShiftInput): Promise<ShiftRecord> {
  // Validate input
  const validatedData = validateOrThrow(createShiftSchema, {
    ...data,
    startTime: new Date(),
  });

  // Check if staff member exists and is cashier/waiter
  const staff = await db.staff
    .where("_id")
    .equals(validatedData.staffId)
    .or("clientId")
    .equals(validatedData.staffId)
    .first();

  if (!staff || staff._deleted || staff.isDeleted) {
    const error: any = new Error("Staff member not found");
    error.status = 404;
    throw error;
  }

  if (staff.role !== "cashier" && staff.role !== "waiter") {
    const error: any = new Error("User is not a cashier or waiter");
    error.status = 400;
    throw error;
  }

  // Check if there's an active shift for this staff member
  const activeShift = await db.shifts
    .filter(
      (shift) =>
        (shift.staffId === validatedData.staffId ||
          shift.staffId === staff._id ||
          shift.staffId === staff.clientId) &&
        shift.status === "active" &&
        !shift._deleted
    )
    .first();

  if (activeShift) {
    const error: any = new Error("Staff member already has an active shift");
    error.status = 400;
    throw error;
  }

  // Check for idempotency
  if (data.clientId) {
    const existing = await db.shifts.where("clientId").equals(data.clientId).first();
    if (existing) {
      return existing;
    }
  }

  const clientId = data.clientId || uuidv4();
  const now = new Date().toISOString();

  const shift: Omit<ShiftRecord, "id"> = {
    _id: undefined,
    clientId,
    staffId: staff._id || staff.clientId,
    startTime: now,
    endTime: undefined,
    status: "active",
    ordersHandled: [],
    revenue: 0,
    notes: validatedData.notes,
    createdAt: now,
    updatedAt: now,
    syncStatus: "pending",
    _deleted: false,
  };

  const id = await db.shifts.add(shift as ShiftRecord);

  // Queue for sync
  await addToSyncQueue({
    clientId,
    type: "shift",
    data: {
      staffId: staff._id || staff.clientId,
      startTime: now,
      status: "active",
      notes: validatedData.notes,
    },
    timestamp: Date.now(),
    method: "create",
  });

  return { ...shift, id } as ShiftRecord;
}

/**
 * End a shift
 */
export async function endShift(
  shiftId: string,
  data?: UpdateShiftInput
): Promise<ShiftRecord | null> {
  const shift = await db.shifts
    .where("_id")
    .equals(shiftId)
    .or("clientId")
    .equals(shiftId)
    .first();

  if (!shift || shift._deleted) {
    const error: any = new Error("Shift not found");
    error.status = 404;
    throw error;
  }

  if (shift.status === "completed") {
    const error: any = new Error("Shift is already completed");
    error.status = 400;
    throw error;
  }

  // Calculate revenue from completed orders
  const orders = await db.orders
    .filter(
      (order) =>
        shift.ordersHandled.includes(order._id || order.clientId || "") &&
        order.status === "OWNER_CONFIRMED" &&
        !order._deleted
    )
    .toArray();

  const revenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

  const now = new Date().toISOString();
  const endTime = data?.endTime
    ? data.endTime instanceof Date
      ? data.endTime.toISOString()
      : data.endTime
    : now;

  const updates: Partial<ShiftRecord> = {
    endTime,
    status: "completed",
    revenue,
    updatedAt: now,
    syncStatus: "pending",
  };

  if (data?.notes !== undefined) {
    updates.notes = data.notes;
  }

  await db.shifts.update(shift.id!, updates);

  // Queue for sync
  await addToSyncQueue({
    clientId: shift.clientId,
    type: "shift",
    data: {
      endTime,
      status: "completed",
      revenue,
      notes: data?.notes,
    },
    timestamp: Date.now(),
    method: "update",
  });

  return (await db.shifts.get(shift.id!)) || null;
}

/**
 * List shifts with filters
 */
export async function listShifts(filters: ListShiftFilters = {}): Promise<{
  shifts: ShiftRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}> {
  let query = db.shifts.toCollection();

  // Apply filters
  if (filters.staffId) {
    query = query.filter(
      (shift) =>
        shift.staffId === filters.staffId ||
        shift.staffId === filters.staffId
    );
  }

  if (filters.status) {
    query = query.filter((shift) => shift.status === filters.status);
  }

  if (filters.startDate || filters.endDate) {
    query = query.filter((shift) => {
      const startTime = new Date(shift.startTime);
      if (filters.startDate && startTime < filters.startDate) return false;
      if (filters.endDate && startTime > filters.endDate) return false;
      return true;
    });
  }

  // Exclude deleted
  query = query.filter((shift) => !shift._deleted);

  const allShifts = await query.toArray();

  // Sort by startTime (descending)
  allShifts.sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );

  // Pagination
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const skip = (page - 1) * limit;
  const total = allShifts.length;
  const shifts = allShifts.slice(skip, skip + limit);

  // Populate staff relationship
  const shiftsWithStaff = await Promise.all(
    shifts.map(async (shift) => {
      const staff = await db.staff
        .where("_id")
        .equals(shift.staffId)
        .or("clientId")
        .equals(shift.staffId)
        .first();

      return {
        ...shift,
        staffId: staff
          ? {
              id: staff._id || staff.clientId,
              name: staff.name,
              email: staff.email,
              role: staff.role,
            }
          : shift.staffId,
      };
    })
  );

  return {
    shifts: shiftsWithStaff as any,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get shift by ID
 */
export async function getShiftById(id: string): Promise<ShiftRecord | null> {
  const shift = await db.shifts
    .where("_id")
    .equals(id)
    .or("clientId")
    .equals(id)
    .first();

  if (!shift || shift._deleted) {
    return null;
  }

  // Populate relationships
  const staff = await db.staff
    .where("_id")
    .equals(shift.staffId)
    .or("clientId")
    .equals(shift.staffId)
    .first();

  return {
    ...shift,
    staffId: staff
      ? {
          id: staff._id || staff.clientId,
          name: staff.name,
          email: staff.email,
          role: staff.role,
        }
      : shift.staffId,
  } as any;
}

/**
 * Get active shift for a staff member
 */
export async function getActiveShift(staffId: string): Promise<ShiftRecord | null> {
  const shift = await db.shifts
    .filter(
      (shift) =>
        (shift.staffId === staffId || shift.staffId === staffId) &&
        shift.status === "active" &&
        !shift._deleted
    )
    .first();

  if (!shift) {
    return null;
  }

  // Populate staff
  const staff = await db.staff
    .where("_id")
    .equals(shift.staffId)
    .or("clientId")
    .equals(shift.staffId)
    .first();

  return {
    ...shift,
    staffId: staff
      ? {
          id: staff._id || staff.clientId,
          name: staff.name,
          email: staff.email,
          role: staff.role,
        }
      : shift.staffId,
  } as any;
}

/**
 * Get shift history for a staff member
 */
export async function getShiftHistory(staffId: string): Promise<ShiftRecord[]> {
  const shifts = await db.shifts
    .filter(
      (shift) =>
        (shift.staffId === staffId || shift.staffId === staffId) &&
        shift.status === "completed" &&
        !shift._deleted
    )
    .toArray();

  // Sort by startTime (descending)
  shifts.sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );

  // Limit to 30 most recent
  return shifts.slice(0, 30);
}

/**
 * Calculate shift revenue
 */
export async function calculateShiftRevenue(shiftId: string): Promise<number> {
  const shift = await db.shifts
    .where("_id")
    .equals(shiftId)
    .or("clientId")
    .equals(shiftId)
    .first();

  if (!shift || shift._deleted) {
    const error: any = new Error("Shift not found");
    error.status = 404;
    throw error;
  }

  const orders = await db.orders
    .filter(
      (order) =>
        shift.ordersHandled.includes(order._id || order.clientId || "") &&
        order.status === "OWNER_CONFIRMED" &&
        !order._deleted
    )
    .toArray();

  const revenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

  // Update shift revenue
  await db.shifts.update(shift.id!, {
    revenue,
    updatedAt: new Date().toISOString(),
    syncStatus: "pending",
  });

  return revenue;
}

/**
 * Add order to shift
 */
export async function addOrderToShift(shiftId: string, orderId: string): Promise<void> {
  const shift = await db.shifts
    .where("_id")
    .equals(shiftId)
    .or("clientId")
    .equals(shiftId)
    .first();

  if (!shift || shift._deleted) {
    const error: any = new Error("Shift not found");
    error.status = 404;
    throw error;
  }

  if (shift.status === "completed") {
    const error: any = new Error("Cannot add order to completed shift");
    error.status = 400;
    throw error;
  }

  // Check if order already in shift
  const order = await db.orders
    .where("_id")
    .equals(orderId)
    .or("clientId")
    .equals(orderId)
    .first();

  if (!order) {
    const error: any = new Error("Order not found");
    error.status = 404;
    throw error;
  }

  const orderIdentifier = order._id || order.clientId || orderId;
  if (!shift.ordersHandled.includes(orderIdentifier)) {
    await db.shifts.update(shift.id!, {
      ordersHandled: [...shift.ordersHandled, orderIdentifier],
      updatedAt: new Date().toISOString(),
      syncStatus: "pending",
    });

    // Queue for sync
    await addToSyncQueue({
      clientId: shift.clientId,
      type: "shift",
      data: {
        ordersHandled: [...shift.ordersHandled, orderIdentifier],
      },
      timestamp: Date.now(),
      method: "update",
    });
  }
}

