import { createApiEndpoints } from "@/stores/baseApi";
import {
  Order,
  OrderStatus,
  PaginationMeta,
} from "@/stores/features/orders/ordersApi";
import {
  CountdownResponse,
  Payment,
  Salary,
  Withdrawal,
} from "@/stores/features/salary/salaryApi";

export interface WaiterSummary {
  waiterId: string;
  waiterName: string;
  totalOrders: number;
  totalAmount: number;
  averageOrderValue: number;
  byStatus: Partial<Record<OrderStatus, { count: number; total: number }>>;
}

export interface WaiterOrdersResponse {
  orders: Order[];
  pagination: PaginationMeta;
}

export interface WaiterSalaryResponse {
  salary: Salary | null;
  month: string;
  year: number;
}

export interface WaiterListQuery {
  startDate?: string;
  endDate?: string;
  status?: OrderStatus | "ALL";
  search?: string;
  page?: number;
  limit?: number;
}

const appendListParams = (
  queryParams: URLSearchParams,
  params?: WaiterListQuery,
) => {
  if (params?.startDate) queryParams.append("startDate", params.startDate);
  if (params?.endDate) queryParams.append("endDate", params.endDate);
  if (params?.status && params.status !== "ALL") {
    queryParams.append("status", params.status);
  }
  if (params?.search?.trim()) queryParams.append("search", params.search.trim());
  if (params?.page) queryParams.append("page", String(params.page));
  if (params?.limit) queryParams.append("limit", String(params.limit));
};

const normalizeOrder = (order: Order): Order => ({
  ...order,
  id: order.id || order._id || "",
});

export const waiterApi = createApiEndpoints({
  endpoints: (build) => ({
    getWaiterSummary: build.query<WaiterSummary, WaiterListQuery | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        appendListParams(queryParams, params || undefined);
        const qs = queryParams.toString();
        return {
          url: `/waiter/me/summary${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      transformResponse: (response: unknown): WaiterSummary => {
        const wrapped = response as { success?: boolean; data?: WaiterSummary };
        const data = wrapped?.data ?? (response as WaiterSummary);
        return {
          waiterId: data?.waiterId ?? "",
          waiterName: data?.waiterName ?? "",
          totalOrders: data?.totalOrders ?? 0,
          totalAmount: data?.totalAmount ?? 0,
          averageOrderValue: data?.averageOrderValue ?? 0,
          byStatus: data?.byStatus ?? {},
        };
      },
      providesTags: [{ type: "Order", id: "WAITER_ME" }],
    }),

    getWaiterOrders: build.query<WaiterOrdersResponse, WaiterListQuery | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        appendListParams(queryParams, params || undefined);
        const qs = queryParams.toString();
        return {
          url: `/waiter/me/orders${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      transformResponse: (response: unknown): WaiterOrdersResponse => {
        const wrapped = response as {
          data?: Order[];
          totalCount?: number;
          totalPages?: number;
          currentPage?: number;
        };
        const orders = (wrapped?.data ?? []).map(normalizeOrder);
        const total = wrapped?.totalCount ?? orders.length;
        const totalPages = wrapped?.totalPages ?? 1;
        const page = wrapped?.currentPage ?? 1;
        const limit = totalPages > 0 ? Math.max(1, Math.ceil(total / totalPages)) : 20;
        return {
          orders,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
        };
      },
      providesTags: (result) => {
        if (!result || result.orders.length === 0) {
          return [{ type: "Order" as const, id: "WAITER_ME" }];
        }
        return [
          ...result.orders.map((order) => ({
            type: "Order" as const,
            id: order._id || order.id,
          })),
          { type: "Order" as const, id: "WAITER_ME" },
        ];
      },
    }),

    getWaiterSalary: build.query<
      WaiterSalaryResponse,
      { month?: number; year?: number } | void
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.month) queryParams.append("month", String(params.month));
        if (params?.year) queryParams.append("year", String(params.year));
        const qs = queryParams.toString();
        return {
          url: `/waiter/me/salary${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      transformResponse: (response: unknown): WaiterSalaryResponse => {
        const wrapped = response as {
          success?: boolean;
          data?: WaiterSalaryResponse;
        };
        const data = wrapped?.data;
        return {
          salary: data?.salary ?? null,
          month: data?.month ?? "",
          year: data?.year ?? new Date().getFullYear(),
        };
      },
      providesTags: (result) =>
        result?.salary
          ? [
              { type: "Salary" as const, id: result.salary._id || result.salary.id },
              { type: "Salary" as const, id: "WAITER_ME" },
            ]
          : [{ type: "Salary" as const, id: "WAITER_ME" }],
    }),

    getWaiterCountdown: build.query<CountdownResponse | null, string>({
      query: (salaryId) => ({
        url: `/waiter/me/salary/${salaryId}/countdown`,
        method: "GET",
      }),
      transformResponse: (response: unknown): CountdownResponse | null => {
        const wrapped = response as {
          success?: boolean;
          data?: CountdownResponse;
        };
        return wrapped?.data ?? null;
      },
      providesTags: (_result, _error, salaryId) => [
        { type: "Salary" as const, id: salaryId },
      ],
    }),

    getWaiterWithdrawals: build.query<Withdrawal[], string>({
      query: (salaryId) => ({
        url: `/waiter/me/salary/${salaryId}/withdrawals`,
        method: "GET",
      }),
      transformResponse: (response: unknown): Withdrawal[] => {
        const wrapped = response as { success?: boolean; data?: Withdrawal[] };
        return (wrapped?.data ?? []).map((w) => ({
          ...w,
          id: w.id || w._id || "",
        }));
      },
      providesTags: (_result, _error, salaryId) => [
        { type: "Withdrawal" as const, id: `WAITER_${salaryId}` },
      ],
    }),

    getWaiterPayments: build.query<Payment[], string>({
      query: (salaryId) => ({
        url: `/waiter/me/salary/${salaryId}/payments`,
        method: "GET",
      }),
      transformResponse: (response: unknown): Payment[] => {
        const wrapped = response as { success?: boolean; data?: Payment[] };
        return (wrapped?.data ?? []).map((p) => ({
          ...p,
          id: p.id || p._id || "",
        }));
      },
      providesTags: (_result, _error, salaryId) => [
        { type: "Payment" as const, id: `WAITER_${salaryId}` },
      ],
    }),
  }),
});

export const {
  useGetWaiterSummaryQuery,
  useGetWaiterOrdersQuery,
  useGetWaiterSalaryQuery,
  useGetWaiterCountdownQuery,
  useGetWaiterWithdrawalsQuery,
  useGetWaiterPaymentsQuery,
} = waiterApi;
