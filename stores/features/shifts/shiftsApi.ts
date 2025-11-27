import { createApiEndpoints } from "@/stores/baseApi";

export interface Shift {
  _id: string;
  id?: string;
  staffId:
    | string
    | {
        _id: string;
        id?: string;
        name: string;
        email?: string;
        role: string;
      };
  startTime: string;
  endTime?: string;
  status: "active" | "completed";
  ordersHandled: string[] | any[];
  revenue: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShiftListResponse {
  shifts: Shift[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ShiftListQuery {
  staffId?: string;
  status?: "active" | "completed";
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CreateShiftInput {
  staffId: string;
  notes?: string;
  clientId?: string; // For offline sync idempotency
}

export interface UpdateShiftInput {
  endTime?: string; // ISO date string
  notes?: string;
}

export interface ShiftRevenueResponse {
  success: boolean;
  data: {
    revenue: number;
  };
}

export const shiftsApi = createApiEndpoints({
  endpoints: (build) => ({
    listShifts: build.query<ShiftListResponse, ShiftListQuery | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.staffId) queryParams.append("staffId", params.staffId);
        if (params?.status) queryParams.append("status", params.status);
        if (params?.startDate) queryParams.append("startDate", params.startDate);
        if (params?.endDate) queryParams.append("endDate", params.endDate);
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());

        const qs = queryParams.toString();
        return {
          url: `/shifts${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      transformResponse: (response: unknown): ShiftListResponse => {
        const apiResponse = response as {
          success: boolean;
          data: ShiftListResponse;
        };
        return apiResponse.data;
      },
      providesTags: (result) =>
        result?.shifts
          ? [
              ...result.shifts.map((s) => ({
                type: "Shift" as const,
                id: s._id || s.id,
              })),
              { type: "Shift" as const, id: "LIST" },
            ]
          : [{ type: "Shift" as const, id: "LIST" }],
    }),

    getShiftById: build.query<{ success: boolean; data: Shift }, string>({
      query: (id) => ({
        url: `/shifts/${id}`,
        method: "GET",
      }),
      transformResponse: (response: unknown) => {
        const apiResponse = response as {
          success: boolean;
          data: Shift;
        };
        return apiResponse;
      },
      providesTags: (result, _error, id) => [{ type: "Shift" as const, id }],
    }),

    getActiveShift: build.query<
      { success: boolean; data: Shift | null },
      string | void
    >({
      query: (staffId) => {
        if (staffId) {
          return {
            url: `/shifts/active/${staffId}`,
            method: "GET",
          };
        }
        return {
          url: "/shifts/active",
          method: "GET",
        };
      },
      transformResponse: (response: unknown) => {
        const apiResponse = response as {
          success: boolean;
          data: Shift | null;
        };
        return apiResponse;
      },
      providesTags: (result, _error, staffId) => [
        { type: "Shift" as const, id: `ACTIVE_${staffId || "CURRENT"}` },
      ],
    }),

    getShiftHistory: build.query<
      { success: boolean; data: Shift[] },
      string
    >({
      query: (staffId) => ({
        url: `/shifts/history/${staffId}`,
        method: "GET",
      }),
      transformResponse: (response: unknown) => {
        const apiResponse = response as {
          success: boolean;
          data: Shift[];
        };
        return apiResponse;
      },
      providesTags: (result, _error, staffId) => [
        { type: "Shift" as const, id: `HISTORY_${staffId}` },
      ],
    }),

    startShift: build.mutation<
      { success: boolean; message: string; data: Shift },
      CreateShiftInput
    >({
      query: (body) => ({
        url: "/shifts/start",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Shift", id: "LIST" },
        (result, _error, _arg) => [
          { type: "Shift", id: `ACTIVE_${result?.data?.staffId || "CURRENT"}` },
        ],
      ],
    }),

    endShift: build.mutation<
      { success: boolean; message: string; data: Shift },
      { id: string; data?: UpdateShiftInput }
    >({
      query: ({ id, data }) => ({
        url: `/shifts/${id}/end`,
        method: "POST",
        body: data || {},
      }),
      invalidatesTags: (result, _error, { id }) => [
        { type: "Shift", id },
        { type: "Shift", id: "LIST" },
        (result) => [
          {
            type: "Shift",
            id: `ACTIVE_${typeof result?.data?.staffId === "object" ? result.data.staffId._id : result?.data?.staffId || "CURRENT"}`,
          },
        ],
      ],
    }),

    getShiftRevenue: build.query<ShiftRevenueResponse, string>({
      query: (id) => ({
        url: `/shifts/${id}/revenue`,
        method: "GET",
      }),
      transformResponse: (response: unknown) => {
        const apiResponse = response as ShiftRevenueResponse;
        return apiResponse;
      },
      providesTags: (result, _error, id) => [
        { type: "Shift" as const, id: `REVENUE_${id}` },
      ],
    }),
  }),
});

export const {
  useListShiftsQuery,
  useGetShiftByIdQuery,
  useGetActiveShiftQuery,
  useGetShiftHistoryQuery,
  useStartShiftMutation,
  useEndShiftMutation,
  useGetShiftRevenueQuery,
} = shiftsApi;

