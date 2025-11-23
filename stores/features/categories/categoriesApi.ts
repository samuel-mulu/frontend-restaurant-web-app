import { createApiEndpoints } from "@/stores/baseApi";
import { Category } from "@/lib/types";

export interface CategoryResponse {
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

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Transform API category response to frontend format
 */
function transformCategory(category: CategoryResponse): Category {
  return {
    id: category.id || category._id || "",
    name: category.name,
    products: 0, // API doesn't provide this
    updatedAt: category.updatedAt
      ? new Date(category.updatedAt).toISOString().split("T")[0]
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
      transformResponse: (response: ApiResponse<CategoryResponse[]>) => {
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
      transformResponse: (response: ApiResponse<CategoryResponse>) => {
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
      transformResponse: (response: ApiResponse<CategoryResponse>) => {
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
      transformResponse: (response: ApiResponse<CategoryResponse>) => {
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
