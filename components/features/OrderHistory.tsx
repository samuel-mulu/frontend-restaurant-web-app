"use client";

import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { selectUser } from "@/stores/features/auth/authSlice";
import {
  OrderStatus,
  Order as RTKOrder,
  useBulkUpdateOrderStatusMutation,
  useListOrdersQuery,
  useUpdateOrderStatusMutation,
} from "@/stores/features/orders/ordersApi";
import { useListStaffQuery } from "@/stores/features/staff/staffApi";
import {
  AlertCircle,
  ArrowRightLeft,
  Ban,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Search,
  ShieldCheck,
  Square,
  X,
  XCircle,
} from "lucide-react";
import { formatDateLocal } from "@/lib/date-utils";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

// -------------------- Types & Utilities -------------------- //

interface DisplayOrder {
  id: string;
  orderNumber: string;
  tableNumber: string;
  customer: string;
  totalPrice: number;
  status: "Completed" | "Pending";
  date: string;
  waiterId?: string;
  waiterName?: string;
  cashierId?: string;
  cashierName?: string;
  backendStatus: OrderStatus;
  paymentMethod?: "cash" | "mobile_banking";
}

const formatDate = (date: string): string => {
  try {
    const d = new Date(date);
    return formatDateLocal(d);
  } catch {
    return date.includes(" ") ? date.split(" ")[0] : date.split("T")[0];
  }
};

/**
 * Map backend status to frontend display status
 * Backend: OPEN, VOIDED, PAID_TO_CASHIER, TRANSFERRED_TO_OWNER, OWNER_CONFIRMED, DISPUTED
 * Frontend: Pending, Completed
 */
const normalizeStatus = (status: OrderStatus): "Completed" | "Pending" => {
  // Completed statuses
  if (
    status === "OWNER_CONFIRMED" ||
    status === "PAID_TO_CASHIER" ||
    status === "TRANSFERRED_TO_OWNER"
  ) {
    return "Completed";
  }
  // Pending statuses
  return "Pending";
};

const getStatusColor = (status: "Completed" | "Pending"): string => {
  return {
    Completed:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
    Pending:
      "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  }[status];
};

const getStatusBadgeText = (
  status: OrderStatus,
  paymentMethod?: "cash" | "mobile_banking",
): string => {
  const statusMap: Record<OrderStatus, string> = {
    OPEN: "Open",
    VOIDED: "Voided",
    PAID_TO_CASHIER: "Paid to Waiter",
    TRANSFERRED_TO_OWNER: "Paid to Cashier",
    OWNER_CONFIRMED: "Confirmed",
    DISPUTED: "Disputed",
  };
  let label = statusMap[status] || status;
  if (status === "TRANSFERRED_TO_OWNER" && paymentMethod) {
    label += ` (${paymentMethod === "mobile_banking" ? "Mobile Banking" : "Cash"})`;
  }
  return label;
};

const getStatusIcon = (status: OrderStatus) => {
  const iconMap: Record<OrderStatus, React.ReactNode> = {
    OPEN: <AlertCircle className="h-4 w-4" />,
    VOIDED: <Ban className="h-4 w-4" />,
    PAID_TO_CASHIER: <CheckCircle2 className="h-4 w-4" />,
    TRANSFERRED_TO_OWNER: <ArrowRightLeft className="h-4 w-4" />,
    OWNER_CONFIRMED: <ShieldCheck className="h-4 w-4" />,
    DISPUTED: <XCircle className="h-4 w-4" />,
  };
  return iconMap[status] || <AlertCircle className="h-4 w-4" />;
};

/**
 * Transform backend order to display format
 */
function transformOrder(order: RTKOrder): DisplayOrder {
  const waiterId =
    typeof order.waiterId === "string"
      ? order.waiterId
      : order.waiterId?._id || order.waiterId?.id || "";
  const waiterName =
    typeof order.waiterId === "object" && order.waiterId?.name
      ? order.waiterId.name
      : "";

  const cashierId =
    typeof order.cashierId === "string"
      ? order.cashierId
      : order.cashierId?._id || order.cashierId?.id || "";
  const cashierName =
    typeof order.cashierId === "object" && order.cashierId?.name
      ? order.cashierId.name
      : "";

  return {
    id: order.id || order._id || "",
    orderNumber: order.orderNumber,
    tableNumber: order.tableNumber,
    customer: `Table ${order.tableNumber}`,
    totalPrice: order.totalAmount,
    status: normalizeStatus(order.status),
    date: order.placedAt || order.createdAt,
    waiterId,
    waiterName,
    cashierId,
    cashierName,
    backendStatus: order.status,
    paymentMethod: order.paymentMethod,
  };
}

const extractDates = (orders: DisplayOrder[]): string[] =>
  [...new Set(orders.map((o) => formatDate(o.date)))].sort().reverse();

// -------------------- Main Component -------------------- //
export function OrderHistory() {
  const user = useSelector(selectUser);
  const userRole = user?.role || "waiter";

  const [roleView, setRoleView] = useState<"waiter" | "owner" | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [waiterFilter, setWaiterFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(
    new Set(),
  );
  const [bulkStatusChange, setBulkStatusChange] = useState<OrderStatus | "">(
    "",
  );
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);

  // Reset page to 1 when filters change
  // This is necessary to ensure users start from page 1 when applying new filters
  const filterKey = useMemo(
    () => `${statusFilter}-${searchQuery}-${waiterFilter}-${roleView}`,
    [statusFilter, searchQuery, waiterFilter, roleView],
  );

  // Note: Setting state in useEffect here is intentional - we need to reset pagination
  // when filters change. This is a common pattern for paginated lists with filters.
  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  // Build query based on role
  const queryParams = useMemo(() => {
    const params: {
      status?: OrderStatus;
      waiterId?: string;
      cashierId?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      tableNumber?: string;
      page?: number;
      limit?: number;
    } = {
      page,
      limit,
    };

    // Apply role-based filtering for cash flow tracking
    if (roleView === "all") {
      // Show all orders - no role filtering (unless waiterFilter is set)
      // waiterFilter will be applied below if set
    } else if (roleView === "waiter") {
      // Show orders with OPEN status - cash to be accepted from waiters
      params.status = "OPEN";
      // waiterFilter will be applied below if set to filter by specific waiter
    } else if (roleView === "owner") {
      // Show orders with PAID_TO_CASHIER status - cash about to give to owner
      params.status = "PAID_TO_CASHIER";
    }

    // Apply waiter filter if set
    if (waiterFilter !== "all") {
      params.waiterId = waiterFilter;
    }

    // Apply status filter (only if roleView is "all", otherwise status is set by roleView)
    if (statusFilter !== "all" && roleView === "all") {
      // Map frontend filter to backend status
      const statusMap: Record<string, OrderStatus> = {
        OPEN: "OPEN",
        PAID_TO_CASHIER: "PAID_TO_CASHIER",
        TRANSFERRED_TO_OWNER: "TRANSFERRED_TO_OWNER",
        OWNER_CONFIRMED: "OWNER_CONFIRMED",
        VOIDED: "VOIDED",
        DISPUTED: "DISPUTED",
      };
      if (statusMap[statusFilter]) {
        params.status = statusMap[statusFilter];
      }
    }

    // Apply search
    if (searchQuery.trim()) {
      params.search = searchQuery.trim();
    }

    return params;
  }, [statusFilter, searchQuery, waiterFilter, roleView, page, limit]);

  const {
    data: ordersResponse,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useListOrdersQuery(queryParams);

  const [updateOrderStatus, { isLoading: isUpdating }] =
    useUpdateOrderStatusMutation();
  const [bulkUpdateOrderStatus, { isLoading: isBulkUpdating }] =
    useBulkUpdateOrderStatusMutation();

  // Handle paginated or non-paginated response
  const ordersData = useMemo(() => {
    if (!ordersResponse) return [];
    if (Array.isArray(ordersResponse)) {
      return ordersResponse;
    }
    if ("orders" in ordersResponse) {
      return ordersResponse.orders;
    }
    return [];
  }, [ordersResponse]);

  const pagination = useMemo(() => {
    if (!ordersResponse || Array.isArray(ordersResponse)) {
      return null;
    }
    if ("pagination" in ordersResponse) {
      return ordersResponse.pagination;
    }
    return null;
  }, [ordersResponse]);

  // Transform orders to display format
  const orders = useMemo(() => ordersData.map(transformOrder), [ordersData]);

  // Filter orders based on UI filters (client-side filtering for additional refinement)
  const filtered = useMemo(() => {
    return orders.filter((o: DisplayOrder) => {
      // Status filter - backend already filters by status, but we refine here for "Completed" which has multiple statuses
      if (statusFilter !== "all") {
        if (statusFilter === "OPEN" && o.backendStatus !== "OPEN") return false;
        if (
          statusFilter === "PAID_TO_CASHIER" &&
          o.backendStatus !== "PAID_TO_CASHIER"
        )
          return false;
        if (
          statusFilter === "TRANSFERRED_TO_OWNER" &&
          o.backendStatus !== "TRANSFERRED_TO_OWNER"
        )
          return false;
        if (
          statusFilter === "OWNER_CONFIRMED" &&
          o.backendStatus !== "OWNER_CONFIRMED"
        )
          return false;
        if (statusFilter === "VOIDED" && o.backendStatus !== "VOIDED")
          return false;
        if (statusFilter === "DISPUTED" && o.backendStatus !== "DISPUTED")
          return false;
      }

      // Waiter filter (if not already filtered by backend)
      if (waiterFilter !== "all" && o.waiterId !== waiterFilter) return false;

      // Date filter
      if (dateFilter !== "all" && formatDate(o.date) !== dateFilter)
        return false;

      // Role-based filtering
      // Waiter view: show only OPEN orders (cash to be accepted from waiters)
      if (roleView === "waiter" && o.backendStatus !== "OPEN") return false;
      // Owner view: show only PAID_TO_CASHIER orders (cash to give to owner)
      if (roleView === "owner" && o.backendStatus !== "PAID_TO_CASHIER")
        return false;

      return true;
    });
  }, [orders, roleView, statusFilter, waiterFilter, dateFilter]);

  const summary = useMemo(() => {
    const totals = filtered.reduce(
      (acc: { Completed: number; Pending: number }, o: DisplayOrder) => {
        acc[o.status] += o.totalPrice || 0;
        return acc;
      },
      { Completed: 0, Pending: 0 },
    );

    const avg = filtered.length > 0 ? totals.Completed / filtered.length : 0;
    return {
      count: filtered.length,
      completedTotal: totals.Completed,
      pendingTotal: totals.Pending,
      avgTicket: avg,
    };
  }, [filtered]);

  // Get the common status of selected orders
  const selectedOrdersStatus = useMemo(() => {
    if (selectedOrderIds.size === 0) return null;
    const selectedOrders = filtered.filter((o: DisplayOrder) =>
      selectedOrderIds.has(o.id),
    );
    if (selectedOrders.length === 0) return null;
    const firstStatus = selectedOrders[0].backendStatus;
    // Check if all selected orders have the same status
    const allSameStatus = selectedOrders.every(
      (o: DisplayOrder) => o.backendStatus === firstStatus,
    );
    return allSameStatus ? firstStatus : null;
  }, [selectedOrderIds, filtered]);

  const toggleSelect = (id: string, orderStatus: OrderStatus) => {
    // Prevent selecting orders with terminal statuses (TRANSFERRED_TO_OWNER, VOIDED)
    if (
      orderStatus === "TRANSFERRED_TO_OWNER" ||
      orderStatus === "VOIDED" ||
      orderStatus === "OWNER_CONFIRMED"
    ) {
      toast.error(
        `Orders with ${getStatusBadgeText(
          orderStatus,
        )} status cannot be changed`,
      );
      return;
    }

    setSelectedOrderIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) {
        s.delete(id);
        // Clear bulk status change if no orders selected
        if (s.size === 0) {
          setBulkStatusChange("");
        }
      } else {
        // If there are already selected orders, check if they have the same status
        if (s.size > 0) {
          const selectedOrders = filtered.filter((o: DisplayOrder) =>
            s.has(o.id),
          );
          if (selectedOrders.length > 0) {
            const firstStatus = selectedOrders[0].backendStatus;
            if (firstStatus !== orderStatus) {
              toast.error(
                "You can only select orders with the same status. Please clear selection first.",
              );
              return prev;
            }
          }
        }
        s.add(id);
      }
      return s;
    });
  };

  const selectAll = () => {
    // Only select orders with the same status as the first order
    // Exclude terminal statuses (TRANSFERRED_TO_OWNER, VOIDED, OWNER_CONFIRMED)
    if (filtered.length === 0) return;
    const firstStatus = filtered[0].backendStatus;

    // Don't select if first order has terminal status
    if (
      firstStatus === "TRANSFERRED_TO_OWNER" ||
      firstStatus === "VOIDED" ||
      firstStatus === "OWNER_CONFIRMED"
    ) {
      toast.error(
        `Cannot select orders with ${getStatusBadgeText(firstStatus)} status`,
      );
      return;
    }

    const sameStatusOrders = filtered.filter(
      (o: DisplayOrder) =>
        o.backendStatus === firstStatus &&
        o.backendStatus !== "TRANSFERRED_TO_OWNER" &&
        o.backendStatus !== "VOIDED" &&
        o.backendStatus !== "OWNER_CONFIRMED",
    );
    setSelectedOrderIds(
      new Set(sameStatusOrders.map((o: DisplayOrder) => o.id)),
    );
  };

  const clearSelection = () => {
    setSelectedOrderIds(new Set());
    setBulkStatusChange("");
  };

  const handleBulkStatusChange = async () => {
    if (!selectedOrderIds.size) {
      toast.error("No orders selected");
      return;
    }
    if (!bulkStatusChange) {
      toast.error("Please select a status to change to");
      return;
    }
    if (!selectedOrdersStatus) {
      toast.error("Selected orders must have the same status");
      return;
    }

    const ids = Array.from(selectedOrderIds);

    try {
      const result = await bulkUpdateOrderStatus({
        orderIds: ids,
        status: bulkStatusChange,
      }).unwrap();

      if (result.failed && result.failed.length > 0) {
        toast.warning(
          `Updated ${result.updated.length} order(s), ${result.failed.length} failed`,
        );
      } else {
        toast.success(`Successfully updated ${result.updated.length} order(s)`);
      }
      clearSelection();
      refetch();
    } catch (err: unknown) {
      const error = err as {
        data?: { message?: string };
        message?: string;
      };
      toast.error(
        error?.data?.message || error?.message || "Failed to update orders",
      );
    }
  };

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    try {
      await updateOrderStatus({ id: orderId, status }).unwrap();
      toast.success("Order status updated successfully");
      refetch();
    } catch (err: unknown) {
      const error = err as {
        data?: { message?: string };
        message?: string;
      };
      toast.error(
        error?.data?.message ||
          error?.message ||
          "Failed to update order status",
      );
    }
  };

  const getAvailableStatuses = (
    currentStatus: OrderStatus,
    userRole: string,
  ): OrderStatus[] => {
    // Define valid status transitions based on role
    // TRANSFERRED_TO_OWNER and VOIDED are terminal states - cannot be changed
    const transitions: Record<OrderStatus, OrderStatus[]> = {
      OPEN: ["VOIDED", "PAID_TO_CASHIER"],
      VOIDED: [], // Terminal state - cannot be changed
      PAID_TO_CASHIER:
        userRole === "cashier" || userRole === "owner"
          ? ["TRANSFERRED_TO_OWNER", "DISPUTED"]
          : [],
      TRANSFERRED_TO_OWNER: [], // Terminal state - cannot be changed once transferred
      OWNER_CONFIRMED: [], // Terminal state
      DISPUTED:
        userRole === "cashier" || userRole === "owner"
          ? ["PAID_TO_CASHIER", "TRANSFERRED_TO_OWNER"]
          : [],
    };

    return transitions[currentStatus] || [];
  };

  const dates = extractDates(orders);

  // Fetch all waiters from the API
  const { data: waitersData } = useListStaffQuery({
    role: "waiter",
    status: "active",
    limit: 100, // Get all active waiters
  });

  // Create waiter list from API
  const waiterList = useMemo(() => {
    if (!waitersData?.staff) return [];
    return waitersData.staff.map(
      (waiter: { _id?: string; id?: string; name: string }) => ({
        id: waiter._id || waiter.id || "",
        name: waiter.name,
      }),
    );
  }, [waitersData]);

  const errorMessage =
    error && "data" in error
      ? (error.data as { message?: string })?.message || "An error occurred"
      : null;

  // This page is only for cashiers
  if (userRole !== "cashier") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-lg text-slate-600 dark:text-slate-400">
          This page is only available for cashiers.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-foreground">
          Order History
        </h1>
        {/* Cash Flow Switcher - Track cash flow: Waiter (cash to accept) vs Owner (cash to give) */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1 shadow-sm">
          {(["all", "waiter", "owner"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleView(r)}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${
                roleView === r
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {r === "all"
                ? "All"
                : r === "waiter"
                  ? "From Waiters"
                  : "To Owner"}
            </button>
          ))}
        </div>
      </header>

      {errorMessage && !isLoading && (
        <ErrorState message={errorMessage} onRetry={() => refetch()} />
      )}

      {isLoading && <LoadingState message="Loading orders..." />}

      {!isLoading && !errorMessage && (
        <>
          {/* Summary Cards - Only show when there are orders */}
          {orders.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Orders" value={summary.count} />
              <Stat
                label="Completed"
                value={`${summary.completedTotal.toFixed(2)} Br`}
              />
              <Stat
                label="Pending"
                value={`${summary.pendingTotal.toFixed(2)} Br`}
              />
              <Stat
                label="Avg. Ticket"
                value={`${summary.avgTicket.toFixed(2)} Br`}
              />
            </div>
          )}

          {/* Search and Filters Container - Always visible when not loading/error */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 p-2 rounded-full border bg-card">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by order number, table, waiter, or cashier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 rounded-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 shrink-0">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-fit rounded-full shrink-0 space-x-2">
                  <Filter className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="OPEN">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Open
                    </div>
                  </SelectItem>
                  <SelectItem value="PAID_TO_CASHIER">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Paid
                    </div>
                  </SelectItem>
                  <SelectItem value="TRANSFERRED_TO_OWNER">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="h-4 w-4" />
                      Transferred
                    </div>
                  </SelectItem>
                  <SelectItem value="OWNER_CONFIRMED">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Confirmed
                    </div>
                  </SelectItem>
                  <SelectItem value="VOIDED">
                    <div className="flex items-center gap-2">
                      <Ban className="h-4 w-4" />
                      Voided
                    </div>
                  </SelectItem>
                  <SelectItem value="DISPUTED">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Disputed
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-fit rounded-full shrink-0 space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  {dates.map((d: string) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Waiter filter - available in all views */}
              {waiterList.length > 0 && (
                <>
                  <Select value={waiterFilter} onValueChange={setWaiterFilter}>
                    <SelectTrigger className="w-fit rounded-full shrink-0 space-x-2">
                      <Filter className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                      <SelectValue placeholder="Waiter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Waiters</SelectItem>
                      {waiterList.map((w: { id: string; name: string }) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedOrderIds.size > 0 && (
            <div className="flex items-center gap-3 p-4 rounded-xl border bg-card">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={selectAll}
                  className="text-blue-700 dark:text-blue-400 whitespace-nowrap"
                >
                  Select All (
                  {selectedOrdersStatus
                    ? filtered.filter(
                        (o: DisplayOrder) =>
                          o.backendStatus === selectedOrdersStatus,
                      ).length
                    : filtered.length}
                  )
                </Button>
                <span className="text-blue-700 dark:text-blue-400 text-sm whitespace-nowrap">
                  {selectedOrderIds.size} selected
                  {selectedOrdersStatus && (
                    <span className="ml-2 text-xs">
                      (Status: {getStatusBadgeText(selectedOrdersStatus)})
                    </span>
                  )}
                </span>
              </div>
              {selectedOrdersStatus && (
                <div className="flex items-center gap-2 flex-1">
                  <Select
                    value={bulkStatusChange}
                    onValueChange={(value) =>
                      setBulkStatusChange(value as OrderStatus)
                    }
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Change status to..." />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableStatuses(selectedOrdersStatus, userRole).map(
                        (status) => (
                          <SelectItem key={status} value={status}>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(status)}
                              {getStatusBadgeText(status)}
                            </div>
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleBulkStatusChange}
                    disabled={isBulkUpdating || !bulkStatusChange}
                    className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap"
                  >
                    {isBulkUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Status"
                    )}
                  </Button>
                </div>
              )}
              <Button
                variant="ghost"
                onClick={clearSelection}
                className="text-gray-600 dark:text-gray-400 whitespace-nowrap"
              >
                Clear
              </Button>
            </div>
          )}

          {/* Table */}
          <div className="rounded-xl bg-card border overflow-hidden">
            {isFetching && !isLoading ? (
              <TableSkeleton columnCount={8} rowCount={limit} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Waiter</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-8 text-gray-500 dark:text-gray-400"
                      >
                        No orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((o: DisplayOrder) => {
                      const isTerminalStatus =
                        o.backendStatus === "TRANSFERRED_TO_OWNER" ||
                        o.backendStatus === "VOIDED" ||
                        o.backendStatus === "OWNER_CONFIRMED";
                      const canSelect =
                        !isTerminalStatus &&
                        (selectedOrderIds.size === 0 ||
                          selectedOrdersStatus === o.backendStatus);
                      return (
                        <TableRow key={o.id}>
                          <TableCell>
                            <button
                              onClick={() => {
                                if (canSelect) {
                                  toggleSelect(o.id, o.backendStatus);
                                } else if (isTerminalStatus) {
                                  toast.error(
                                    `Orders with ${getStatusBadgeText(
                                      o.backendStatus,
                                      o.paymentMethod,
                                    )} status cannot be changed`,
                                  );
                                } else {
                                  toast.error(
                                    "You can only select orders with the same status. Current selection: " +
                                      getStatusBadgeText(selectedOrdersStatus!),
                                  );
                                }
                              }}
                              disabled={!canSelect}
                              className={`hover:opacity-70 ${
                                !canSelect
                                  ? "opacity-30 cursor-not-allowed"
                                  : ""
                              }`}
                              title={
                                isTerminalStatus
                                  ? `Orders with ${getStatusBadgeText(
                                      o.backendStatus,
                                      o.paymentMethod,
                                    )} status cannot be changed`
                                  : !canSelect
                                    ? `Can only select orders with status: ${getStatusBadgeText(
                                        selectedOrdersStatus!,
                                      )}`
                                    : "Select order"
                              }
                            >
                              {selectedOrderIds.has(o.id) ? (
                                <CheckSquare className="text-blue-600 dark:text-blue-400" />
                              ) : (
                                <Square className="text-gray-400" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell className="font-medium">
                            {o.orderNumber}
                          </TableCell>
                          <TableCell>{o.tableNumber}</TableCell>
                          <TableCell>{o.waiterName || "N/A"}</TableCell>
                          <TableCell>{o.totalPrice.toFixed(2)} Br</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(o.status)}>
                              {getStatusBadgeText(o.backendStatus, o.paymentMethod)}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(o.date)}</TableCell>
                          <TableCell>
                            {getAvailableStatuses(o.backendStatus, userRole)
                              .length > 0 ? (
                              <Select
                                value={o.backendStatus}
                                onValueChange={(value) => {
                                  if (value !== o.backendStatus) {
                                    handleStatusChange(
                                      o.id,
                                      value as OrderStatus,
                                    );
                                  }
                                }}
                                disabled={isUpdating}
                              >
                                <SelectTrigger className="w-full min-w-[140px] h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={o.backendStatus}>
                                    <div className="flex items-center gap-2">
                                      {getStatusIcon(o.backendStatus)}
                                      {getStatusBadgeText(o.backendStatus, o.paymentMethod)}
                                    </div>
                                  </SelectItem>
                                  {getAvailableStatuses(
                                    o.backendStatus,
                                    userRole,
                                  ).map((status) => (
                                    <SelectItem key={status} value={status}>
                                      <div className="flex items-center gap-2">
                                        {getStatusIcon(status)}
                                        {getStatusBadgeText(status)}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                No actions
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination Controls */}
          {pagination && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700">
              {/* Limit Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Show:
                </span>
                <Select
                  value={limit.toString()}
                  onValueChange={(value) => {
                    setLimit(Number(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  per page
                </span>
              </div>

              {/* Pagination Info */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Showing{" "}
                  {pagination.total > 0
                    ? (pagination.page - 1) * pagination.limit + 1
                    : 0}{" "}
                  to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )}{" "}
                  of {pagination.total} orders
                </span>

                {/* Pagination Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!pagination.hasPreviousPage || isLoading}
                    className="dark:bg-slate-700 dark:border-slate-600"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-slate-600 dark:text-slate-400 px-2">
                      Page {pagination.page} of {pagination.totalPages || 1}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((p) =>
                        Math.min(pagination.totalPages || 1, p + 1),
                      )
                    }
                    disabled={!pagination.hasNextPage || isLoading}
                    className="dark:bg-slate-700 dark:border-slate-600"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// -------------------- Small Components -------------------- //
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
