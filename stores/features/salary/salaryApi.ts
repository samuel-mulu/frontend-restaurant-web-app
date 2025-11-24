import { createApiEndpoints } from "@/stores/baseApi";

export interface Salary {
  _id: string;
  id?: string;
  staffId:
    | string
    | {
        _id: string;
        id?: string;
        name: string;
        email?: string;
        phone?: string;
        role: string;
      };
  amount: number;
  month: string; // YYYY-MM format
  year: number;
  paymentDate: string;
  status: "pending" | "paid";
  remarks?: string;
  createdBy:
    | string
    | {
        _id: string;
        id?: string;
        name: string;
        email?: string;
      };
  createdAt?: string;
  updatedAt?: string;
}

export interface SalaryListResponse {
  salaries: Salary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface SalaryListQuery {
  staffId?: string;
  month?: string; // YYYY-MM format
  year?: number;
  status?: "pending" | "paid";
  page?: number;
  limit?: number;
}

export interface CreateSalaryInput {
  staffId: string;
  amount: number;
  month: string; // YYYY-MM format
  year: number;
  paymentDate: string; // ISO date string
  status?: "pending" | "paid";
  remarks?: string;
  clientId?: string; // For offline sync idempotency
}

export interface UpdateSalaryInput {
  amount?: number;
  status?: "pending" | "paid";
  paymentDate?: string; // ISO date string
  remarks?: string;
}

export interface SalarySummaryResponse {
  summary: Array<{
    staffId: string;
    staffName: string;
    staffEmail?: string;
    staffPhone?: string;
    totalAmount: number;
    count: number;
    paidCount: number;
    pendingCount: number;
  }>;
  totals: {
    totalAmount: number;
    totalCount: number;
    totalPaid: number;
    totalPending: number;
  };
}

export const salaryApi = createApiEndpoints({
  endpoints: (build) => ({
    listSalaries: build.query<SalaryListResponse, SalaryListQuery | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.staffId) queryParams.append("staffId", params.staffId);
        if (params?.month) queryParams.append("month", params.month);
        if (params?.year) queryParams.append("year", params.year.toString());
        if (params?.status) queryParams.append("status", params.status);
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());

        const qs = queryParams.toString();
        return {
          url: `/salary${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      transformResponse: (response: unknown): SalaryListResponse => {
        // API returns { success: true, data: { salaries: [], pagination: {...} } }
        const apiResponse = response as {
          success: boolean;
          data: SalaryListResponse;
        };
        return apiResponse.data;
      },
      providesTags: (result) =>
        result?.salaries
          ? [
              ...result.salaries.map((s) => ({
                type: "Salary" as const,
                id: s._id || s.id,
              })),
              { type: "Salary" as const, id: "LIST" },
            ]
          : [{ type: "Salary" as const, id: "LIST" }],
    }),

    getSalaryById: build.query<{ success: boolean; data: Salary }, string>({
      query: (id) => ({
        url: `/salary/${id}`,
        method: "GET",
      }),
      transformResponse: (response: unknown) => {
        const apiResponse = response as {
          success: boolean;
          data: Salary;
        };
        return apiResponse;
      },
      providesTags: (result, _error, id) => [{ type: "Salary" as const, id }],
    }),

    createSalary: build.mutation<
      { success: boolean; message: string; data: Salary },
      CreateSalaryInput
    >({
      query: (body) => ({
        url: "/salary",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Salary", id: "LIST" }],
    }),

    updateSalary: build.mutation<
      { success: boolean; message: string; data: Salary },
      { id: string; data: UpdateSalaryInput }
    >({
      query: ({ id, data }) => ({
        url: `/salary/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (result, _error, { id }) => [
        { type: "Salary", id },
        { type: "Salary", id: "LIST" },
      ],
    }),

    getSalarySummary: build.query<
      { success: boolean; data: SalarySummaryResponse },
      { month?: string; year?: number }
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.month) queryParams.append("month", params.month);
        if (params?.year) queryParams.append("year", params.year.toString());

        const qs = queryParams.toString();
        return {
          url: `/salary/summary${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      transformResponse: (response: unknown) => {
        const apiResponse = response as {
          success: boolean;
          data: SalarySummaryResponse;
        };
        return apiResponse;
      },
    }),

    getStaffSalaryHistory: build.query<
      { success: boolean; data: Salary[] },
      string
    >({
      query: (staffId) => ({
        url: `/salary/staff/${staffId}`,
        method: "GET",
      }),
      transformResponse: (response: unknown) => {
        const apiResponse = response as {
          success: boolean;
          data: Salary[];
        };
        return apiResponse;
      },
      providesTags: (result, _error, staffId) => [
        { type: "Salary" as const, id: `STAFF_${staffId}` },
      ],
    }),
  }),
});

export const {
  useListSalariesQuery,
  useGetSalaryByIdQuery,
  useCreateSalaryMutation,
  useUpdateSalaryMutation,
  useGetSalarySummaryQuery,
  useGetStaffSalaryHistoryQuery,
} = salaryApi;
