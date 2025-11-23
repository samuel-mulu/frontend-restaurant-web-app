import { createApiEndpoints } from "@/stores/baseApi";
import { Menu } from "@/lib/menu-store";

export interface ImageInfo {
  url?: string;
  publicId?: string;
}

export interface BackendCategory {
  _id?: string;
  id: string;
  name: string;
}

export interface BackendItem {
  _id?: string;
  id: string;
  name: string;
  categoryId?: string;
  category?: BackendCategory;
  description?: string;
  price: number;
  image?: ImageInfo;
  isAvailable: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface BackendResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ItemsListQuery {
  categoryId?: string;
  includeUnavailable?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateItemInput {
  name: string;
  categoryId: string;
  description?: string;
  price: number;
  isAvailable?: boolean;
  image?: File;
}

export interface UpdateItemInput {
  name?: string;
  categoryId?: string;
  description?: string;
  price?: number;
  isAvailable?: boolean;
  image?: File;
}

export interface UpdateAvailabilityInput {
  isAvailable: boolean;
}

/**
 * Transform backend item to frontend Menu format
 */
function transformItem(backendItem: BackendItem): Menu {
  const itemId = backendItem.id || backendItem._id || "";
  if (!itemId) {
    throw new Error("Item is missing an ID");
  }

  return {
    id: itemId,
    name: backendItem.name,
    category: backendItem.category?.id || backendItem.categoryId || "",
    price: backendItem.price,
    description: backendItem.description || "",
    imageUrl: backendItem.image?.url,
    available: backendItem.isAvailable,
    updatedAt: backendItem.updatedAt
      ? new Date(backendItem.updatedAt).toISOString().split("T")[0]
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
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());

        const qs = queryParams.toString();
        return {
          url: `/items${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      transformResponse: (response: BackendResponse<BackendItem[]>) => {
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
      transformResponse: (response: BackendResponse<BackendItem>) => {
        return transformItem(response.data);
      },
      providesTags: (result, _error, id) => [{ type: "Item" as const, id }],
    }),

    getDeletedItems: build.query<Menu[], void>({
      query: () => ({
        url: "/items/deleted",
        method: "GET",
      }),
      transformResponse: (response: BackendResponse<BackendItem[]>) => {
        return response.data.map(transformItem);
      },
      providesTags: [{ type: "Item", id: "DELETED" }],
    }),

    getUnavailableItems: build.query<Menu[], void>({
      query: () => ({
        url: "/items/unavailable",
        method: "GET",
      }),
      transformResponse: (response: BackendResponse<BackendItem[]>) => {
        return response.data.map(transformItem);
      },
      providesTags: [{ type: "Item", id: "UNAVAILABLE" }],
    }),

    createItem: build.mutation<Menu, CreateItemInput>({
      query: (body) => {
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
          formData.append("image", body.image);

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
          },
        };
      },
      transformResponse: (response: BackendResponse<BackendItem>) => {
        return transformItem(response.data);
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

        return {
          url: `/items/${id}`,
          method: "PATCH",
          body: updateData,
        };
      },
      transformResponse: (response: BackendResponse<BackendItem>) => {
        return transformItem(response.data);
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
      transformResponse: (response: BackendResponse<BackendItem>) => {
        return transformItem(response.data);
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
      transformResponse: (response: BackendResponse<BackendItem>) => {
        return transformItem(response.data);
      },
      invalidatesTags: (result, _error, { id }) => [
        { type: "Item", id },
        { type: "Item", id: "LIST" },
        { type: "Item", id: "UNAVAILABLE" },
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
} = itemsApi;
