import { createApiEndpoints } from "@/stores/baseApi";
import { v4 as uuidv4 } from "uuid";
import { Menu } from "@/lib/menu-store";

export interface ImageInfo {
  url?: string;
  publicId?: string;
}

export interface ItemCategory {
  _id?: string;
  id: string;
  name: string;
}

export interface ItemResponse {
  _id?: string;
  id: string;
  name: string;
  categoryId?: string;
  category?: ItemCategory;
  description?: string;
  price: number;
  image?: ImageInfo;
  isAvailable: boolean;
  approvalStatus?: "pendingapproval" | "approved" | "rejected";
  approvedBy?: string;
  approvedAt?: string;
  ingredients?: string[];
  mealType?: "breakfast" | "lunch" | "dinner" | "treats";
  // List of user comments for this item
  comments?: string[];
  special?: boolean;
  isFavorite?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ItemsListQuery {
  categoryId?: string;
  includeUnavailable?: boolean;
}

export interface CreateItemInput {
  name: string;
  categoryId: string;
  description?: string;
  price: number;
  isAvailable?: boolean;
  image?: File;
  ingredients?: string[];
  mealType?: "breakfast" | "lunch" | "dinner" | "treats";
  special?: boolean;
}

export interface UpdateItemInput {
  name?: string;
  categoryId?: string;
  description?: string;
  price?: number;
  isAvailable?: boolean;
  image?: File;
  ingredients?: string[];
  mealType?: "breakfast" | "lunch" | "dinner" | "treats";
  special?: boolean;
  isFavorite?: boolean;
}

export interface UpdateAvailabilityInput {
  isAvailable: boolean;
}

/**
 * Transform API item response to frontend Menu format
 */
function transformItem(item: ItemResponse): Menu {
  const itemId = item.id || item._id || "";
  if (!itemId) {
    throw new Error("Item is missing an ID");
  }

  return {
    id: itemId,
    name: item.name,
    category: item.category?.id || item.categoryId || "",
    price: item.price,
    description: item.description || "",
    imageUrl: item.image?.url,
    available: item.isAvailable,
    ingredients: item.ingredients,
    mealType: item.mealType,
    special: item.special,
    isFavorite: !!item.isFavorite,
    comments: item.comments || [],
    updatedAt: item.updatedAt
      ? new Date(item.updatedAt).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
  };
}

export const itemsApi = createApiEndpoints({
  endpoints: (build) => ({
    listItems: build.query<Menu[], ItemsListQuery | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.categoryId)
          queryParams.append("categoryId", params.categoryId);
        if (params?.includeUnavailable)
          queryParams.append("includeUnavailable", "true");

        const qs = queryParams.toString();
        return {
          url: `/items${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      keepUnusedDataFor: 300,
      transformResponse: (response: ApiResponse<ItemResponse[]>) => {
        // Handle both array and wrapped response
        const items = Array.isArray(response) ? response : response.data;
        return items.map(transformItem);
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map((i) => ({ type: "Item" as const, id: i.id })),
              { type: "Item" as const, id: "LIST" },
            ]
          : [{ type: "Item" as const, id: "LIST" }],
    }),

    getItemById: build.query<Menu, string>({
      query: (id) => ({
        url: `/items/${id}`,
        method: "GET",
      }),
      transformResponse: (
        response: ApiResponse<ItemResponse> | ItemResponse
      ) => {
        // Handle both wrapped API response and direct response (from offline adapter)
        const itemData =
          (response as ApiResponse<ItemResponse>).data ||
          (response as ItemResponse);
        return transformItem(itemData);
      },
      providesTags: (result, _error, id) => [{ type: "Item" as const, id }],
    }),

    getDeletedItems: build.query<Menu[], void>({
      query: () => ({
        url: "/items/deleted",
        method: "GET",
      }),
      transformResponse: (response: ApiResponse<ItemResponse[]>) => {
        return response.data.map(transformItem);
      },
      providesTags: [{ type: "Item", id: "DELETED" }],
    }),

    getUnavailableItems: build.query<Menu[], void>({
      query: () => ({
        url: "/items/unavailable",
        method: "GET",
      }),
      transformResponse: (response: ApiResponse<ItemResponse[]>) => {
        return response.data.map(transformItem);
      },
      providesTags: [{ type: "Item", id: "UNAVAILABLE" }],
    }),

    createItem: build.mutation<Menu, CreateItemInput>({
      query: (body) => {
        // Generate clientId for offline sync idempotency
        const clientId = (body as any).clientId || uuidv4();

        // If image is provided, use FormData
        if (body.image) {
          const formData = new FormData();
          formData.append("categoryId", body.categoryId);
          formData.append("name", body.name);
          if (body.description) {
            formData.append("description", body.description);
          }
          formData.append("price", body.price.toString());
          formData.append(
            "isAvailable",
            (body.isAvailable !== undefined
              ? body.isAvailable
              : true
            ).toString()
          );
          if (body.ingredients && body.ingredients.length > 0) {
            body.ingredients.forEach((ingredient) => {
              formData.append("ingredients[]", ingredient);
            });
          }
          if (body.mealType) {
            formData.append("mealType", body.mealType);
          }
          if (body.special !== undefined) {
            formData.append("special", body.special.toString());
          }
          formData.append("image", body.image);
          formData.append("clientId", clientId);

          return {
            url: "/items",
            method: "POST",
            body: formData,
          };
        }

        // Otherwise use JSON
        return {
          url: "/items",
          method: "POST",
          body: {
            categoryId: body.categoryId,
            name: body.name,
            description: body.description,
            price: body.price,
            isAvailable:
              body.isAvailable !== undefined ? body.isAvailable : true,
            ingredients: body.ingredients,
            mealType: body.mealType,
            special: body.special,
            clientId,
          },
        };
      },
      transformResponse: (
        response: ApiResponse<ItemResponse> | ItemResponse
      ) => {
        // Handle both wrapped API response and direct response (from offline adapter)
        const itemData =
          (response as ApiResponse<ItemResponse>).data ||
          (response as ItemResponse);
        return transformItem(itemData);
      },
      invalidatesTags: [{ type: "Item", id: "LIST" }],
    }),

    updateItem: build.mutation<Menu, { id: string; data: UpdateItemInput }>({
      query: ({ id, data }) => {
        // If image is provided, use FormData
        if (data.image) {
          const formData = new FormData();
          if (data.categoryId !== undefined) {
            formData.append("categoryId", data.categoryId);
          }
          if (data.name !== undefined) {
            formData.append("name", data.name);
          }
          if (data.description !== undefined) {
            formData.append("description", data.description);
          }
          if (data.price !== undefined) {
            formData.append("price", data.price.toString());
          }
          if (data.isAvailable !== undefined) {
            formData.append("isAvailable", data.isAvailable.toString());
          }
          if (data.ingredients !== undefined) {
            if (data.ingredients.length > 0) {
              data.ingredients.forEach((ingredient) => {
                formData.append("ingredients[]", ingredient);
              });
            } else {
              // Send empty array by appending empty string
              formData.append("ingredients[]", "");
            }
          }
          if (data.mealType !== undefined) {
            formData.append("mealType", data.mealType);
          }
          if (data.special !== undefined) {
            formData.append("special", data.special.toString());
          }
          if (data.isFavorite !== undefined) {
            formData.append("isFavorite", data.isFavorite.toString());
          }
          formData.append("image", data.image);

          return {
            url: `/items/${id}`,
            method: "PATCH",
            body: formData,
          };
        }

        // Otherwise use JSON
        const updateData: Record<string, unknown> = {};
        if (data.categoryId !== undefined)
          updateData.categoryId = data.categoryId;
        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined)
          updateData.description = data.description;
        if (data.price !== undefined) updateData.price = data.price;
        if (data.isAvailable !== undefined)
          updateData.isAvailable = data.isAvailable;
        if (data.ingredients !== undefined)
          updateData.ingredients = data.ingredients;
        if (data.mealType !== undefined) updateData.mealType = data.mealType;
        if (data.special !== undefined) updateData.special = data.special;
        if (data.isFavorite !== undefined)
          updateData.isFavorite = data.isFavorite;

        return {
          url: `/items/${id}`,
          method: "PATCH",
          body: updateData,
        };
      },
      transformResponse: (
        response: ApiResponse<ItemResponse> | ItemResponse
      ) => {
        // Handle both wrapped API response and direct response (from offline adapter)
        const itemData =
          (response as ApiResponse<ItemResponse>).data ||
          (response as ItemResponse);
        return transformItem(itemData);
      },
      invalidatesTags: (result, _error, { id }) => [
        { type: "Item", id },
        { type: "Item", id: "LIST" },
      ],
    }),

    deleteItem: build.mutation<void, string>({
      query: (id) => ({
        url: `/items/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, _error, id) => [
        { type: "Item", id },
        { type: "Item", id: "LIST" },
        { type: "Item", id: "DELETED" },
      ],
    }),

    restoreItem: build.mutation<Menu, string>({
      query: (id) => ({
        url: `/items/${id}/restore`,
        method: "PATCH",
      }),
      transformResponse: (
        response: ApiResponse<ItemResponse> | ItemResponse
      ) => {
        // Handle both wrapped API response and direct response (from offline adapter)
        const itemData =
          (response as ApiResponse<ItemResponse>).data ||
          (response as ItemResponse);
        if (!itemData) {
          throw new Error("Invalid response: item data is missing");
        }
        return transformItem(itemData);
      },
      invalidatesTags: (result, _error, id) => [
        { type: "Item", id },
        { type: "Item", id: "LIST" },
        { type: "Item", id: "DELETED" },
      ],
    }),

    permanentDeleteItem: build.mutation<void, string>({
      query: (id) => ({
        url: `/items/${id}/permanent`,
        method: "DELETE",
      }),
      invalidatesTags: (result, _error, id) => [
        { type: "Item", id },
        { type: "Item", id: "LIST" },
        { type: "Item", id: "DELETED" },
      ],
    }),

    updateItemAvailability: build.mutation<
      Menu,
      { id: string; data: UpdateAvailabilityInput }
    >({
      query: ({ id, data }) => ({
        url: `/items/${id}/availability`,
        method: "PATCH",
        body: data,
      }),
      transformResponse: (
        response: ApiResponse<ItemResponse> | ItemResponse
      ) => {
        // Handle both wrapped API response and direct response (from offline adapter)
        const itemData =
          (response as ApiResponse<ItemResponse>).data ||
          (response as ItemResponse);
        if (!itemData) {
          throw new Error("Invalid response: item data is missing");
        }
        return transformItem(itemData);
      },
      invalidatesTags: (result, _error, { id }) => [
        { type: "Item", id },
        { type: "Item", id: "LIST" },
        { type: "Item", id: "UNAVAILABLE" },
      ],
    }),

    listPendingApprovals: build.query<ItemResponse[], void>({
      query: () => ({
        url: "/items/pending-approvals",
        method: "GET",
      }),
      transformResponse: (response: any) => {
        // Handle different response formats
        if (Array.isArray(response)) {
          return response;
        }
        if (response && typeof response === "object") {
          // Handle wrapped response: { success: true, data: [...] }
          if (response.data !== undefined) {
            const data = Array.isArray(response.data) ? response.data : [];
            return data;
          }
        }
        // Fallback: return empty array if response format is unexpected
        return [];
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map((i) => ({ type: "Item" as const, id: i.id })),
              { type: "Item" as const, id: "PENDING_APPROVALS" },
            ]
          : [{ type: "Item" as const, id: "PENDING_APPROVALS" }],
    }),

    approveItem: build.mutation<ItemResponse, string>({
      query: (id) => ({
        url: `/items/${id}/approve`,
        method: "PATCH",
      }),
      transformResponse: (
        response: ApiResponse<ItemResponse> | ItemResponse
      ) => {
        const itemData =
          (response as ApiResponse<ItemResponse>).data ||
          (response as ItemResponse);
        if (!itemData) {
          throw new Error("Invalid response: item data is missing");
        }
        return itemData;
      },
      invalidatesTags: (result, _error, id) => [
        { type: "Item", id },
        { type: "Item", id: "LIST" },
        { type: "Item", id: "PENDING_APPROVALS" },
      ],
    }),

    rejectItem: build.mutation<ItemResponse, string>({
      query: (id) => ({
        url: `/items/${id}/reject`,
        method: "PATCH",
      }),
      transformResponse: (
        response: ApiResponse<ItemResponse> | ItemResponse
      ) => {
        const itemData =
          (response as ApiResponse<ItemResponse>).data ||
          (response as ItemResponse);
        if (!itemData) {
          throw new Error("Invalid response: item data is missing");
        }
        return itemData;
      },
      invalidatesTags: (result, _error, id) => [
        { type: "Item", id },
        { type: "Item", id: "LIST" },
        { type: "Item", id: "PENDING_APPROVALS" },
      ],
    }),
  }),
});

export const {
  useListItemsQuery,
  useGetItemByIdQuery,
  useGetDeletedItemsQuery,
  useGetUnavailableItemsQuery,
  useCreateItemMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,
  useRestoreItemMutation,
  usePermanentDeleteItemMutation,
  useUpdateItemAvailabilityMutation,
  useListPendingApprovalsQuery,
  useApproveItemMutation,
  useRejectItemMutation,
} = itemsApi;
