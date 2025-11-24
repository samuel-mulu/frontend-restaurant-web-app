"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckSquare,
  Square,
  Loader2,
  Search,
  X,
  Filter,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  ShieldCheck,
  Ban,
  Eye,
  TrendingUp,
  DollarSign,
  Package,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { Input } from "@/components/ui/input";
import {
  useListOrdersQuery,
  useGetDateRangeReportQuery,
  useUpdateOrderStatusMutation,
  useBulkUpdateOrderStatusMutation,
  OrderStatus,
  Order as RTKOrder,
} from "@/stores/features/orders/ordersApi";
import { useListStaffQuery } from "@/stores/features/staff/staffApi";
import { selectUser } from "@/stores/features/auth/authSlice";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";

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
}

const formatDate = (date: string): string => {
  try {
    const d = new Date(date);
    return d.toISOString().split("T")[0];
  } catch {
    return date.includes(" ") ? date.split(" ")[0] : date.split("T")[0];
  }
};

const formatDateForInput = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

const getDatePresets = () => {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  return {
    today: {
      start: formatDateForInput(today),
      end: formatDateForInput(today),
    },
    thisWeek: {
      start: formatDateForInput(startOfWeek),
      end: formatDateForInput(today),
    },
    thisMonth: {
      start: formatDateForInput(startOfMonth),
      end: formatDateForInput(today),
    },
  };
};

/**
 * Map backend status to frontend display status
 */
const normalizeStatus = (status: OrderStatus): "Completed" | "Pending" => {
  if (
    status === "PAID_TO_CASHIER" ||
    status === "TRANSFERRED_TO_OWNER" ||
    status === "OWNER_CONFIRMED"
  ) {
    return "Completed";
  }
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

const getStatusBadgeText = (status: OrderStatus): string => {
  const statusMap: Partial<Record<OrderStatus, string>> = {
    OPEN: "Open",
    VOIDED: "Voided",
    PAID_TO_CASHIER: "Received from Waiter",
    TRANSFERRED_TO_OWNER: "Transferred",
    OWNER_CONFIRMED: "Confirmed",
    DISPUTED: "Disputed",
  };
  return statusMap[status] || status;
};

const getStatusIcon = (status: OrderStatus) => {
  const iconMap: Partial<Record<OrderStatus, React.ReactNode>> = {
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
  };
}

const extractDates = (orders: DisplayOrder[]): string[] =>
  [...new Set(orders.map((o) => formatDate(o.date)))].sort().reverse();

// -------------------- Main Component -------------------- //
export function OwnerHistory() {
  const user = useSelector(selectUser);

  const [statusFilter, setStatusFilter] = useState<string>("PAID_TO_CASHIER");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(
    new Set()
  );
  const [bulkStatusChange, setBulkStatusChange] = useState<OrderStatus | "">(
    ""
  );

  // Date range state
  const [dateRangePreset, setDateRangePreset] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Fetch all orders (owner can see all orders)
  const {
    data: ordersData,
    isLoading,
    error,
    refetch,
  } = useListOrdersQuery({
    status: statusFilter !== "all" ? (statusFilter as OrderStatus) : undefined,
    waiterId:
      statusFilter === "OPEN" && staffFilter !== "all"
        ? staffFilter
        : undefined,
    cashierId:
      statusFilter !== "OPEN" && staffFilter !== "all"
        ? staffFilter
        : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    search: searchQuery.trim() || undefined,
  });

  // Fetch date range report when dates are selected
  const { data: dateRangeReport } = useGetDateRangeReportQuery(
    {
      startDate: startDate || "",
      endDate: endDate || "",
    },
    {
      skip: !startDate || !endDate,
    }
  );

  const [updateOrderStatus, { isLoading: isUpdating }] =
    useUpdateOrderStatusMutation();
  const [bulkUpdateOrderStatus, { isLoading: isBulkUpdating }] =
    useBulkUpdateOrderStatusMutation();

  // Transform orders to display format
  const orders = useMemo(() => {
    if (!ordersData) return [];
    if (Array.isArray(ordersData)) {
      return ordersData.map(transformOrder);
    }
    if ("orders" in ordersData) {
      return ordersData.orders.map(transformOrder);
    }
    return [];
  }, [ordersData]);

  // Filter orders based on UI filters (client-side filtering for date and search)
  const filtered = useMemo(() => {
    return orders.filter((o: DisplayOrder) => {
      // Status filter is already applied via API query, but keep for consistency
      if (statusFilter !== "all" && o.backendStatus !== statusFilter) {
        return false;
      }

      // Staff filter (waiter or cashier based on status)
      if (statusFilter === "OPEN") {
        // When status is OPEN, filter by waiter
        if (staffFilter !== "all" && o.waiterId !== staffFilter) {
          return false;
        }
      } else {
        // For other statuses, filter by cashier
        if (staffFilter !== "all" && o.cashierId !== staffFilter) {
          return false;
        }
      }

      // Date filter
      if (dateFilter !== "all" && formatDate(o.date) !== dateFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          (o.orderNumber?.toLowerCase() || "").includes(query) ||
          (o.tableNumber?.toLowerCase() || "").includes(query) ||
          (o.waiterName?.toLowerCase() || "").includes(query) ||
          (o.cashierName?.toLowerCase() || "").includes(query)
        );
      }

      return true;
    });
  }, [orders, statusFilter, staffFilter, dateFilter, searchQuery]);

  // Enhanced summary stats for owner
  const summary = useMemo(() => {
    const totalOrders = filtered.length;
    const totalRevenue = filtered.reduce(
      (sum: number, o: DisplayOrder) => sum + (o.totalPrice || 0),
      0
    );

    const receivedFromWaiters = filtered
      .filter((o: DisplayOrder) => o.backendStatus === "PAID_TO_CASHIER")
      .reduce((sum: number, o: DisplayOrder) => sum + (o.totalPrice || 0), 0);

    const transferred = filtered
      .filter((o: DisplayOrder) => o.backendStatus === "TRANSFERRED_TO_OWNER")
      .reduce((sum: number, o: DisplayOrder) => sum + (o.totalPrice || 0), 0);

    const confirmed = filtered
      .filter((o: DisplayOrder) => o.backendStatus === "OWNER_CONFIRMED")
      .reduce((sum: number, o: DisplayOrder) => sum + (o.totalPrice || 0), 0);

    const pending = filtered
      .filter((o: DisplayOrder) => o.backendStatus === "OPEN")
      .reduce((sum: number, o: DisplayOrder) => sum + (o.totalPrice || 0), 0);

    const voidedCount = filtered.filter(
      (o: DisplayOrder) => o.backendStatus === "VOIDED"
    ).length;

    const disputedCount = filtered.filter(
      (o: DisplayOrder) => o.backendStatus === "DISPUTED"
    ).length;

    return {
      totalOrders,
      totalRevenue,
      receivedFromWaiters,
      transferred,
      confirmed,
      pending,
      voidedCount,
      disputedCount,
    };
  }, [filtered]);

  // Get the common status of selected orders
  const selectedOrdersStatus = useMemo(() => {
    if (selectedOrderIds.size === 0) return null;
    const selectedOrders = filtered.filter((o: DisplayOrder) =>
      selectedOrderIds.has(o.id)
    );
    if (selectedOrders.length === 0) return null;
    const firstStatus = selectedOrders[0].backendStatus;
    const allSameStatus = selectedOrders.every(
      (o: DisplayOrder) => o.backendStatus === firstStatus
    );
    return allSameStatus ? firstStatus : null;
  }, [selectedOrderIds, filtered]);

  const toggleSelect = (id: string, orderStatus: OrderStatus) => {
    // Owner can only select orders that can be confirmed
    if (
      orderStatus !== "TRANSFERRED_TO_OWNER" &&
      orderStatus !== "PAID_TO_CASHIER"
    ) {
      toast.error(
        `Orders with ${getStatusBadgeText(
          orderStatus
        )} status cannot be changed`
      );
      return;
    }

    setSelectedOrderIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) {
        s.delete(id);
        if (s.size === 0) {
          setBulkStatusChange("");
        }
      } else {
        if (s.size > 0) {
          const selectedOrders = filtered.filter((o: DisplayOrder) =>
            s.has(o.id)
          );
          if (selectedOrders.length > 0) {
            const firstStatus = selectedOrders[0].backendStatus;
            if (firstStatus !== orderStatus) {
              toast.error(
                "You can only select orders with the same status. Please clear selection first."
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
    if (filtered.length === 0) return;
    const firstStatus = filtered[0].backendStatus;

    // Only allow selecting TRANSFERRED_TO_OWNER or PAID_TO_CASHIER
    if (
      firstStatus !== "TRANSFERRED_TO_OWNER" &&
      firstStatus !== "PAID_TO_CASHIER"
    ) {
      toast.error(
        `Cannot select orders with ${getStatusBadgeText(firstStatus)} status`
      );
      return;
    }

    const sameStatusOrders = filtered.filter(
      (o: DisplayOrder) =>
        (o.backendStatus === "TRANSFERRED_TO_OWNER" ||
          o.backendStatus === "PAID_TO_CASHIER") &&
        o.backendStatus === firstStatus
    );
    setSelectedOrderIds(
      new Set(sameStatusOrders.map((o: DisplayOrder) => o.id))
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
          `Updated ${result.updated.length} order(s), ${result.failed.length} failed`
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
        error?.data?.message || error?.message || "Failed to update orders"
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
          "Failed to update order status"
      );
    }
  };

  // Owner-specific status transitions: only TRANSFERRED_TO_OWNER and PAID_TO_CASHIER can go to OWNER_CONFIRMED
  const getAvailableStatuses = (currentStatus: OrderStatus): OrderStatus[] => {
    if (currentStatus === "TRANSFERRED_TO_OWNER") {
      return ["OWNER_CONFIRMED"];
    }
    if (currentStatus === "PAID_TO_CASHIER") {
      return ["OWNER_CONFIRMED"];
    }
    return [];
  };

  const dates = extractDates(orders);
  const datePresets = getDatePresets();

  // Handle date range preset changes
  useEffect(() => {
    if (dateRangePreset === "today") {
      setStartDate(datePresets.today.start);
      setEndDate(datePresets.today.end);
    } else if (dateRangePreset === "thisWeek") {
      setStartDate(datePresets.thisWeek.start);
      setEndDate(datePresets.thisWeek.end);
    } else if (dateRangePreset === "thisMonth") {
      setStartDate(datePresets.thisMonth.start);
      setEndDate(datePresets.thisMonth.end);
    } else if (dateRangePreset === "custom") {
      // Keep current dates or clear if not set
    } else {
      // "all" - clear dates
      setStartDate("");
      setEndDate("");
    }
  }, [dateRangePreset]);

  // Fetch waiters and cashiers for filters
  const { data: waitersData } = useListStaffQuery({
    role: "waiter",
    status: "active",
    limit: 100,
  });

  const { data: cashiersData } = useListStaffQuery({
    role: "cashier",
    status: "active",
    limit: 100,
  });

  const waiterList = useMemo(() => {
    if (!waitersData?.staff) return [];
    return waitersData.staff.map(
      (waiter: { _id?: string; id?: string; name: string }) => ({
        id: waiter._id || waiter.id || "",
        name: waiter.name,
      })
    );
  }, [waitersData]);

  const cashierList = useMemo(() => {
    if (!cashiersData?.staff) return [];
    return cashiersData.staff.map(
      (cashier: { _id?: string; id?: string; name: string }) => ({
        id: cashier._id || cashier.id || "",
        name: cashier.name,
      })
    );
  }, [cashiersData]);

  // Reset staff filter when status changes
  useEffect(() => {
    setStaffFilter("all");
  }, [statusFilter]);

  const errorMessage =
    error && "data" in error
      ? (error.data as { message?: string; error?: string })?.message ||
        (error.data as { message?: string; error?: string })?.error ||
        "An error occurred"
      : error && "error" in error
      ? (error.error as string) || "An error occurred"
      : null;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
          Owner History
        </h1>
        {/* Date Range Preset Selector */}
        <div className="flex items-center gap-2">
          <Select value={dateRangePreset} onValueChange={setDateRangePreset}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="thisWeek">This Week</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          {dateRangePreset === "custom" && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[150px]"
              />
              <span className="text-slate-500">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[150px]"
              />
            </div>
          )}
        </div>
      </header>

      {errorMessage && !isLoading && (
        <ErrorState message={errorMessage} onRetry={() => refetch()} />
      )}

      {isLoading && <LoadingState message="Loading orders..." />}

      {!isLoading && !errorMessage && (
        <>
          {/* Date Range Report */}
          {dateRangeReport && startDate && endDate && (
            <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-4">
              <h3 className="text-lg font-semibold mb-3">
                Date Range Report: {startDate} to {endDate}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Total Orders</p>
                  <p className="text-xl font-bold">
                    {dateRangeReport.totalOrders}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Revenue</p>
                  <p className="text-xl font-bold">
                    {dateRangeReport.totalRevenue.toFixed(2)} Br
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Collected</p>
                  <p className="text-xl font-bold">
                    {dateRangeReport.totalCollected.toFixed(2)} Br
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Transferred</p>
                  <p className="text-xl font-bold">
                    {dateRangeReport.totalTransferred.toFixed(2)} Br
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Summary Stats Cards */}
          {orders.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
              <EnhancedStatCard
                label="Total Orders"
                value={summary.totalOrders}
                icon={<Package className="h-5 w-5" />}
                color="blue"
              />
              <EnhancedStatCard
                label="Total Revenue"
                value={`${summary.totalRevenue.toFixed(2)} Br`}
                icon={<DollarSign className="h-5 w-5" />}
                color="green"
              />
              <EnhancedStatCard
                label="Received"
                value={`${summary.receivedFromWaiters.toFixed(2)} Br`}
                icon={<TrendingUp className="h-5 w-5" />}
                color="emerald"
              />
              <EnhancedStatCard
                label="Transferred"
                value={`${summary.transferred.toFixed(2)} Br`}
                icon={<ArrowRightLeft className="h-5 w-5" />}
                color="purple"
              />
              <EnhancedStatCard
                label="Confirmed"
                value={`${summary.confirmed.toFixed(2)} Br`}
                icon={<ShieldCheck className="h-5 w-5" />}
                color="indigo"
              />
              <EnhancedStatCard
                label="Pending"
                value={`${summary.pending.toFixed(2)} Br`}
                icon={<AlertCircle className="h-5 w-5" />}
                color="amber"
              />
              <EnhancedStatCard
                label="Voided"
                value={summary.voidedCount}
                icon={<Ban className="h-5 w-5" />}
                color="red"
              />
              <EnhancedStatCard
                label="Disputed"
                value={summary.disputedCount}
                icon={<XCircle className="h-5 w-5" />}
                color="orange"
              />
            </div>
          )}

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 p-2 rounded-full border bg-white dark:bg-slate-800">
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

            <div className="flex items-center gap-2 shrink-0">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-fit rounded-full shrink-0 space-x-2">
                  <Filter className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PAID_TO_CASHIER">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Received from Waiter
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
                  <SelectItem value="OPEN">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Open
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

              {/* Conditional Staff Filter: Waiter when OPEN, Cashier for other statuses */}
              {statusFilter === "OPEN" && waiterList.length > 0 ? (
                <Select value={staffFilter} onValueChange={setStaffFilter}>
                  <SelectTrigger className="w-fit rounded-full shrink-0 space-x-2">
                    <Users className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
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
              ) : statusFilter !== "OPEN" && cashierList.length > 0 ? (
                <Select value={staffFilter} onValueChange={setStaffFilter}>
                  <SelectTrigger className="w-fit rounded-full shrink-0 space-x-2">
                    <Users className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                    <SelectValue placeholder="Cashier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cashiers</SelectItem>
                    {cashierList.map((c: { id: string; name: string }) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedOrderIds.size > 0 && (
            <div className="flex items-center gap-3 p-4 rounded-xl border bg-white dark:bg-slate-800">
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
                          o.backendStatus === selectedOrdersStatus
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
                      {getAvailableStatuses(selectedOrdersStatus).map(
                        (status) => (
                          <SelectItem key={status} value={status}>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(status)}
                              {getStatusBadgeText(status)}
                            </div>
                          </SelectItem>
                        )
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
          <div className="rounded-xl bg-white dark:bg-slate-800 border dark:border-slate-700 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead>Waiter</TableHead>
                  <TableHead>Cashier</TableHead>
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
                    const canChangeStatus =
                      o.backendStatus === "TRANSFERRED_TO_OWNER" ||
                      o.backendStatus === "PAID_TO_CASHIER";
                    const canSelect =
                      canChangeStatus &&
                      (selectedOrderIds.size === 0 ||
                        selectedOrdersStatus === o.backendStatus);
                    return (
                      <TableRow key={o.id}>
                        <TableCell>
                          <button
                            onClick={() => {
                              if (canSelect) {
                                toggleSelect(o.id, o.backendStatus);
                              } else if (!canChangeStatus) {
                                toast.error(
                                  `Orders with ${getStatusBadgeText(
                                    o.backendStatus
                                  )} status cannot be changed`
                                );
                              } else {
                                toast.error(
                                  "You can only select orders with the same status. Current selection: " +
                                    getStatusBadgeText(selectedOrdersStatus!)
                                );
                              }
                            }}
                            disabled={!canSelect}
                            className={`hover:opacity-70 ${
                              !canSelect ? "opacity-30 cursor-not-allowed" : ""
                            }`}
                            title={
                              !canChangeStatus
                                ? `Orders with ${getStatusBadgeText(
                                    o.backendStatus
                                  )} status cannot be changed`
                                : !canSelect
                                ? `Can only select orders with status: ${getStatusBadgeText(
                                    selectedOrdersStatus!
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
                        <TableCell>{o.waiterName || "N/A"}</TableCell>
                        <TableCell>{o.cashierName || "N/A"}</TableCell>
                        <TableCell>{o.totalPrice.toFixed(2)} Br</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(o.status)}>
                            {getStatusBadgeText(o.backendStatus)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(o.date)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                // Sample UI - show details (placeholder)
                                toast.info("Order details view - Coming soon");
                              }}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {getAvailableStatuses(o.backendStatus).length >
                            0 ? (
                              <Select
                                value={o.backendStatus}
                                onValueChange={(value) => {
                                  if (value !== o.backendStatus) {
                                    handleStatusChange(
                                      o.id,
                                      value as OrderStatus
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
                                      {getStatusBadgeText(o.backendStatus)}
                                    </div>
                                  </SelectItem>
                                  {getAvailableStatuses(o.backendStatus).map(
                                    (status) => (
                                      <SelectItem key={status} value={status}>
                                        <div className="flex items-center gap-2">
                                          {getStatusIcon(status)}
                                          {getStatusBadgeText(status)}
                                        </div>
                                      </SelectItem>
                                    )
                                  )}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                No actions
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

// -------------------- Enhanced Stat Card Component -------------------- //
function EnhancedStatCard({
  label,
  value,
  icon,
  color = "blue",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?:
    | "blue"
    | "green"
    | "emerald"
    | "purple"
    | "indigo"
    | "amber"
    | "red"
    | "orange";
}) {
  const colorClasses = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    green:
      "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
    emerald:
      "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    purple:
      "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    indigo:
      "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
    amber:
      "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    red: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
    orange:
      "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  };

  return (
    <div className={`rounded-lg border p-4 shadow-sm ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium opacity-80">{label}</p>
        <div className="opacity-60">{icon}</div>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
