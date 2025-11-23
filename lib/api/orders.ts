/**
 * Orders API Client
 *
 * This file provides functions for interacting with the orders API endpoints.
 * It handles creating, fetching, and updating orders.
 */

import { api, ApiError as ApiErrorClass } from "./config";

// Re-export ApiError for use in components
export { ApiErrorClass as ApiError };

/**
 * Order Item Input
 * Matches the backend CreateOrderInput.items structure
 */
export interface OrderItemInput {
  itemId: string;
  typeSnapshot: "food" | "beverage";
  qty: number;
  nameSnapshot: string;
  priceSnapshot: number;
}

/**
 * Create Order Input
 * Matches the backend CreateOrderInput structure
 */
export interface CreateOrderInput {
  tableNumber: string;
  items: OrderItemInput[];
  note?: string;
  waiterId: string;
  clientId?: string;
}

/**
 * Backend Order Response
 * waiterId and cashierId are populated with User objects
 */
interface BackendOrder {
  id: string;
  orderCode: string;
  orderNumber: string;
  tableNumber: string;
  items: OrderItemInput[];
  note?: string;
  totalAmount: number;
  status:
    | "pending"
    | "preparing"
    | "ready"
    | "completed"
    | "cancelled"
    | "placed"
    | "served";
  waiterId?:
    | string
    | { _id: string; name: string; email?: string; phone?: string };
  cashierId?:
    | string
    | { _id: string; name: string; email?: string; phone?: string };
  createdAt: string;
  updatedAt: string;
}

/**
 * Frontend Order (transformed)
 */
export interface Order {
  id: string;
  orderCode: string;
  orderNumber: string;
  tableNumber: string;
  items: OrderItemInput[];
  note?: string;
  totalAmount: number;
  status:
    | "pending"
    | "preparing"
    | "ready"
    | "completed"
    | "cancelled"
    | "placed"
    | "served";
  waiterId?: string;
  waiterName?: string;
  cashierId?: string;
  cashierName?: string;
  createdAt: string;
  updatedAt: string;
  // Display fields (computed)
  customer?: string; // "Table X" format
  totalPrice: number; // Alias for totalAmount
  date: string; // Formatted date string
}

/**
 * Map backend status to frontend display status
 * Backend statuses: OPEN, VOIDED, PAID_TO_CASHIER, TRANSFERRED_TO_OWNER, OWNER_CONFIRMED, DISPUTED
 */
export function mapStatusToDisplay(
  status: string
): "Pending" | "Completed" | "Cancelled" | string {
  const statusUpper = status.toUpperCase();
  const statusMap: Record<string, string> = {
    // Backend statuses
    OPEN: "Pending",
    PAID_TO_CASHIER: "Pending",
    TRANSFERRED_TO_OWNER: "Pending",
    DISPUTED: "Pending",
    OWNER_CONFIRMED: "Completed",
    VOIDED: "Cancelled",
    // Legacy/alternative statuses
    placed: "Pending",
    pending: "Pending",
    served: "Served",
    preparing: "Preparing",
    ready: "Ready",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return statusMap[statusUpper] || statusMap[status.toLowerCase()] || status;
}

/**
 * Transform backend order to frontend format
 */
function transformOrder(backendOrder: BackendOrder): Order {
  // Extract waiter information
  const waiterId =
    typeof backendOrder.waiterId === "string"
      ? backendOrder.waiterId
      : backendOrder.waiterId?._id || backendOrder.waiterId;
  const waiterName =
    typeof backendOrder.waiterId === "object" && backendOrder.waiterId
      ? backendOrder.waiterId.name
      : undefined;

  // Extract cashier information
  const cashierId =
    typeof backendOrder.cashierId === "string"
      ? backendOrder.cashierId
      : backendOrder.cashierId?._id || backendOrder.cashierId;
  const cashierName =
    typeof backendOrder.cashierId === "object" && backendOrder.cashierId
      ? backendOrder.cashierId.name
      : undefined;

  // Format date for display
  const date = new Date(backendOrder.createdAt).toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Format customer string
  const customer = `Table ${backendOrder.tableNumber}${
    waiterName ? ` - ${waiterName}` : ""
  }`;

  return {
    id: backendOrder.id,
    orderCode: backendOrder.orderCode,
    orderNumber: backendOrder.orderNumber,
    tableNumber: backendOrder.tableNumber,
    items: backendOrder.items,
    note: backendOrder.note,
    totalAmount: backendOrder.totalAmount,
    totalPrice: backendOrder.totalAmount, // Alias for compatibility
    status: backendOrder.status,
    waiterId: waiterId as string | undefined,
    waiterName,
    cashierId: cashierId as string | undefined,
    cashierName,
    createdAt: backendOrder.createdAt,
    updatedAt: backendOrder.updatedAt,
    customer,
    date,
  };
}

/**
 * Create a new order
 * @param data - Order creation data
 * @returns Created order
 * @throws ApiError if request fails
 */
export async function createOrder(data: CreateOrderInput): Promise<Order> {
  try {
    // Validate required fields
    if (!data.tableNumber || !data.tableNumber.trim()) {
      throw new ApiErrorClass(
        400,
        "Table number is required",
        "VALIDATION_ERROR"
      );
    }
    if (!data.items || data.items.length === 0) {
      throw new ApiErrorClass(
        400,
        "At least one item is required",
        "VALIDATION_ERROR"
      );
    }
    if (!data.waiterId || !data.waiterId.trim()) {
      throw new ApiErrorClass(400, "Waiter ID is required", "VALIDATION_ERROR");
    }

    // Backend returns order directly, not wrapped in { success: true, data: ... }
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"
      }/orders`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiErrorClass(
        response.status,
        errorData.error ||
          errorData.message ||
          `Request failed with status ${response.status}`,
        errorData.code
      );
    }

    const backendOrder: BackendOrder = await response.json();
    return transformOrder(backendOrder);
  } catch (error) {
    if (error instanceof ApiErrorClass) {
      throw error;
    }
    throw new ApiErrorClass(500, "Failed to create order", "CREATE_ERROR");
  }
}

/**
 * Get order by ID
 * @param id - Order ID
 * @returns Order or null if not found
 * @throws ApiError if request fails
 */
export async function getOrder(id: string): Promise<Order | null> {
  try {
    if (!id || !id.trim()) {
      throw new ApiErrorClass(400, "Order ID is required", "VALIDATION_ERROR");
    }
    // Backend returns order directly, not wrapped
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"
      }/orders/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const errorData = await response.json().catch(() => ({}));
      throw new ApiErrorClass(
        response.status,
        errorData.error ||
          errorData.message ||
          `Request failed with status ${response.status}`,
        errorData.code
      );
    }

    const backendOrder: BackendOrder = await response.json();
    return transformOrder(backendOrder);
  } catch (error) {
    if (error instanceof ApiErrorClass) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
    throw new ApiErrorClass(500, "Failed to fetch order", "FETCH_ERROR");
  }
}

/**
 * List orders with optional filters
 * @param filters - Optional filter criteria
 * @returns Array of orders
 * @throws ApiError if request fails
 */
export async function listOrders(filters?: {
  status?: string;
  waiterId?: string;
  cashierId?: string;
  startDate?: string;
  endDate?: string;
  roleFilter?: "waiter" | "owner"; // For frontend filtering logic
}): Promise<Order[]> {
  try {
    const queryParams = new URLSearchParams();
    if (filters?.status) queryParams.append("status", filters.status);
    if (filters?.waiterId) queryParams.append("waiterId", filters.waiterId);
    if (filters?.cashierId) queryParams.append("cashierId", filters.cashierId);
    if (filters?.startDate) queryParams.append("startDate", filters.startDate);
    if (filters?.endDate) queryParams.append("endDate", filters.endDate);

    const endpoint = `/orders${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;

    // Backend returns orders directly, not wrapped
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"
      }${endpoint}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiErrorClass(
        response.status,
        errorData.error ||
          errorData.message ||
          `Request failed with status ${response.status}`,
        errorData.code
      );
    }

    const backendOrders: BackendOrder[] = await response.json();
    return backendOrders.map(transformOrder);
  } catch (error) {
    if (error instanceof ApiErrorClass) {
      throw error;
    }
    throw new ApiErrorClass(500, "Failed to fetch orders", "FETCH_ERROR");
  }
}

/**
 * Update order status
 * @param id - Order ID
 * @param status - New status
 * @returns Updated order
 * @throws ApiError if request fails
 */
export async function updateOrderStatus(
  id: string,
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled"
): Promise<Order> {
  try {
    if (!id || !id.trim()) {
      throw new ApiErrorClass(400, "Order ID is required", "VALIDATION_ERROR");
    }
    if (!status) {
      throw new ApiErrorClass(400, "Status is required", "VALIDATION_ERROR");
    }

    // Backend returns order directly
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"
      }/orders/${id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiErrorClass(
        response.status,
        errorData.error ||
          errorData.message ||
          `Request failed with status ${response.status}`,
        errorData.code
      );
    }

    const backendOrder: BackendOrder = await response.json();
    return transformOrder(backendOrder);
  } catch (error) {
    if (error instanceof ApiErrorClass) {
      throw error;
    }
    throw new ApiErrorClass(
      500,
      "Failed to update order status",
      "UPDATE_ERROR"
    );
  }
}
