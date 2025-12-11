import { createApiEndpoints } from "@/stores/baseApi";

export interface DateRange {
  startDate?: string;
  endDate?: string;
}

export interface ComprehensiveAnalytics {
  cashFlow: CashFlowAnalytics;
  inventory: InventoryAnalytics;
  menu: MenuAnalytics;
  orders: OrderAnalytics;
  summary: SummaryStats;
}

export interface CashFlowAnalytics {
  revenueTrend: Array<{ date: string; total: number; count: number }>;
  paymentMethodBreakdown: Array<{
    method: string;
    total: number;
    count: number;
  }>;
  revenueComparison: {
    today: number;
    yesterday: number;
    thisWeek: number;
    lastWeek: number;
    thisMonth: number;
    lastMonth: number;
  };
}

export interface InventoryAnalytics {
  topSelling: Array<{
    inventoryId: string;
    inventoryName: string;
    quantity: number;
    value: number;
  }>;
  lowStockItems: Array<{
    inventoryId: string;
    inventoryName: string;
    quantity: number;
    unit: string;
  }>;
  inventoryValue: number;
  totalItems: number;
}

export interface MenuAnalytics {
  topSellingItems: Array<{
    itemId: string;
    itemName: string;
    totalQty: number;
    revenue: number;
  }>;
  revenueByCategory: Array<{
    categoryId: string;
    categoryName: string;
    revenue: number;
    itemCount: number;
  }>;
  itemPerformance: Array<{
    itemId: string;
    itemName: string;
    date: string;
    qty: number;
    revenue: number;
  }>;
}

export interface OrderAnalytics {
  orderVolumeTrend: Array<{ date: string; count: number; total: number }>;
  averageOrderValue: number;
  ordersByStatus: {
    OPEN: number;
    VOIDED: number;
    PAID_TO_CASHIER: number;
    TRANSFERRED_TO_OWNER: number;
    OWNER_CONFIRMED: number;
    DISPUTED: number;
  };
  peakHours: Array<{ hour: number; count: number }>;
}

export interface SummaryStats {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  lowStockItemsCount: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const statisticsApi = createApiEndpoints({
  endpoints: (build) => ({
    getComprehensiveAnalytics: build.query<
      ComprehensiveAnalytics,
      DateRange | void
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.startDate) queryParams.append("startDate", params.startDate);
        if (params?.endDate) queryParams.append("endDate", params.endDate);

        const qs = queryParams.toString();
        return {
          url: `/statistics/comprehensive${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      transformResponse: (response: ApiResponse<ComprehensiveAnalytics>) => {
        return response.data;
      },
    }),

    getCashFlowAnalytics: build.query<CashFlowAnalytics, DateRange | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.startDate) queryParams.append("startDate", params.startDate);
        if (params?.endDate) queryParams.append("endDate", params.endDate);

        const qs = queryParams.toString();
        return {
          url: `/statistics/sales${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      transformResponse: (response: ApiResponse<CashFlowAnalytics>) => {
        return response.data;
      },
    }),

    getInventoryAnalytics: build.query<InventoryAnalytics, DateRange | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.startDate) queryParams.append("startDate", params.startDate);
        if (params?.endDate) queryParams.append("endDate", params.endDate);

        const qs = queryParams.toString();
        return {
          url: `/statistics/inventory${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      transformResponse: (response: ApiResponse<InventoryAnalytics>) => {
        return response.data;
      },
    }),

    getMenuAnalytics: build.query<MenuAnalytics, DateRange | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.startDate) queryParams.append("startDate", params.startDate);
        if (params?.endDate) queryParams.append("endDate", params.endDate);

        const qs = queryParams.toString();
        return {
          url: `/statistics/products${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      transformResponse: (response: ApiResponse<MenuAnalytics>) => {
        return response.data;
      },
    }),
  }),
});

export const {
  useGetComprehensiveAnalyticsQuery,
  useGetCashFlowAnalyticsQuery,
  useGetInventoryAnalyticsQuery,
  useGetMenuAnalyticsQuery,
} = statisticsApi;

