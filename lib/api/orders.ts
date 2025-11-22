/**
 * Orders API Client
 *
 * This file provides functions for interacting with the orders API endpoints.
 * It handles creating, fetching, and updating orders.
 */

import { ApiError as ApiErrorClass } from "./config";

// Get the API base URL from environment variables
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

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
 */
interface BackendOrder {
  id: string;
  orderCode: string;
  orderNumber: string;
  tableNumber: string;
  items: OrderItemInput[];
  note?: string;
  totalAmount: number;
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled";
  waiterId?: string;
  cashierId?: string;
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
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled";
  waiterId?: string;
  cashierId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Transform backend order to frontend format
 */
function transformOrder(backendOrder: BackendOrder): Order {
  return {
    id: backendOrder.id,
    orderCode: backendOrder.orderCode,
    orderNumber: backendOrder.orderNumber,
    tableNumber: backendOrder.tableNumber,
    items: backendOrder.items,
    note: backendOrder.note,
    totalAmount: backendOrder.totalAmount,
    status: backendOrder.status,
    waiterId: backendOrder.waiterId,
    cashierId: backendOrder.cashierId,
    createdAt: backendOrder.createdAt,
    updatedAt: backendOrder.updatedAt,
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
    const backendOrder = await api.get<BackendOrder>(`/orders/${id}`);
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
    const backendOrders = await api.get<BackendOrder[]>(endpoint);
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

    const backendOrder = await api.patch<BackendOrder>(`/orders/${id}/status`, {
      status,
    });
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
