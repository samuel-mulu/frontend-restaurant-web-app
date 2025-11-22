import { createApiEndpoints } from "@/stores/baseApi";

export interface ImageInfo {
  url?: string;
  publicId?: string;
}

export interface Category {
  _id: string;
  id: string;
  name: string;
}

export interface Item {
  _id: string;
  id: string;
  name: string;
  categoryId?: string;
  category?: Category;
  description?: string;
  price: number;
  image?: ImageInfo;
  isAvailable: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ItemsListQuery {
  categoryId?: string;
  includeDeleted?: boolean;
}

export interface CreateItemInput {
  name: string;
  categoryId: string;
  description?: string;
  price: number;
  isAvailable?: boolean;
}

export interface UpdateItemInput {
  name?: string;
  categoryId?: string;
  description?: string;
  price?: number;
  isAvailable?: boolean;
}

export interface UpdateAvailabilityInput {
  isAvailable: boolean;
}

export const itemsApi = createApiEndpoints({
  endpoints: (build) => ({
    listItems: build.query<
      { success: boolean; data: Item[] },
      ItemsListQuery | void
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.categoryId)
          queryParams.append("categoryId", params.categoryId);
        if (params?.includeDeleted)
          queryParams.append("includeDeleted", "true");

        const qs = queryParams.toString();
        return {
          url: `/items${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((i) => ({ type: "Item" as const, id: i._id })),
              { type: "Item" as const, id: "LIST" },
            ]
          : [{ type: "Item" as const, id: "LIST" }],
    }),

    getItemById: build.query<{ success: boolean; data: Item }, string>({
      query: (id) => ({
        url: `/items/${id}`,
        method: "GET",
      }),
      providesTags: (result, _error, id) => [{ type: "Item" as const, id }],
    }),

    getDeletedItems: build.query<{ success: boolean; data: Item[] }, void>({
      query: () => ({
        url: "/items/deleted",
        method: "GET",
      }),
      providesTags: [{ type: "Item", id: "DELETED" }],
    }),

    getUnavailableItems: build.query<{ success: boolean; data: Item[] }, void>({
      query: () => ({
        url: "/items/unavailable",
        method: "GET",
      }),
      providesTags: [{ type: "Item", id: "UNAVAILABLE" }],
    }),

    createItem: build.mutation<
      { success: boolean; message: string; data: Item },
      CreateItemInput
    >({
      query: (body) => ({
        url: "/items",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Item", id: "LIST" }],
    }),

    updateItem: build.mutation<
      { success: boolean; message: string; data: Item },
      { id: string; data: UpdateItemInput }
    >({
      query: ({ id, data }) => ({
        url: `/items/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (result, _error, { id }) => [
        { type: "Item", id },
        { type: "Item", id: "LIST" },
      ],
    }),

    deleteItem: build.mutation<
      { success: boolean; message: string; data: Item },
      string
    >({
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

    restoreItem: build.mutation<
      { success: boolean; message: string; data: Item },
      string
    >({
      query: (id) => ({
        url: `/items/${id}/restore`,
        method: "PATCH",
      }),
      invalidatesTags: (result, _error, id) => [
        { type: "Item", id },
        { type: "Item", id: "LIST" },
        { type: "Item", id: "DELETED" },
      ],
    }),

    permanentDeleteItem: build.mutation<
      { success: boolean; message: string },
      string
    >({
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
      { success: boolean; message: string; data: Item },
      { id: string; data: UpdateAvailabilityInput }
    >({
      query: ({ id, data }) => ({
        url: `/items/${id}/availability`,
        method: "PATCH",
        body: data,
      }),
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
