import { createApiEndpoints } from "@/stores/baseApi";

export interface Table {
  _id: string;
  id?: string;
  tableNumber: string;
  clientId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TablesListQuery {
  search?: string;
}

export interface CreateTableInput {
  tableNumber: string;
  clientId?: string;
}

export interface UpdateTableInput {
  tableNumber?: string;
}

export const tablesApi = createApiEndpoints({
  endpoints: (build) => ({
    listTables: build.query<
      { success: boolean; data: Table[] },
      TablesListQuery | void
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.search) queryParams.append("search", params.search);

        const qs = queryParams.toString();
        return {
          url: `/tables${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      transformResponse: (
        response: unknown
      ): { success: boolean; data: Table[] } => {
        // API returns { success: true, data: Table[] }
        const apiResponse = response as {
          success: boolean;
          data: Table[];
        };
        return apiResponse;
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((t) => ({
                type: "Table" as const,
                id: t._id || t.id,
              })),
              { type: "Table" as const, id: "LIST" },
            ]
          : [{ type: "Table" as const, id: "LIST" }],
    }),

    getTableById: build.query<{ success: boolean; data: Table }, string>({
      query: (id) => ({
        url: `/tables/${id}`,
        method: "GET",
      }),
      providesTags: (result, _error, id) => [{ type: "Table" as const, id }],
    }),

    getTableByNumber: build.query<{ success: boolean; data: Table }, string>({
      query: (tableNumber) => ({
        url: `/tables/number/${tableNumber}`,
        method: "GET",
      }),
      providesTags: (result, _error, tableNumber) => [
        { type: "Table" as const, id: tableNumber },
      ],
    }),

    createTable: build.mutation<
      { success: boolean; data: Table },
      CreateTableInput
    >({
      query: (body) => ({
        url: "/tables",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Table", id: "LIST" }],
    }),

    updateTable: build.mutation<
      { success: boolean; data: Table },
      { id: string; data: UpdateTableInput }
    >({
      query: ({ id, data }) => ({
        url: `/tables/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (result, _error, { id }) => [
        { type: "Table", id },
        { type: "Table", id: "LIST" },
      ],
    }),

    deleteTable: build.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/tables/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, _error, id) => [
        { type: "Table", id },
        { type: "Table", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useListTablesQuery,
  useGetTableByIdQuery,
  useGetTableByNumberQuery,
  useCreateTableMutation,
  useUpdateTableMutation,
  useDeleteTableMutation,
} = tablesApi;
