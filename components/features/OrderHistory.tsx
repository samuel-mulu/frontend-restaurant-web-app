"use client";

import { useState, useMemo } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { Input } from "@/components/ui/input";
import {
  useListOrdersQuery,
  useUpdateOrderStatusMutation,
  OrderStatus,
  Order as RTKOrder,
} from "@/stores/features/orders/ordersApi";
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

const getStatusBadgeText = (status: OrderStatus): string => {
  const statusMap: Record<OrderStatus, string> = {
    OPEN: "Open",
    VOIDED: "Voided",
    PAID_TO_CASHIER: "Paid",
    TRANSFERRED_TO_OWNER: "Transferred",
    OWNER_CONFIRMED: "Confirmed",
    DISPUTED: "Disputed",
  };
  return statusMap[status] || status;
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
  };
}

const extractDates = (orders: DisplayOrder[]): string[] =>
  [...new Set(orders.map((o) => formatDate(o.date)))].sort().reverse();

const groupWaiters = (
  orders: DisplayOrder[]
): Array<{ id: string; name: string; count: number }> => {
  const map = new Map<string, { id: string; name: string; count: number }>();
  for (const o of orders) {
    if (!o.waiterId) continue;
    map.set(o.waiterId, {
      id: o.waiterId,
      name: o.waiterName || "Unknown Waiter",
      count: (map.get(o.waiterId)?.count || 0) + 1,
    });
  }
  return [...map.values()];
};

// -------------------- Main Component -------------------- //
export function OrderHistory() {
  const user = useSelector(selectUser);
  const userRole = user?.role || "waiter";
  const userId = user?.id || "";

  const [roleView, setRoleView] = useState<"waiter" | "cashier" | "owner">(
    userRole === "owner"
      ? "owner"
      : userRole === "cashier"
      ? "cashier"
      : "waiter"
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [waiterFilter, setWaiterFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(
    new Set()
  );

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
    } = {};

    // Cashiers see orders they created
    if (userRole === "cashier" && roleView === "cashier") {
      params.cashierId = userId;
    }
    // Waiters see orders assigned to them
    else if (userRole === "waiter" && roleView === "waiter") {
      params.waiterId = userId;
    }
    // Owners see all orders (no filter)

    // Apply status filter
    if (statusFilter !== "all") {
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

    // Apply waiter filter if set
    if (waiterFilter !== "all") {
      params.waiterId = waiterFilter;
    }

    return params;
  }, [userRole, userId, statusFilter, searchQuery, waiterFilter, roleView]);

  const {
    data: ordersData = [],
    isLoading,
    error,
    refetch,
  } = useListOrdersQuery(queryParams);

  const [updateOrderStatus, { isLoading: isUpdating }] =
    useUpdateOrderStatusMutation();

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

      // Role-based filtering (owner view shows only completed orders)
      if (roleView === "owner" && o.status !== "Completed") return false;

      return true;
    });
  }, [orders, roleView, statusFilter, waiterFilter, dateFilter]);

  const pendingOrders = filtered.filter(
    (o: DisplayOrder) => o.status === "Pending"
  );

  const summary = useMemo(() => {
    const totals = filtered.reduce(
      (acc: { Completed: number; Pending: number }, o: DisplayOrder) => {
        acc[o.status] += o.totalPrice || 0;
        return acc;
      },
      { Completed: 0, Pending: 0 }
    );

    const avg = filtered.length > 0 ? totals.Completed / filtered.length : 0;
    return {
      count: filtered.length,
      completedTotal: totals.Completed,
      pendingTotal: totals.Pending,
      avgTicket: avg,
    };
  }, [filtered]);

  const toggleSelect = (id: string) => {
    setSelectedOrderIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) {
        s.delete(id);
      } else {
        s.add(id);
      }
      return s;
    });
  };

  const selectAll = () => {
    setSelectedOrderIds(new Set(pendingOrders.map((o: DisplayOrder) => o.id)));
  };

  const clearSelection = () => setSelectedOrderIds(new Set());

  const markSelectedCompleted = async () => {
    if (!selectedOrderIds.size) {
      toast.error("No orders selected");
      return;
    }
    const ids = Array.from(selectedOrderIds);

    try {
      // Update to PAID_TO_CASHIER status (cashier marks as paid)
      await Promise.all(
        ids.map((id) =>
          updateOrderStatus({
            id,
            status: "PAID_TO_CASHIER",
          }).unwrap()
        )
      );
      toast.success("Orders updated successfully");
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

  const getAvailableStatuses = (
    currentStatus: OrderStatus,
    userRole: string
  ): OrderStatus[] => {
    // Define valid status transitions based on role
    const transitions: Record<OrderStatus, OrderStatus[]> = {
      OPEN: ["VOIDED", "PAID_TO_CASHIER"],
      VOIDED: [],
      PAID_TO_CASHIER:
        userRole === "cashier" || userRole === "owner"
          ? ["TRANSFERRED_TO_OWNER", "DISPUTED"]
          : [],
      TRANSFERRED_TO_OWNER:
        userRole === "owner" ? ["OWNER_CONFIRMED", "DISPUTED"] : [],
      OWNER_CONFIRMED: [],
      DISPUTED:
        userRole === "cashier" || userRole === "owner"
          ? ["PAID_TO_CASHIER", "TRANSFERRED_TO_OWNER"]
          : [],
    };

    return transitions[currentStatus] || [];
  };

  const dates = extractDates(orders);
  const waiterList = groupWaiters(orders);

  const errorMessage =
    error && "data" in error
      ? (error.data as { message?: string })?.message || "An error occurred"
      : null;

  // Determine available role views based on user role
  const availableRoles = useMemo(() => {
    if (userRole === "owner") {
      return ["owner", "cashier", "waiter"];
    } else if (userRole === "cashier") {
      return ["cashier"];
    } else {
      return ["waiter"];
    }
  }, [userRole]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
          Order History
        </h1>
        {availableRoles.length > 1 && (
          <div className="flex gap-2 rounded-full border p-1 bg-white dark:bg-slate-800">
            {availableRoles.map((r) => (
              <button
                key={r}
                onClick={() => setRoleView(r as "waiter" | "cashier" | "owner")}
                className={`px-4 py-2 rounded-full text-sm capitalize ${
                  roleView === r
                    ? "bg-black dark:bg-slate-100 text-white dark:text-slate-900"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
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
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 p-4 rounded-xl border bg-white dark:bg-slate-800">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by order number, table, waiter, or cashier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 min-h-[44px]"
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
                <SelectTrigger className="w-fit rounded-xl shrink-0 min-w-[140px]">
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
                <SelectTrigger className="w-fit rounded-xl shrink-0 min-w-[140px]">
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

              {(roleView === "waiter" || roleView === "owner") &&
                waiterList.length > 0 && (
                  <>
                    <Filter className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                    <Select
                      value={waiterFilter}
                      onValueChange={setWaiterFilter}
                    >
                      <SelectTrigger className="w-fit rounded-xl shrink-0 min-w-[140px]">
                        <SelectValue placeholder="Waiter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Waiters</SelectItem>
                        {waiterList.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name} ({w.count})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
            </div>
          </div>

          {/* Bulk Actions for Waiters */}
          {roleView === "waiter" &&
            statusFilter === "Pending" &&
            pendingOrders.length > 0 && (
              <div className="flex items-center gap-2 p-4 rounded-xl border bg-white dark:bg-slate-800">
                <Button
                  variant="ghost"
                  onClick={selectAll}
                  className="text-blue-700 dark:text-blue-400 whitespace-nowrap"
                >
                  Select All
                </Button>
                {selectedOrderIds.size > 0 && (
                  <>
                    <span className="text-blue-700 dark:text-blue-400 text-sm whitespace-nowrap">
                      {selectedOrderIds.size} selected
                    </span>
                    <Button
                      onClick={markSelectedCompleted}
                      disabled={isUpdating}
                      className="bg-green-600 hover:bg-green-700 text-white rounded-full whitespace-nowrap"
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Mark Paid"
                      )}
                    </Button>
                  </>
                )}
              </div>
            )}

          {/* Table */}
          <div className="rounded-xl bg-white dark:bg-slate-800 border dark:border-slate-700 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  {roleView === "waiter" && (
                    <TableHead className="w-12"></TableHead>
                  )}
                  <TableHead>Order #</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Waiter</TableHead>
                  {roleView === "cashier" && <TableHead>Cashier</TableHead>}
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  {(userRole === "cashier" || userRole === "owner") && (
                    <TableHead className="w-32">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={
                        roleView === "waiter"
                          ? userRole === "cashier" || userRole === "owner"
                            ? 8
                            : 7
                          : roleView === "cashier"
                          ? userRole === "cashier" || userRole === "owner"
                            ? 8
                            : 7
                          : userRole === "cashier" || userRole === "owner"
                          ? 7
                          : 6
                      }
                      className="text-center py-8 text-gray-500 dark:text-gray-400"
                    >
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((o: DisplayOrder) => (
                    <TableRow key={o.id}>
                      {roleView === "waiter" && (
                        <TableCell>
                          {o.status === "Pending" && (
                            <button
                              onClick={() => toggleSelect(o.id)}
                              className="hover:opacity-70"
                            >
                              {selectedOrderIds.has(o.id) ? (
                                <CheckSquare className="text-blue-600 dark:text-blue-400" />
                              ) : (
                                <Square className="text-gray-400" />
                              )}
                            </button>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="font-medium">
                        {o.orderNumber}
                      </TableCell>
                      <TableCell>{o.tableNumber}</TableCell>
                      <TableCell>{o.waiterName || "N/A"}</TableCell>
                      {roleView === "cashier" && (
                        <TableCell>{o.cashierName || "N/A"}</TableCell>
                      )}
                      <TableCell>{o.totalPrice.toFixed(2)} Br</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(o.status)}>
                          {getStatusBadgeText(o.backendStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(o.date)}</TableCell>
                      {(userRole === "cashier" || userRole === "owner") && (
                        <TableCell>
                          {getAvailableStatuses(o.backendStatus, userRole)
                            .length > 0 ? (
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
                                {getAvailableStatuses(
                                  o.backendStatus,
                                  userRole
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
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

// -------------------- Small Components -------------------- //
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-white dark:bg-slate-800 dark:border-slate-700 p-5 shadow-sm">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        {value}
      </p>
    </div>
  );
}
