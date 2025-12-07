/**
 * Validation Layer
 * Zod schemas matching backend Joi validation schemas
 */

import { z } from "zod";

// Helper to validate ObjectId format (MongoDB ObjectId)
const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format");

// Helper to validate YYYY-MM format
const monthFormatSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format");

// Helper to validate phone number
const phoneSchema = z
  .string()
  .regex(
    /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
    "Phone number must be a valid format"
  );

// ==================== ITEM VALIDATION ====================

export const createItemSchema = z.object({
  categoryId: objectIdSchema,
  name: z
    .string()
    .trim()
    .min(1)
    .max(120, "Name must be at most 120 characters"),
  description: z
    .string()
    .trim()
    .max(500, "Description must be at most 500 characters")
    .optional(),
  price: z.number().min(0, "Price must be non-negative"),
  isAvailable: z.boolean().optional().default(true),
  image: z
    .object({
      url: z.string().url().optional(),
      publicId: z.string().optional(),
    })
    .optional(),
});

export const updateItemSchema = z.object({
  categoryId: objectIdSchema.optional(),
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  price: z.number().min(0).optional(),
  isAvailable: z.boolean().optional(),
  image: z
    .object({
      url: z.string().url().optional(),
      publicId: z.string().optional(),
    })
    .optional(),
});

// ==================== CATEGORY VALIDATION ====================

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(120, "Name must be at most 120 characters"),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
});

// ==================== INVENTORY VALIDATION ====================

export const createInventorySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().optional(),
  quantity: z.number().min(0, "Quantity must be non-negative"),
  unit: z.string().trim().min(1, "Unit is required"),
  price: z.number().min(0, "Price must be non-negative"),
});

export const updateInventorySchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  quantity: z.number().min(0).optional(),
  unit: z.string().trim().min(1).optional(),
  price: z.number().min(0).optional(),
});

// ==================== ORDER VALIDATION ====================

const orderItemSchema = z.object({
  itemId: objectIdSchema,
  qty: z.number().int().min(1, "Quantity must be at least 1"),
  nameSnapshot: z.string().min(1, "Name snapshot is required"),
  priceSnapshot: z.number().min(0, "Price snapshot must be non-negative"),
});

export const createOrderSchema = z.object({
  tableNumber: z.string().optional(),
  peopleCount: z.number().int().min(1).optional(),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
  note: z.string().optional(),
  notes: z.string().optional(),
  allergyRequirements: z
    .object({
      noAllergies: z.boolean().optional(),
      glutenFree: z.boolean().optional(),
      dairyFree: z.boolean().optional(),
      nutFree: z.boolean().optional(),
      vegetarian: z.boolean().optional(),
      vegan: z.boolean().optional(),
    })
    .optional(),
  customerChannel: z.string().optional(),
  waiterId: objectIdSchema.optional(),
  cashierId: objectIdSchema.optional(),
  discount: z.number().min(0).optional(),
});

export const updateOrderSchema = z.object({
  discount: z.number().min(0).optional(),
  notes: z.string().optional(),
  note: z.string().optional(),
  tableNumber: z.string().optional(),
  items: z.array(orderItemSchema).min(1).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "OPEN",
    "VOIDED",
    "PAID_TO_CASHIER",
    "TRANSFERRED_TO_OWNER",
    "OWNER_CONFIRMED",
    "DISPUTED",
  ]),
  paymentMethod: z.enum(["cash", "mobile_banking"]).optional(),
  paymentProofImage: z
    .object({
      url: z.string().url(),
      publicId: z.string(),
    })
    .optional(),
});

// ==================== STAFF VALIDATION ====================

export const createStaffSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be at most 100 characters"),
    email: z
      .string()
      .email("Invalid email format")
      .toLowerCase()
      .trim()
      .optional()
      .nullable(),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .optional(),
    phone: phoneSchema.optional().nullable(),
    role: z.enum(["cashier", "waiter", "staff"]),
    salary: z.number().min(0, "Salary must be non-negative"),
  })
  .refine(
    (data) => {
      // Password is required for cashier and waiter roles
      if (
        (data.role === "cashier" || data.role === "waiter") &&
        !data.password
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Password is required for cashier and waiter roles",
      path: ["password"],
    }
  )
  .refine(
    (data) => {
      // Phone is required for cashier and waiter roles
      if (
        (data.role === "cashier" || data.role === "waiter") &&
        (!data.phone || !data.phone.trim())
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Phone is required for cashier and waiter roles",
      path: ["phone"],
    }
  );

export const updateStaffSchema = z.object({
  phone: phoneSchema.optional().nullable(),
  salary: z.number().min(0).optional(),
  role: z.enum(["cashier", "waiter", "staff"]).optional(),
});

// ==================== SALARY VALIDATION ====================

export const createSalarySchema = z.object({
  staffId: objectIdSchema,
  amount: z.number().min(0, "Amount must be non-negative"),
  month: monthFormatSchema,
  year: z.number().int().min(2020).max(2100),
  paymentDate: z.union([z.string().datetime(), z.date()]),
  status: z.enum(["pending", "paid"]).optional(),
  remarks: z.string().optional(),
});

export const updateSalarySchema = z.object({
  amount: z.number().min(0).optional(),
  status: z.enum(["pending", "paid"]).optional(),
  paymentDate: z.union([z.string().datetime(), z.date()]).optional(),
  remarks: z.string().optional(),
});

// ==================== SHIFT VALIDATION ====================

export const createShiftSchema = z.object({
  staffId: objectIdSchema,
  startTime: z.union([z.string().datetime(), z.date()]),
  notes: z.string().optional(),
});

export const updateShiftSchema = z.object({
  endTime: z.union([z.string().datetime(), z.date()]).optional(),
  notes: z.string().optional(),
});

// ==================== TABLE VALIDATION ====================

export const createTableSchema = z.object({
  tableNumber: z
    .string()
    .trim()
    .min(1, "Table number is required")
    .max(20, "Table number must be at most 20 characters"),
  clientId: z.string().optional(),
});

export const updateTableSchema = z.object({
  tableNumber: z.string().trim().min(1).max(20).optional(),
});

// ==================== VALIDATION HELPER FUNCTIONS ====================

interface ValidationErrorDetail {
  field: string;
  message: string;
}

/**
 * Validate data against a schema and return formatted error if validation fails
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
):
  | { success: true; data: T }
  | { success: false; error: string; details?: ValidationErrorDetail[] } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details: ValidationErrorDetail[] = error.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      return {
        success: false,
        error: "Validation failed",
        details,
      };
    }
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown validation error",
    };
  }
}

interface ValidationError extends Error {
  status: number;
  details?: ValidationErrorDetail[];
}

/**
 * Validate data and throw error if invalid (for use in services)
 */
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = validate(schema, data);
  if (!result.success) {
    const error = new Error(result.error) as ValidationError;
    error.status = 400;
    error.details = result.details;
    throw error;
  }
  return result.data;
}
