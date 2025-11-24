import { createApiEndpoints } from "@/stores/baseApi";

export interface Staff {
  _id: string;
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  role: "cashier" | "waiter" | "staff";
  salary: number;
  status?: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffListResponse {
  staff: Staff[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface StaffListQuery {
  role?: "cashier" | "waiter" | "staff";
  status?: "active" | "inactive";
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateStaffInput {
  name: string;
  email?: string;
  password?: string;
  phone?: string;
  role: "cashier" | "waiter" | "staff";
  salary: number;
}

export interface UpdateStaffInput {
  name?: string;
  email?: string;
  phone?: string;
  role?: "cashier" | "waiter" | "staff";
  salary?: number;
  status?: "active" | "inactive";
}

export const staffApi = createApiEndpoints({
  endpoints: (build) => ({
    listStaff: build.query<StaffListResponse, StaffListQuery | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.role) queryParams.append("role", params.role);
        if (params?.status) queryParams.append("status", params.status);
        if (params?.search) queryParams.append("search", params.search);
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());

        const qs = queryParams.toString();
        return {
          url: `/staff${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      transformResponse: (response: unknown): StaffListResponse => {
        // API returns { success: true, data: { staff: [], pagination: {...} } }
        const apiResponse = response as {
          success: boolean;
          data: StaffListResponse;
        };
        return apiResponse.data;
      },
      providesTags: (result) =>
        result?.staff
          ? [
              ...result.staff.map((s) => ({
                type: "Staff" as const,
                id: s._id,
              })),
              { type: "Staff" as const, id: "LIST" },
            ]
          : [{ type: "Staff" as const, id: "LIST" }],
    }),

    getStaffById: build.query<{ success: boolean; data: Staff }, string>({
      query: (id) => ({
        url: `/staff/${id}`,
        method: "GET",
      }),
      providesTags: (result, _error, id) => [{ type: "Staff" as const, id }],
    }),

    createStaff: build.mutation<
      { success: boolean; message: string; data: Staff },
      CreateStaffInput
    >({
      query: (body) => ({
        url: "/staff",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Staff", id: "LIST" }],
    }),

    updateStaff: build.mutation<
      { success: boolean; message: string; data: Staff },
      { id: string; data: UpdateStaffInput }
    >({
      query: ({ id, data }) => ({
        url: `/staff/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (result, _error, { id }) => [
        { type: "Staff", id },
        { type: "Staff", id: "LIST" },
      ],
    }),

    deleteStaff: build.mutation<
      {
        success: boolean;
        message: string;
        data: { id: string; status: string };
      },
      string
    >({
      query: (id) => ({
        url: `/staff/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, _error, id) => [
        { type: "Staff", id },
        { type: "Staff", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useListStaffQuery,
  useGetStaffByIdQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
} = staffApi;
