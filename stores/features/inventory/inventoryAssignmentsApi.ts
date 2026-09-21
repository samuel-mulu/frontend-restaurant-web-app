import { createApiEndpoints } from "@/stores/baseApi";

export interface InventoryAssignment {
  id: string;
  inventoryId:
    | string
    | {
        id?: string;
        _id?: string;
        name?: string;
        unit?: string;
        price?: number;
        quantity?: number;
        isBarman?: boolean;
      };
  barmanId:
    | string
    | {
        id?: string;
        _id?: string;
        name?: string;
        phone?: string;
        role?: string;
      };
  assignedBy:
    | string
    | {
        id?: string;
        _id?: string;
        name?: string;
        phone?: string;
        role?: string;
      };
  assignedQuantity: number;
  approvedQuantity?: number;
  remainingQuantity: number;
  status: "pending" | "approved" | "rejected";
  approvedAt?: string;
  rejectedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ListAssignmentsQuery {
  status?: "pending" | "approved" | "rejected";
  inventoryId?: string;
  barmanId?: string;
}

export interface AssignInventoryInput {
  inventoryId: string;
  barmanId: string;
  assignedQuantity: number;
}

export interface ApproveAssignmentInput {
  id: string;
  approvedQuantity: number;
}

export interface BarmanDailySummaryRow {
  barmanId: string;
  barmanName: string;
  inventoryId: string;
  inventoryName: string;
  unit: string;
  /** Approved on selected date */
  approved: number;
  /** Sold on selected date */
  sold: number;
  /** Current left from approved (not warehouse) */
  remaining: number;
  /** Reserved in open unpaid orders (today only) */
  reserved?: number;
}

export interface BarmanApprovalByDate {
  date: string;
  approved: number;
}

export interface BarmanApprovalHistoryRow {
  id: string;
  date: string;
  barmanId: string;
  barmanName: string;
  inventoryId: string;
  inventoryName: string;
  unit: string;
  approved: number;
  assignedById: string;
  assignedByName: string;
}

export interface BarmanDailySummaryResponse {
  date: string;
  items: BarmanDailySummaryRow[];
  approvalsByDate?: BarmanApprovalByDate[];
  approvalHistory?: BarmanApprovalHistoryRow[];
}

export interface DailySummaryQuery {
  date: string;
  barmanId?: string;
}

function transformAssignment(item: any): InventoryAssignment {
  return {
    ...item,
    id: item.id || item._id?.toString() || "",
  };
}

export const inventoryAssignmentsApi = createApiEndpoints({
  endpoints: (build) => ({
    listInventoryAssignments: build.query<
      InventoryAssignment[],
      ListAssignmentsQuery | void
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.status) queryParams.append("status", params.status);
        if (params?.inventoryId)
          queryParams.append("inventoryId", params.inventoryId);
        if (params?.barmanId) queryParams.append("barmanId", params.barmanId);
        const qs = queryParams.toString();
        return {
          url: `/inventory-assignments${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      transformResponse: (
        response: ApiResponse<InventoryAssignment[]> | InventoryAssignment[]
      ) => {
        const items = Array.isArray(response)
          ? response
          : response.data || [];
        return items.map(transformAssignment);
      },
      providesTags: [{ type: "InventoryAssignment" as const, id: "LIST" }],
    }),

    assignInventory: build.mutation<InventoryAssignment, AssignInventoryInput>({
      query: ({ inventoryId, barmanId, assignedQuantity }) => ({
        url: `/inventory/${inventoryId}/assign`,
        method: "POST",
        body: { barmanId, assignedQuantity },
      }),
      transformResponse: (response: ApiResponse<InventoryAssignment>) =>
        transformAssignment(response.data),
      invalidatesTags: [
        { type: "InventoryAssignment" as const, id: "LIST" },
        { type: "InventoryAssignment" as const, id: "DAILY" },
        { type: "Inventory" as const, id: "LIST" },
      ],
    }),

    approveInventoryAssignment: build.mutation<
      InventoryAssignment,
      ApproveAssignmentInput
    >({
      query: ({ id, approvedQuantity }) => ({
        url: `/inventory-assignments/${id}/approve`,
        method: "PATCH",
        body: { approvedQuantity },
      }),
      transformResponse: (response: ApiResponse<InventoryAssignment>) =>
        transformAssignment(response.data),
      invalidatesTags: [
        { type: "InventoryAssignment" as const, id: "LIST" },
        { type: "InventoryAssignment" as const, id: "DAILY" },
        { type: "Inventory" as const, id: "LIST" },
      ],
    }),

    getBarmanDailySummary: build.query<
      BarmanDailySummaryResponse,
      DailySummaryQuery
    >({
      query: ({ date, barmanId }) => {
        const queryParams = new URLSearchParams();
        queryParams.append("date", date);
        if (barmanId) queryParams.append("barmanId", barmanId);
        return {
          url: `/inventory-assignments/daily-summary?${queryParams.toString()}`,
          method: "GET",
        };
      },
      transformResponse: (
        response:
          | ApiResponse<BarmanDailySummaryResponse>
          | BarmanDailySummaryResponse
      ) => {
        if ("data" in response && response.data) return response.data;
        return response as BarmanDailySummaryResponse;
      },
      providesTags: [{ type: "InventoryAssignment" as const, id: "DAILY" }],
    }),

    rejectInventoryAssignment: build.mutation<InventoryAssignment, string>({
      query: (id) => ({
        url: `/inventory-assignments/${id}/reject`,
        method: "PATCH",
      }),
      transformResponse: (response: ApiResponse<InventoryAssignment>) =>
        transformAssignment(response.data),
      invalidatesTags: [
        { type: "InventoryAssignment" as const, id: "LIST" },
        { type: "InventoryAssignment" as const, id: "DAILY" },
        { type: "Inventory" as const, id: "LIST" },
      ],
    }),
  }),
});

export const {
  useListInventoryAssignmentsQuery,
  useGetBarmanDailySummaryQuery,
  useAssignInventoryMutation,
  useApproveInventoryAssignmentMutation,
  useRejectInventoryAssignmentMutation,
} = inventoryAssignmentsApi;
