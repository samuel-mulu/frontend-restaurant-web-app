import { createApiEndpoints } from "@/stores/baseApi";
import { Inventory } from "@/lib/types";

export interface InventoryCategory {
  _id?: string;
  id: string;
  name: string;
}

export interface InventoryResponse {
  _id?: string;
  id: string;
  name: string;
  description?: string;
  categoryId?: string | { id: string; name: string };
  category?: InventoryCategory;
  quantity: number;
  unit: string;
  minThreshold?: number;
  isLowStock?: boolean;
  stockStatus?: "low" | "normal";
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface InventoryListQuery {
  categoryId?: string;
  lowStock?: boolean;
}

export interface CreateInventoryInput {
  name: string;
  description?: string;
  categoryId?: string;
  quantity: number;
  unit: string;
  minThreshold?: number;
}

export interface UpdateInventoryInput {
  name?: string;
  description?: string;
  categoryId?: string;
  quantity?: number;
  unit?: string;
  minThreshold?: number;
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

  // Handle category - can be populated object, ID string, or undefined
  let categoryId = "";
  if (item.categoryId) {
    if (typeof item.categoryId === "object" && item.categoryId.id) {
      categoryId = item.categoryId.id;
    } else if (typeof item.categoryId === "object" && item.categoryId._id) {
      categoryId = item.categoryId._id.toString();
    } else if (typeof item.categoryId === "string") {
      categoryId = item.categoryId;
    }
  }

  // Also check category field (if populated differently)
  if (!categoryId && item.category) {
    categoryId = item.category.id || item.category._id?.toString() || "";
  }

  // Calculate low stock status if not provided
  const minThreshold = item.minThreshold ?? 0;
  const isLowStock =
    item.isLowStock !== undefined
      ? item.isLowStock
      : item.quantity <= minThreshold;

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
    category: categoryId,
    quantity: item.quantity,
    unit: item.unit,
    minThreshold,
    description: item.description,
    isLowStock,
    updatedAt,
  };
}

export const inventoryApi = createApiEndpoints({
  endpoints: (build) => ({
    listInventory: build.query<Inventory[], InventoryListQuery | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.categoryId)
          queryParams.append("categoryId", params.categoryId);
        if (params?.lowStock) queryParams.append("lowStock", "true");

        const qs = queryParams.toString();
        return {
          url: `/inventory${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
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
        return {
          url: "/inventory",
          method: "POST",
          body: {
            name: body.name,
            description: body.description,
            categoryId: body.categoryId || undefined,
            quantity: body.quantity,
            unit: body.unit,
            minThreshold: body.minThreshold,
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
        if (data.categoryId !== undefined)
          updateData.categoryId = data.categoryId || null;
        if (data.quantity !== undefined) updateData.quantity = data.quantity;
        if (data.unit !== undefined) updateData.unit = data.unit;
        if (data.minThreshold !== undefined)
          updateData.minThreshold = data.minThreshold;

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
  }),
});

export const {
  useListInventoryQuery,
  useGetInventoryByIdQuery,
  useGetLowStockInventoryQuery,
  useCreateInventoryMutation,
  useUpdateInventoryMutation,
} = inventoryApi;
