import { createApiEndpoints } from "@/stores/baseApi";
import { v4 as uuidv4 } from "uuid";

export type OrderStatus =
  | "OPEN"
  | "VOIDED"
  | "PAID_TO_CASHIER"
  | "TRANSFERRED_TO_OWNER"
  | "OWNER_CONFIRMED"
  | "DISPUTED";

export interface OrderItem {
  itemId:
    | string
    | {
        _id?: string;
        id?: string;
        name?: string;
        description?: string;
        price?: number;
        image?: string;
        isAvailable?: boolean;
        category?: {
          _id?: string;
          id?: string;
          name?: string;
        };
      };
  nameSnapshot: string;
  priceSnapshot: number;
  qty: number;
}

export interface Order {
  _id?: string;
  id: string;
  orderNumber: string;
  tableNumber: string;
  items: OrderItem[];
  note?: string;
  totalAmount: number;
  status: OrderStatus;
  waiterId?:
    | string
    | {
        _id?: string;
        id?: string;
        name?: string;
        email?: string;
        phone?: string;
      };
  cashierId?:
    | string
    | {
        _id?: string;
        id?: string;
        name?: string;
        email?: string;
        phone?: string;
      };
  placedAt: string;
  cancelledAt?: string;
  paymentReceivedAt?: string;
  paymentDeliveredAt?: string;
  completedAt?: string;
  paymentMethod?: "cash" | "mobile_banking";
  paymentProofImage?: { url: string; publicId: string };
  paymentBankName?: string;
  cancelledBy?:
    | string
    | {
        _id?: string;
        id?: string;
        name?: string;
      };
  transferredToOwnerBy?:
    | string
    | {
        _id?: string;
        id?: string;
        name?: string;
      };
  confirmedBy?:
    | string
    | {
        _id?: string;
        id?: string;
        name?: string;
      };
  disputedBy?:
    | string
    | {
        _id?: string;
        id?: string;
        name?: string;
      };
  createdAt: string;
  updatedAt: string;
  receiptText?: string;
}

export interface CreateOrderInput {
  tableNumber?: string; // Optional table number
  items: {
    itemId: string;
    qty: number;
    nameSnapshot: string;
    priceSnapshot: number;
  }[];
  note?: string;
  waiterId: string;
  clientId?: string;
  customerChannel: string; // Required: "web", "pos", "mobile", etc.
  markAsPaidToCashier?: boolean; // Optional - if true, order starts with PAID_TO_CASHIER status
}

export interface UpdateOrderInput {
  items?: {
    itemId: string;
    qty: number;
    nameSnapshot: string;
    priceSnapshot: number;
  }[];
  note?: string;
  tableNumber?: string;
}

type OrderWrappedResponse = { success?: boolean; data?: Order };

export interface ListOrdersQuery {
  status?: OrderStatus;
  waiterId?: string;
  cashierId?: string;
  startDate?: string;
  endDate?: string;
  search?: string; // Search by orderNumber, tableNumber, waiter name, cashier name
  tableNumber?: string;
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedOrdersResponse {
  orders: Order[];
  pagination: PaginationMeta;
}

export interface UpdateOrderStatusInput {
  status: OrderStatus;
  paymentMethod?: "cash" | "mobile_banking";
  paymentProofImage?: File;
}

// Report Interfaces
export interface CashierReport {
  cashierId: string;
  cashierName?: string;
  totalOrders: number;
  totalCollected: number;
  totalTransferred: number;
  ordersCreated: number;
  ordersCollected: number;
  ordersTransferred: number;
}

export interface WaiterReport {
  waiterId: string;
  waiterName?: string;
  totalOrders: number;
  totalSales: number;
  averageOrderValue: number;
}

export interface DateRangeReport {
  startDate: string;
  endDate: string;
  totalOrders: number;
  totalRevenue: number;
  totalCollected: number;
  totalTransferred: number;
  totalConfirmed: number;
  totalVoided: number;
  ordersByStatus: {
    OPEN: number;
    VOIDED: number;
    PAID_TO_CASHIER: number;
    TRANSFERRED_TO_OWNER: number;
    OWNER_CONFIRMED: number;
    DISPUTED: number;
  };
}

export const ordersApi = createApiEndpoints({
  endpoints: (build) => ({
    listOrders: build.query<
      PaginatedOrdersResponse | Order[],
      ListOrdersQuery | void
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.status) queryParams.append("status", params.status);
        if (params?.waiterId) queryParams.append("waiterId", params.waiterId);
        if (params?.cashierId)
          queryParams.append("cashierId", params.cashierId);
        if (params?.startDate)
          queryParams.append("startDate", params.startDate);
        if (params?.endDate) queryParams.append("endDate", params.endDate);
        if (params?.search) queryParams.append("search", params.search);
        if (params?.tableNumber)
          queryParams.append("tableNumber", params.tableNumber);
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());

        const qs = queryParams.toString();
        return {
          url: `/orders${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      transformResponse: (
        response: unknown,
      ): PaginatedOrdersResponse | Order[] => {
        // Check if response is paginated (has orders and pagination fields)
        if (
          typeof response === "object" &&
          response !== null &&
          "orders" in response &&
          "pagination" in response
        ) {
          return response as PaginatedOrdersResponse;
        }
        // Check if response has data and pagination fields (alternative format)
        if (
          typeof response === "object" &&
          response !== null &&
          "data" in response &&
          "pagination" in response
        ) {
          const wrapped = response as {
            data: Order[];
            pagination: PaginationMeta;
          };
          return {
            orders: wrapped.data,
            pagination: wrapped.pagination,
          };
        }
        // API returns orders directly as array (not wrapped) - backward compatibility
        if (Array.isArray(response)) {
          return response;
        }
        // Handle case where API might wrap in { success: true, data: [...] }
        const wrapped = response as { success?: boolean; data?: Order[] };
        if (wrapped?.data && Array.isArray(wrapped.data)) {
          return wrapped.data;
        }
        // Return empty paginated response if no data
        return {
          orders: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        };
      },
      providesTags: (result) => {
        if (!result) return [{ type: "Order" as const, id: "LIST" }];
        const orders = Array.isArray(result)
          ? result
          : "orders" in result
            ? result.orders
            : [];
        return orders.length > 0
          ? [
              ...orders.map((order) => ({
                type: "Order" as const,
                id: order._id || order.id,
              })),
              { type: "Order" as const, id: "LIST" },
            ]
          : [{ type: "Order" as const, id: "LIST" }];
      },
    }),

    getOwnerOrders: build.query<
      PaginatedOrdersResponse | Order[],
      ListOrdersQuery | void
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.status) queryParams.append("status", params.status);
        if (params?.waiterId) queryParams.append("waiterId", params.waiterId);
        if (params?.cashierId)
          queryParams.append("cashierId", params.cashierId);
        if (params?.startDate)
          queryParams.append("startDate", params.startDate);
        if (params?.endDate) queryParams.append("endDate", params.endDate);
        if (params?.search) queryParams.append("search", params.search);
        if (params?.tableNumber)
          queryParams.append("tableNumber", params.tableNumber);
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());

        const qs = queryParams.toString();
        return {
          url: `/orders/owner${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      transformResponse: (
        response: unknown,
      ): PaginatedOrdersResponse | Order[] => {
        // Check if response is paginated (has orders and pagination fields)
        if (
          typeof response === "object" &&
          response !== null &&
          "orders" in response &&
          "pagination" in response
        ) {
          return response as PaginatedOrdersResponse;
        }
        // Check if response has data and pagination fields (alternative format)
        if (
          typeof response === "object" &&
          response !== null &&
          "data" in response &&
          "pagination" in response
        ) {
          const wrapped = response as {
            data: Order[];
            pagination: PaginationMeta;
          };
          return {
            orders: wrapped.data,
            pagination: wrapped.pagination,
          };
        }
        // API returns orders directly as array (not wrapped) - backward compatibility
        if (Array.isArray(response)) {
          return response;
        }
        // Handle case where API might wrap in { success: true, data: [...] }
        const wrapped = response as { success?: boolean; data?: Order[] };
        if (wrapped?.data && Array.isArray(wrapped.data)) {
          return wrapped.data;
        }
        // Return empty paginated response if no data
        return {
          orders: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        };
      },
      providesTags: (result) => {
        if (!result) return [{ type: "Order" as const, id: "LIST" }];
        const orders = Array.isArray(result)
          ? result
          : "orders" in result
            ? result.orders
            : [];
        return orders.length > 0
          ? [
              ...orders.map((order) => ({
                type: "Order" as const,
                id: order._id || order.id,
              })),
              { type: "Order" as const, id: "LIST" },
            ]
          : [{ type: "Order" as const, id: "LIST" }];
      },
    }),

    getOrder: build.query<Order, string>({
      query: (id) => ({
        url: `/orders/${id}`,
        method: "GET",
      }),
      transformResponse: (response: unknown): Order => {
        // API returns order directly
        return response as Order;
      },
      providesTags: (result, _error, id) => [{ type: "Order" as const, id }],
    }),

    createOrder: build.mutation<
      Order & { receiptText?: string },
      CreateOrderInput
    >({
      query: (body) => {
        // Generate clientId for offline sync idempotency
        const clientId = body.clientId || uuidv4();
        return {
          url: "/orders",
          method: "POST",
          body: {
            ...body,
            clientId,
          },
        };
      },
      transformResponse: (response: unknown): Order => {
        // API returns order directly
        return response as Order;
      },
      invalidatesTags: [{ type: "Order", id: "LIST" }],
    }),

    updateOrder: build.mutation<Order, { id: string; data: UpdateOrderInput }>({
      query: ({ id, data }) => {
        const updateData: Record<string, unknown> = {};
        if (data.items !== undefined) updateData.items = data.items;
        if (data.note !== undefined) updateData.note = data.note;
        if (data.tableNumber !== undefined)
          updateData.tableNumber = data.tableNumber;

        return {
          url: `/orders/${id}`,
          method: "PATCH",
          body: updateData,
        };
      },
      transformResponse: (response: unknown): Order => {
        // Backend commonly returns { success: true, data: order }
        if (response && typeof response === "object" && "data" in response) {
          const wrapped = response as OrderWrappedResponse;
          if (wrapped.data) return wrapped.data;
        }
        return response as Order;
      },
      invalidatesTags: (result, _error, { id }) => [
        { type: "Order", id },
        { type: "Order", id: "LIST" },
        { type: "Order", id: "CASHIER_LIST" },
      ],
    }),

    updateOrderStatus: build.mutation<
      Order,
      {
        id: string;
        status: OrderStatus;
        paymentMethod?: "cash" | "mobile_banking";
        paymentProofImage?: File;
        paymentBankName?: string;
      }
    >({
      query: ({
        id,
        status,
        paymentMethod,
        paymentProofImage,
        paymentBankName,
      }) => {
        // If payment proof image or bank name is provided, use FormData
        if (paymentProofImage || paymentBankName) {
          const formData = new FormData();
          formData.append("status", status);
          formData.append("paymentMethod", paymentMethod || "cash");
          if (paymentProofImage) {
            formData.append("paymentProofImage", paymentProofImage);
          }
          if (paymentBankName) {
            formData.append("paymentBankName", paymentBankName);
          }

          return {
            url: `/orders/${id}/status`,
            method: "PATCH",
            body: formData,
          };
        }

        // Otherwise use JSON
        return {
          url: `/orders/${id}/status`,
          method: "PATCH",
          body: {
            status,
            paymentMethod: paymentMethod || "cash",
          },
        };
      },
      transformResponse: (response: unknown): Order => {
        // API returns order directly
        return response as Order;
      },
      invalidatesTags: (result, _error, { id }) => [
        { type: "Order", id },
        { type: "Order", id: "LIST" },
      ],
    }),

    bulkUpdateOrderStatus: build.mutation<
      {
        success: boolean;
        updated: Array<Order & { receiptText?: string }>;
        failed: Array<{ id: string; reason: string }>;
        mergedReceiptText?: string;
        message: string;
      },
      { orderIds: string[]; status: OrderStatus }
    >({
      query: ({ orderIds, status }) => ({
        url: "/orders/bulk/status",
        method: "PATCH",
        body: { orderIds, status },
      }),
      transformResponse: (response: unknown) => {
        return response as {
          success: boolean;
          updated: Array<Order & { receiptText?: string }>;
          failed: Array<{ id: string; reason: string }>;
          mergedReceiptText?: string;
          message: string;
        };
      },
      invalidatesTags: (result, _error, { orderIds }) => [
        ...orderIds.map((id) => ({ type: "Order" as const, id })),
        { type: "Order", id: "LIST" },
      ],
    }),

    // Get orders by cashier
    getOrdersByCashier: build.query<
      Order[],
      {
        cashierId: string;
        status?: OrderStatus | OrderStatus[];
        waiterId?: string;
        startDate?: string;
        endDate?: string;
      }
    >({
      query: ({ cashierId, status, waiterId, startDate, endDate }) => {
        const queryParams = new URLSearchParams();
        if (status) {
          // Handle array of statuses - join with comma
          if (Array.isArray(status)) {
            queryParams.append("status", status.join(","));
          } else {
            queryParams.append("status", status);
          }
        }
        if (waiterId) queryParams.append("waiterId", waiterId);
        if (startDate) queryParams.append("startDate", startDate);
        if (endDate) queryParams.append("endDate", endDate);
        const qs = queryParams.toString();
        return {
          url: `/orders/cashier/${cashierId}${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      transformResponse: (response: unknown): Order[] => {
        if (Array.isArray(response)) {
          return response;
        }
        const wrapped = response as { success?: boolean; data?: Order[] };
        if (wrapped?.data && Array.isArray(wrapped.data)) {
          return wrapped.data;
        }
        return [];
      },
      providesTags: (result) => {
        if (!result || result.length === 0) {
          return [{ type: "Order" as const, id: "CASHIER_LIST" }];
        }
        return [
          ...result.map((order) => ({
            type: "Order" as const,
            id: order._id || order.id,
          })),
          { type: "Order" as const, id: "CASHIER_LIST" },
        ];
      },
    }),

    // Get cashier report
    getCashierReport: build.query<
      CashierReport,
      { cashierId: string; startDate?: string; endDate?: string }
    >({
      query: ({ cashierId, startDate, endDate }) => {
        const queryParams = new URLSearchParams();
        if (startDate) queryParams.append("startDate", startDate);
        if (endDate) queryParams.append("endDate", endDate);
        const qs = queryParams.toString();
        return {
          url: `/orders/reports/cashier/${cashierId}${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      transformResponse: (response: unknown): CashierReport => {
        return response as CashierReport;
      },
    }),

    // Get waiter report
    getWaiterReport: build.query<
      WaiterReport,
      { waiterId: string; startDate?: string; endDate?: string }
    >({
      query: ({ waiterId, startDate, endDate }) => {
        const queryParams = new URLSearchParams();
        if (startDate) queryParams.append("startDate", startDate);
        if (endDate) queryParams.append("endDate", endDate);
        const qs = queryParams.toString();
        return {
          url: `/orders/reports/waiter/${waiterId}${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      transformResponse: (response: unknown): WaiterReport => {
        return response as WaiterReport;
      },
    }),

    // Get date range report
    getDateRangeReport: build.query<
      DateRangeReport,
      { startDate: string; endDate: string }
    >({
      query: ({ startDate, endDate }) => {
        const queryParams = new URLSearchParams();
        queryParams.append("startDate", startDate);
        queryParams.append("endDate", endDate);
        return {
          url: `/orders/reports/date-range?${queryParams.toString()}`,
          method: "GET",
        };
      },
      transformResponse: (response: unknown): DateRangeReport => {
        return response as DateRangeReport;
      },
    }),
  }),
});

export const {
  useListOrdersQuery,
  useGetOwnerOrdersQuery,
  useGetOrderQuery,
  useCreateOrderMutation,
  useUpdateOrderMutation,
  useUpdateOrderStatusMutation,
  useBulkUpdateOrderStatusMutation,
  useGetOrdersByCashierQuery,
  useGetCashierReportQuery,
  useGetWaiterReportQuery,
  useGetDateRangeReportQuery,
} = ordersApi;
