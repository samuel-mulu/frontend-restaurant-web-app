import { Inventory } from "@/lib/types";
import { createApiEndpoints } from "@/stores/baseApi";
import { v4 as uuidv4 } from "uuid";

export interface InventoryResponse {
  _id?: string;
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  price: number;
  isLowStock?: boolean;
  stockStatus?: "low" | "normal";
  approvalStatus?: "pendingapproval" | "approved" | "rejected";
  approvedBy?: string;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface InventoryListQuery {
  lowStock?: boolean;
}

export interface CreateInventoryInput {
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  price: number;
}

export interface UpdateInventoryInput {
  name?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  price?: number;
}

/**
 * Transform API inventory response to frontend Inventory format
 */
function transformInventory(item: any): Inventory {
  // Handle both _id (MongoDB) and id (virtual or transformed)
  const itemId = item.id || item._id?.toString() || "";
  if (!itemId) {
    throw new Error("Inventory item is missing an ID");
  }

  // Calculate low stock status if not provided (quantity <= 0)
  const isLowStock =
    item.isLowStock !== undefined
      ? item.isLowStock
      : item.quantity <= 0;

  // Format updatedAt date
  let updatedAt = "";
  if (item.updatedAt) {
    const date = new Date(item.updatedAt);
    updatedAt = date.toISOString().split("T")[0];
  } else {
    updatedAt = new Date().toISOString().split("T")[0];
  }

  return {
    id: itemId,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    price: item.price ?? 0, // Fallback for migration period only
    description: item.description,
    isLowStock,
    approvalStatus: item.approvalStatus,
    updatedAt,
  };
}

export const inventoryApi = createApiEndpoints({
  endpoints: (build) => ({
    listInventory: build.query<Inventory[], InventoryListQuery | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.lowStock) queryParams.append("lowStock", "true");

        const qs = queryParams.toString();
        return {
          url: `/inventory${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      keepUnusedDataFor: 300,
      transformResponse: (
        response: ApiResponse<InventoryResponse[]> | InventoryResponse[]
      ) => {
        // Handle both array and wrapped response
        const items = Array.isArray(response)
          ? response
          : (response as ApiResponse<InventoryResponse[]>).data || [];
        return items.map(transformInventory);
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map((i) => ({ type: "Inventory" as const, id: i.id })),
              { type: "Inventory" as const, id: "LIST" },
            ]
          : [{ type: "Inventory" as const, id: "LIST" }],
    }),

    getInventoryById: build.query<Inventory, string>({
      query: (id) => ({
        url: `/inventory/${id}`,
        method: "GET",
      }),
      transformResponse: (response: ApiResponse<InventoryResponse>) => {
        return transformInventory(response.data);
      },
      providesTags: (result, _error, id) => [
        { type: "Inventory" as const, id },
      ],
    }),

    getLowStockInventory: build.query<Inventory[], void>({
      query: () => ({
        url: "/inventory/low-stock",
        method: "GET",
      }),
      transformResponse: (
        response: ApiResponse<InventoryResponse[]> | InventoryResponse[]
      ) => {
        const items = Array.isArray(response)
          ? response
          : (response as ApiResponse<InventoryResponse[]>).data || [];
        return items.map(transformInventory);
      },
      providesTags: [{ type: "Inventory", id: "LOW_STOCK" }],
    }),

    createInventory: build.mutation<Inventory, CreateInventoryInput>({
      query: (body) => {
        // Generate clientId for offline sync idempotency
        const clientId = (body as any).clientId || uuidv4();
        return {
          url: "/inventory",
          method: "POST",
          body: {
            name: body.name,
            description: body.description,
            quantity: body.quantity,
            unit: body.unit,
            price: body.price,
            clientId,
          },
        };
      },
      transformResponse: (response: ApiResponse<InventoryResponse>) => {
        return transformInventory(response.data);
      },
      invalidatesTags: [{ type: "Inventory", id: "LIST" }],
    }),

    updateInventory: build.mutation<
      Inventory,
      { id: string; data: UpdateInventoryInput }
    >({
      query: ({ id, data }) => {
        const updateData: Record<string, unknown> = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined)
          updateData.description = data.description;
        if (data.quantity !== undefined) updateData.quantity = data.quantity;
        if (data.unit !== undefined) updateData.unit = data.unit;
        if (data.price !== undefined) updateData.price = data.price;

        return {
          url: `/inventory/${id}`,
          method: "PATCH",
          body: updateData,
        };
      },
      transformResponse: (response: ApiResponse<InventoryResponse>) => {
        return transformInventory(response.data);
      },
      invalidatesTags: (result, _error, { id }) => [
        { type: "Inventory", id },
        { type: "Inventory", id: "LIST" },
        { type: "Inventory", id: "LOW_STOCK" },
      ],
    }),

    listPendingApprovals: build.query<InventoryResponse[], void>({
      query: () => ({
        url: "/inventory/pending-approvals",
        method: "GET",
      }),
      transformResponse: (response: any) => {
        // Handle different response formats
        // Backend returns: { success: true, data: [...], message: "..." }
        // RTK Query's fetchBaseQuery returns the response as-is from response.json()
        if (Array.isArray(response)) {
          return response;
        }
        if (response && typeof response === "object") {
          // Handle wrapped response: { success: true, data: [...] }
          if (response.data !== undefined) {
            return Array.isArray(response.data) ? response.data : [];
          }
        }
        // Fallback: return empty array if response format is unexpected
        console.warn("Unexpected response format for pending approvals:", response);
        return [];
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map((i) => ({
                type: "Inventory" as const,
                id: i.id,
              })),
              { type: "Inventory" as const, id: "PENDING_APPROVALS" },
            ]
          : [{ type: "Inventory" as const, id: "PENDING_APPROVALS" }],
    }),

    approveInventory: build.mutation<InventoryResponse, string>({
      query: (id) => ({
        url: `/inventory/${id}/approve`,
        method: "PATCH",
      }),
      transformResponse: (
        response: ApiResponse<InventoryResponse> | InventoryResponse
      ) => {
        const itemData =
          (response as ApiResponse<InventoryResponse>).data ||
          (response as InventoryResponse);
        if (!itemData) {
          throw new Error("Invalid response: inventory data is missing");
        }
        return itemData;
      },
      invalidatesTags: (result, _error, id) => [
        { type: "Inventory", id },
        { type: "Inventory", id: "LIST" },
        { type: "Inventory", id: "PENDING_APPROVALS" },
      ],
    }),

    rejectInventory: build.mutation<InventoryResponse, string>({
      query: (id) => ({
        url: `/inventory/${id}/reject`,
        method: "PATCH",
      }),
      transformResponse: (
        response: ApiResponse<InventoryResponse> | InventoryResponse
      ) => {
        const itemData =
          (response as ApiResponse<InventoryResponse>).data ||
          (response as InventoryResponse);
        if (!itemData) {
          throw new Error("Invalid response: inventory data is missing");
        }
        return itemData;
      },
      invalidatesTags: (result, _error, id) => [
        { type: "Inventory", id },
        { type: "Inventory", id: "LIST" },
        { type: "Inventory", id: "PENDING_APPROVALS" },
      ],
    }),

    deleteInventory: build.mutation<{ success: boolean; id: string }, string>({
      query: (id) => ({
        url: `/inventory/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, _error, id) => [
        { type: "Inventory", id },
        { type: "Inventory", id: "LIST" },
        { type: "Inventory", id: "LOW_STOCK" },
        { type: "Inventory", id: "PENDING_APPROVALS" },
      ],
    }),
  }),
});

export const {
  useListInventoryQuery,
  useGetInventoryByIdQuery,
  useGetLowStockInventoryQuery,
  useCreateInventoryMutation,
  useUpdateInventoryMutation,
  useListPendingApprovalsQuery,
  useApproveInventoryMutation,
  useRejectInventoryMutation,
  useDeleteInventoryMutation,
} = inventoryApi;
