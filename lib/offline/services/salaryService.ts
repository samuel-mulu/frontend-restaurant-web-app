/**
 * Salary Service - Offline
 * Handles salary CRUD operations in IndexedDB
 */

import { v4 as uuidv4 } from "uuid";
import { db, SalaryRecord } from "@/lib/db/indexedDB";
import { addToSyncQueue } from "@/lib/offline/syncQueue";
import { validateOrThrow, createSalarySchema, updateSalarySchema } from "@/lib/offline/validation";

export interface CreateSalaryInput {
  staffId: string;
  amount: number;
  month: string; // YYYY-MM format
  year: number;
  paymentDate: string | Date;
  status?: "pending" | "paid";
  remarks?: string;
  createdBy: string;
  clientId?: string;
}

export interface UpdateSalaryInput {
  amount?: number;
  status?: "pending" | "paid";
  paymentDate?: string | Date;
  remarks?: string;
}

export interface ListSalaryFilters {
  staffId?: string;
  month?: string;
  year?: number;
  status?: "pending" | "paid";
  page?: number;
  limit?: number;
}

/**
 * Create a salary record
 */
export async function createSalary(
  data: CreateSalaryInput,
  createdBy: string
): Promise<SalaryRecord> {
  // Validate input
  const validatedData = validateOrThrow(createSalarySchema, {
    ...data,
    createdBy,
  });

  // Check for idempotency
  if (data.clientId) {
    const existing = await db.salary.where("clientId").equals(data.clientId).first();
    if (existing) {
      return existing;
    }
  }

  // Validate staff exists and is not deleted
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

  // Check for duplicate (compound unique: staffId + month + year)
  const existing = await db.salary
    .filter(
      (salary) =>
        (salary.staffId === validatedData.staffId ||
          salary.staffId === staff._id ||
          salary.staffId === staff.clientId) &&
        salary.month === validatedData.month &&
        salary.year === validatedData.year &&
        !salary._deleted
    )
    .first();

  if (existing) {
    const error: any = new Error(
      "Salary record already exists for this staff member, month, and year"
    );
    error.status = 409;
    throw error;
  }

  const clientId = data.clientId || uuidv4();
  const now = new Date().toISOString();
  const paymentDateStr =
    validatedData.paymentDate instanceof Date
      ? validatedData.paymentDate.toISOString()
      : validatedData.paymentDate;

  const salary: Omit<SalaryRecord, "id"> = {
    _id: undefined,
    clientId,
    staffId: staff._id || staff.clientId,
    amount: validatedData.amount,
    month: validatedData.month,
    year: validatedData.year,
    paymentDate: paymentDateStr,
    status: validatedData.status || "pending",
    remarks: validatedData.remarks,
    createdBy: createdBy,
    createdAt: now,
    updatedAt: now,
    syncStatus: "pending",
    _deleted: false,
  };

  const id = await db.salary.add(salary as SalaryRecord);

  // Queue for sync
  await addToSyncQueue({
    clientId,
    type: "salary",
    data: {
      staffId: staff._id || staff.clientId,
      amount: validatedData.amount,
      month: validatedData.month,
      year: validatedData.year,
      paymentDate: paymentDateStr,
      status: validatedData.status || "pending",
      remarks: validatedData.remarks,
    },
    timestamp: Date.now(),
    method: "create",
  });

  return { ...salary, id } as SalaryRecord;
}

/**
 * Update a salary record
 */
export async function updateSalary(
  id: string,
  data: UpdateSalaryInput
): Promise<SalaryRecord | null> {
  // Validate input
  const validatedData = validateOrThrow(updateSalarySchema, data);

  const salary = await db.salary
    .where("_id")
    .equals(id)
    .or("clientId")
    .equals(id)
    .first();

  if (!salary || salary._deleted) {
    const error: any = new Error("Salary record not found");
    error.status = 404;
    throw error;
  }

  const updates: Partial<SalaryRecord> = {
    updatedAt: new Date().toISOString(),
    syncStatus: "pending",
  };

  if (validatedData.amount !== undefined) {
    if (validatedData.amount <= 0) {
      const error: any = new Error("Amount must be greater than 0");
      error.status = 400;
      throw error;
    }
    updates.amount = validatedData.amount;
  }

  if (validatedData.status !== undefined) updates.status = validatedData.status;
  if (validatedData.paymentDate !== undefined) {
    updates.paymentDate =
      validatedData.paymentDate instanceof Date
        ? validatedData.paymentDate.toISOString()
        : validatedData.paymentDate;
  }
  if (validatedData.remarks !== undefined) updates.remarks = validatedData.remarks;

  await db.salary.update(salary.id!, updates);

  // Queue for sync
  await addToSyncQueue({
    clientId: salary.clientId,
    type: "salary",
    data: validatedData,
    timestamp: Date.now(),
    method: "update",
  });

  return (await db.salary.get(salary.id!)) || null;
}

/**
 * List salaries with filters
 */
export async function listSalaries(filters: ListSalaryFilters = {}): Promise<{
  salaries: SalaryRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}> {
  let query = db.salary.toCollection();

  // Apply filters
  if (filters.staffId) {
    query = query.filter(
      (salary) =>
        salary.staffId === filters.staffId ||
        salary.staffId === filters.staffId
    );
  }

  if (filters.month) {
    query = query.filter((salary) => salary.month === filters.month);
  }

  if (filters.year) {
    query = query.filter((salary) => salary.year === filters.year);
  }

  if (filters.status) {
    query = query.filter((salary) => salary.status === filters.status);
  }

  // Exclude deleted
  query = query.filter((salary) => !salary._deleted);

  const allSalaries = await query.toArray();

  // Sort by year, month, createdAt (descending)
  allSalaries.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.month !== b.month) return b.month.localeCompare(a.month);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Pagination
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const skip = (page - 1) * limit;
  const total = allSalaries.length;
  const salaries = allSalaries.slice(skip, skip + limit);

  // Populate staff and createdBy relationships
  const salariesWithRelations = await Promise.all(
    salaries.map(async (salary) => {
      const staff = await db.staff
        .where("_id")
        .equals(salary.staffId)
        .or("clientId")
        .equals(salary.staffId)
        .first();

      const creator = await db.staff
        .where("_id")
        .equals(salary.createdBy)
        .or("clientId")
        .equals(salary.createdBy)
        .first();

      return {
        ...salary,
        staffId: staff
          ? {
              id: staff._id || staff.clientId,
              name: staff.name,
              email: staff.email,
              phone: staff.phone,
              role: staff.role,
            }
          : salary.staffId,
        createdBy: creator
          ? {
              id: creator._id || creator.clientId,
              name: creator.name,
              email: creator.email,
            }
          : salary.createdBy,
      };
    })
  );

  return {
    salaries: salariesWithRelations as any,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get salary by ID
 */
export async function getSalaryById(id: string): Promise<SalaryRecord | null> {
  const salary = await db.salary
    .where("_id")
    .equals(id)
    .or("clientId")
    .equals(id)
    .first();

  if (!salary || salary._deleted) {
    return null;
  }

  // Populate relationships
  const staff = await db.staff
    .where("_id")
    .equals(salary.staffId)
    .or("clientId")
    .equals(salary.staffId)
    .first();

  const creator = await db.staff
    .where("_id")
    .equals(salary.createdBy)
    .or("clientId")
    .equals(salary.createdBy)
    .first();

  return {
    ...salary,
    staffId: staff
      ? {
          id: staff._id || staff.clientId,
          name: staff.name,
          email: staff.email,
          phone: staff.phone,
          role: staff.role,
        }
      : salary.staffId,
    createdBy: creator
      ? {
          id: creator._id || creator.clientId,
          name: creator.name,
          email: creator.email,
        }
      : salary.createdBy,
  } as any;
}

/**
 * Get salary summary (aggregated by staff)
 */
export async function getSalarySummary(filters: { month?: string; year?: number }): Promise<{
  summary: Array<{
    staffId: string;
    staffName: string;
    staffEmail?: string;
    staffPhone?: string;
    totalAmount: number;
    count: number;
    paidCount: number;
    pendingCount: number;
  }>;
  totals: {
    totalAmount: number;
    totalCount: number;
    totalPaid: number;
    totalPending: number;
  };
}> {
  let salaries = await db.salary.toCollection().toArray();

  // Apply filters
  if (filters.month) {
    salaries = salaries.filter((s) => s.month === filters.month);
  }
  if (filters.year) {
    salaries = salaries.filter((s) => s.year === filters.year);
  }

  // Exclude deleted
  salaries = salaries.filter((s) => !s._deleted);

  // Group by staffId
  const staffMap = new Map<string, any>();

  for (const salary of salaries) {
    const staffId = salary.staffId;
    if (!staffMap.has(staffId)) {
      const staff = await db.staff
        .where("_id")
        .equals(staffId)
        .or("clientId")
        .equals(staffId)
        .first();

      staffMap.set(staffId, {
        staffId,
        staffName: staff?.name || "Unknown",
        staffEmail: staff?.email,
        staffPhone: staff?.phone,
        totalAmount: 0,
        count: 0,
        paidCount: 0,
        pendingCount: 0,
      });
    }

    const entry = staffMap.get(staffId)!;
    entry.totalAmount += salary.amount;
    entry.count += 1;
    if (salary.status === "paid") {
      entry.paidCount += 1;
    } else {
      entry.pendingCount += 1;
    }
  }

  const summary = Array.from(staffMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);

  // Calculate totals
  const totals = {
    totalAmount: salaries.reduce((sum, s) => sum + s.amount, 0),
    totalCount: salaries.length,
    totalPaid: salaries.filter((s) => s.status === "paid").reduce((sum, s) => sum + s.amount, 0),
    totalPending: salaries.filter((s) => s.status === "pending").reduce((sum, s) => sum + s.amount, 0),
  };

  return { summary, totals };
}

/**
 * Get staff salary history
 */
export async function getStaffSalaryHistory(staffId: string): Promise<SalaryRecord[]> {
  const salaries = await db.salary
    .filter(
      (salary) =>
        (salary.staffId === staffId || salary.staffId === staffId) && !salary._deleted
    )
    .toArray();

  // Sort by year, month (descending)
  salaries.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month.localeCompare(a.month);
  });

  // Populate createdBy
  return Promise.all(
    salaries.map(async (salary) => {
      const creator = await db.staff
        .where("_id")
        .equals(salary.createdBy)
        .or("clientId")
        .equals(salary.createdBy)
        .first();

      return {
        ...salary,
        createdBy: creator
          ? {
              id: creator._id || creator.clientId,
              name: creator.name,
              email: creator.email,
            }
          : salary.createdBy,
      };
    })
  ) as any;
}

