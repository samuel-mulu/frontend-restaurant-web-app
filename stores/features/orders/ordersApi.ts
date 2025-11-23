import { createApiEndpoints } from "@/stores/baseApi";

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
}

export interface CreateOrderInput {
  tableNumber: string;
  items: {
    itemId: string;
    qty: number;
    nameSnapshot: string;
    priceSnapshot: number;
  }[];
  note?: string;
  waiterId: string;
  clientId?: string;
}

export interface ListOrdersQuery {
  status?: OrderStatus;
  waiterId?: string;
  cashierId?: string;
  startDate?: string;
  endDate?: string;
  search?: string; // Search by orderNumber, tableNumber, waiter name, cashier name
  tableNumber?: string;
}

export interface UpdateOrderStatusInput {
  status: OrderStatus;
}

export const ordersApi = createApiEndpoints({
  endpoints: (build) => ({
    listOrders: build.query<Order[], ListOrdersQuery | void>({
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

        const qs = queryParams.toString();
        return {
          url: `/orders${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      transformResponse: (response: unknown): Order[] => {
        // Backend returns orders directly as array (not wrapped)
        if (Array.isArray(response)) {
          return response;
        }
        // Handle case where backend might wrap in { success: true, data: [...] }
        const wrapped = response as { success?: boolean; data?: Order[] };
        if (wrapped?.data && Array.isArray(wrapped.data)) {
          return wrapped.data;
        }
        return [];
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map((order) => ({
                type: "Order" as const,
                id: order._id || order.id,
              })),
              { type: "Order" as const, id: "LIST" },
            ]
          : [{ type: "Order" as const, id: "LIST" }],
    }),

    getOrder: build.query<Order, string>({
      query: (id) => ({
        url: `/orders/${id}`,
        method: "GET",
      }),
      transformResponse: (response: unknown): Order => {
        // Backend returns order directly
        return response as Order;
      },
      providesTags: (result, _error, id) => [{ type: "Order" as const, id }],
    }),

    createOrder: build.mutation<Order, CreateOrderInput>({
      query: (body) => ({
        url: "/orders",
        method: "POST",
        body,
      }),
      transformResponse: (response: unknown): Order => {
        // Backend returns order directly
        return response as Order;
      },
      invalidatesTags: [{ type: "Order", id: "LIST" }],
    }),

    updateOrderStatus: build.mutation<
      Order,
      { id: string; status: OrderStatus }
    >({
      query: ({ id, status }) => ({
        url: `/orders/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      transformResponse: (response: unknown): Order => {
        // Backend returns order directly
        return response as Order;
      },
      invalidatesTags: (result, _error, { id }) => [
        { type: "Order", id },
        { type: "Order", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useListOrdersQuery,
  useGetOrderQuery,
  useCreateOrderMutation,
  useUpdateOrderStatusMutation,
} = ordersApi;
