import { createApiEndpoints } from "@/stores/baseApi";

export interface Category {
  _id: string;
  id?: string;
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

export const categoriesApi = createApiEndpoints({
  endpoints: (build) => ({
    listCategories: build.query<{ success: boolean; data: Category[] }, void>({
      query: () => ({
        url: "/categories",
        method: "GET",
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((c) => ({
                type: "Category" as const,
                id: c._id,
              })),
              { type: "Category" as const, id: "LIST" },
            ]
          : [{ type: "Category" as const, id: "LIST" }],
    }),

    getCategoryById: build.query<{ success: boolean; data: Category }, string>({
      query: (id) => ({
        url: `/categories/${id}`,
        method: "GET",
      }),
      providesTags: (result, _error, id) => [{ type: "Category" as const, id }],
    }),

    createCategory: build.mutation<
      { success: boolean; data: Category },
      CreateCategoryInput
    >({
      query: (body) => ({
        url: "/categories",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Category", id: "LIST" }],
    }),

    updateCategory: build.mutation<
      { success: boolean; data: Category },
      { id: string; data: UpdateCategoryInput }
    >({
      query: ({ id, data }) => ({
        url: `/categories/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (result, _error, { id }) => [
        { type: "Category", id },
        { type: "Category", id: "LIST" },
      ],
    }),

    deleteCategory: build.mutation<
      { success: boolean; message: string; data: Category },
      string
    >({
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
