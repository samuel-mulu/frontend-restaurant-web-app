import { createApiEndpoints } from "@/stores/baseApi";
import { Category } from "@/lib/types";

export interface BackendCategory {
  _id?: string;
  id: string;
  name: string;
  clientId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCategoryInput {
  name: string;
  clientId?: string;
}

export interface UpdateCategoryInput {
  name?: string;
}

interface BackendResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Transform backend category to frontend format
 */
function transformCategory(backendCategory: BackendCategory): Category {
  return {
    id: backendCategory.id || backendCategory._id || "",
    name: backendCategory.name,
    products: 0, // Backend doesn't provide this
    updatedAt: backendCategory.updatedAt
      ? new Date(backendCategory.updatedAt).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
  };
}

export const categoriesApi = createApiEndpoints({
  endpoints: (build) => ({
    listCategories: build.query<Category[], void>({
      query: () => ({
        url: "/categories",
        method: "GET",
      }),
      transformResponse: (response: BackendResponse<BackendCategory[]>) => {
        return response.data.map(transformCategory);
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map((c) => ({
                type: "Category" as const,
                id: c.id,
              })),
              { type: "Category" as const, id: "LIST" },
            ]
          : [{ type: "Category" as const, id: "LIST" }],
    }),

    getCategoryById: build.query<Category, string>({
      query: (id) => ({
        url: `/categories/${id}`,
        method: "GET",
      }),
      transformResponse: (response: BackendResponse<BackendCategory>) => {
        return transformCategory(response.data);
      },
      providesTags: (result, _error, id) => [{ type: "Category" as const, id }],
    }),

    createCategory: build.mutation<Category, CreateCategoryInput>({
      query: (body) => ({
        url: "/categories",
        method: "POST",
        body,
      }),
      transformResponse: (response: BackendResponse<BackendCategory>) => {
        return transformCategory(response.data);
      },
      invalidatesTags: [{ type: "Category", id: "LIST" }],
    }),

    updateCategory: build.mutation<
      Category,
      { id: string; data: UpdateCategoryInput }
    >({
      query: ({ id, data }) => ({
        url: `/categories/${id}`,
        method: "PATCH",
        body: data,
      }),
      transformResponse: (response: BackendResponse<BackendCategory>) => {
        return transformCategory(response.data);
      },
      invalidatesTags: (result, _error, { id }) => [
        { type: "Category", id },
        { type: "Category", id: "LIST" },
      ],
    }),

    deleteCategory: build.mutation<void, string>({
      query: (id) => ({
        url: `/categories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, _error, id) => [
        { type: "Category", id },
        { type: "Category", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useListCategoriesQuery,
  useGetCategoryByIdQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoriesApi;
