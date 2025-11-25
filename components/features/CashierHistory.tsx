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
  Ban,
  Eye,
  Package,
  DollarSign,
  Receipt,
  Wallet,
  Clock,
} from "lucide-react";
import { PaymentMethodSelector, PaymentMethod } from "./PaymentMethodSelector";
import { PaymentImageModal } from "./PaymentImageModal";
import { ChevronDown, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { Input } from "@/components/ui/input";
import {
  useGetOrdersByCashierQuery,
  useGetCashierReportQuery,
  useGetWaiterReportQuery,
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
import { useOrderSocket } from "@/hooks/useOrderSocket";
import { OrderDetailsModal } from "@/components/features/OrderDetailsModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  if (status === "PAID_TO_CASHIER" || status === "TRANSFERRED_TO_OWNER") {
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
    PAID_TO_CASHIER: "Paid",
    TRANSFERRED_TO_OWNER: "Transferred",
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
    DISPUTED: <XCircle className="h-4 w-4" />,
  };
  return iconMap[status] || <AlertCircle className="h-4 w-4" />;
};

const getPaymentMethodIcon = (method: PaymentMethod) => {
  return method === "cash" ? (
    <ChevronDown className="h-3 w-3" />
  ) : (
    <Smartphone className="h-3 w-3" />
  );
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
export function CashierHistory() {
  const user = useSelector(selectUser);
  const cashierId = user?.id || "";

  const [roleView, setRoleView] = useState<"all" | "waiter" | "owner">(
    "waiter"
  );
  const [statusFilter, setStatusFilter] = useState<string>("OPEN");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [waiterFilter, setWaiterFilter] = useState<string>("all");
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

  // Order details modal state
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Void confirmation modal state
  const [voidConfirmOrderId, setVoidConfirmOrderId] = useState<string | null>(
    null
  );
  const [voidConfirmStatus, setVoidConfirmStatus] =
    useState<OrderStatus | null>(null);
  const [isVoidConfirmOpen, setIsVoidConfirmOpen] = useState(false);

  // Payment method state per order
  const [paymentMethods, setPaymentMethods] = useState<
    Map<string, PaymentMethod>
  >(new Map());

  // Payment image modal state
  const [paymentImageOrderId, setPaymentImageOrderId] = useState<string | null>(
    null
  );
  const [paymentImageStatus, setPaymentImageStatus] =
    useState<OrderStatus | null>(null);
  const [isPaymentImageModalOpen, setIsPaymentImageModalOpen] = useState(false);

  // Real-time updates
  useOrderSocket();

  // Determine statuses to fetch based on roleView
  const statusesToFetch = useMemo(() => {
    if (roleView === "waiter") {
      // For waiter view, allow filtering by status within valid statuses
      const validStatuses: OrderStatus[] = ["OPEN", "PAID_TO_CASHIER"];
      if (
        statusFilter !== "all" &&
        validStatuses.includes(statusFilter as OrderStatus)
      ) {
        return [statusFilter as OrderStatus];
      }
      // Fetch OPEN and PAID_TO_CASHIER for waiter view
      return validStatuses;
    } else if (roleView === "owner") {
      // For owner view, allow filtering by status within valid statuses
      const validStatuses: OrderStatus[] = [
        "PAID_TO_CASHIER",
        "TRANSFERRED_TO_OWNER",
      ];
      if (
        statusFilter !== "all" &&
        validStatuses.includes(statusFilter as OrderStatus)
      ) {
        return [statusFilter as OrderStatus];
      }
      // Fetch PAID_TO_CASHIER and TRANSFERRED_TO_OWNER for owner view
      return validStatuses;
    } else {
      // For "all" view, use statusFilter if set, otherwise fetch all
      return statusFilter !== "all"
        ? ([statusFilter] as OrderStatus[])
        : undefined;
    }
  }, [roleView, statusFilter]);

  // Fetch orders by cashier with filters
  const {
    data: ordersData,
    isLoading,
    error,
    refetch,
  } = useGetOrdersByCashierQuery(
    {
      cashierId,
      status: statusesToFetch,
      waiterId: waiterFilter !== "all" ? waiterFilter : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    },
    {
      skip: !cashierId,
    }
  );

  // Debug logging
  useEffect(() => {
    if (cashierId) {
      console.log("CashierHistory Debug:", {
        cashierId,
        user: user?.name,
        userRole: user?.role,
        hasCashierId: !!cashierId,
        ordersData: ordersData?.length || 0,
        isLoading,
        error: error
          ? {
              status: (error as any)?.status,
              data: (error as any)?.data,
              message: (error as any)?.message,
            }
          : null,
      });
    } else {
      console.warn("CashierHistory: cashierId is empty", { user });
    }
  }, [cashierId, ordersData, isLoading, error, user]);

  // Fetch cashier report
  const { data: cashierReport } = useGetCashierReportQuery(
    {
      cashierId,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    },
    {
      skip: !cashierId,
    }
  );

  // Fetch waiter report when waiter filter is applied
  const { data: waiterReport } = useGetWaiterReportQuery(
    {
      waiterId: waiterFilter !== "all" ? waiterFilter : "",
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    },
    {
      skip: waiterFilter === "all" || !waiterFilter,
    }
  );

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
  const orders = useMemo(
    () => (ordersData || []).map(transformOrder),
    [ordersData]
  );

  // Initialize payment methods from orders data
  useEffect(() => {
    if (ordersData) {
      setPaymentMethods((prev) => {
        const newMap = new Map(prev);
        ordersData.forEach((order: RTKOrder) => {
          const orderId = order.id || order._id || "";
          if (order.paymentMethod && orderId) {
            newMap.set(orderId, order.paymentMethod as PaymentMethod);
          }
        });
        return newMap;
      });
    }
  }, [ordersData]);

  // Filter orders based on UI filters (status and waiter are now handled by backend)
  const filtered = useMemo(() => {
    return orders.filter((o: DisplayOrder) => {
      // Date filter (client-side)
      if (dateFilter !== "all" && formatDate(o.date) !== dateFilter) {
        return false;
      }

      // Search filter (client-side)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          (o.orderNumber?.toLowerCase() || "").includes(query) ||
          (o.tableNumber?.toLowerCase() || "").includes(query) ||
          (o.waiterName?.toLowerCase() || "").includes(query)
        );
      }

      return true;
    });
  }, [orders, dateFilter, searchQuery]);

  const summary = useMemo(() => {
    if (roleView === "owner") {
      // Owner view: Detailed breakdown by status
      const transferredOrders = filtered.filter(
        (o: DisplayOrder) => o.backendStatus === "TRANSFERRED_TO_OWNER"
      );
      const paidOrders = filtered.filter(
        (o: DisplayOrder) => o.backendStatus === "PAID_TO_CASHIER"
      );

      const transferredTotal = transferredOrders.reduce(
        (sum: number, o: DisplayOrder) => sum + (o.totalPrice || 0),
        0
      );
      const paidFromWaiterTotal = paidOrders.reduce(
        (sum: number, o: DisplayOrder) => sum + (o.totalPrice || 0),
        0
      );
      const totalRevenue = transferredTotal + paidFromWaiterTotal;

      return {
        totalOrders: filtered.length,
        transferredCount: transferredOrders.length,
        transferredTotal,
        paidCount: paidOrders.length,
        paidFromWaiterTotal,
        totalRevenue,
        pendingTransfer: paidFromWaiterTotal, // Amount ready to transfer
      };
    } else if (roleView === "waiter") {
      // Waiter view: Breakdown by status
      const openOrders = filtered.filter(
        (o: DisplayOrder) => o.backendStatus === "OPEN"
      );
      const paidOrders = filtered.filter(
        (o: DisplayOrder) => o.backendStatus === "PAID_TO_CASHIER"
      );

      const openTotal = openOrders.reduce(
        (sum: number, o: DisplayOrder) => sum + (o.totalPrice || 0),
        0
      );
      const paidTotal = paidOrders.reduce(
        (sum: number, o: DisplayOrder) => sum + (o.totalPrice || 0),
        0
      );
      const totalAmount = openTotal + paidTotal;

      return {
        totalOrders: filtered.length,
        openCount: openOrders.length,
        openTotal,
        paidCount: paidOrders.length,
        paidTotal,
        totalAmount,
        avgOrderValue: filtered.length > 0 ? totalAmount / filtered.length : 0,
      };
    } else {
      // All view: Comprehensive overview
      const statusBreakdown = filtered.reduce(
        (
          acc: Record<OrderStatus, { count: number; total: number }>,
          o: DisplayOrder
        ) => {
          const status = o.backendStatus;
          if (!acc[status]) {
            acc[status] = { count: 0, total: 0 };
          }
          acc[status].count += 1;
          acc[status].total += o.totalPrice || 0;
          return acc;
        },
        {} as Record<OrderStatus, { count: number; total: number }>
      );

      const completedOrders = filtered.filter(
        (o: DisplayOrder) =>
          o.backendStatus === "PAID_TO_CASHIER" ||
          o.backendStatus === "TRANSFERRED_TO_OWNER"
      );
      const pendingOrders = filtered.filter(
        (o: DisplayOrder) => o.backendStatus === "OPEN"
      );

      const completedTotal = completedOrders.reduce(
        (sum: number, o: DisplayOrder) => sum + (o.totalPrice || 0),
        0
      );
      const pendingTotal = pendingOrders.reduce(
        (sum: number, o: DisplayOrder) => sum + (o.totalPrice || 0),
        0
      );
      const totalRevenue = completedTotal + pendingTotal;

      return {
        totalOrders: filtered.length,
        completedCount: completedOrders.length,
        completedTotal,
        pendingCount: pendingOrders.length,
        pendingTotal,
        totalRevenue,
        avgTicket: filtered.length > 0 ? totalRevenue / filtered.length : 0,
        statusBreakdown,
      };
    }
  }, [filtered, roleView]);

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
    if (orderStatus === "TRANSFERRED_TO_OWNER" || orderStatus === "VOIDED") {
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

    if (firstStatus === "TRANSFERRED_TO_OWNER" || firstStatus === "VOIDED") {
      toast.error(
        `Cannot select orders with ${getStatusBadgeText(firstStatus)} status`
      );
      return;
    }

    const sameStatusOrders = filtered.filter(
      (o: DisplayOrder) =>
        o.backendStatus === firstStatus &&
        o.backendStatus !== "TRANSFERRED_TO_OWNER" &&
        o.backendStatus !== "VOIDED"
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
    // Show confirmation modal for voided status
    if (status === "VOIDED") {
      setVoidConfirmOrderId(orderId);
      setVoidConfirmStatus(status);
      setIsVoidConfirmOpen(true);
      return;
    }

    // For PAID_TO_CASHIER status, check payment method
    if (status === "PAID_TO_CASHIER") {
      const paymentMethod = paymentMethods.get(orderId) || "cash";

      // If mobile banking, show image upload modal
      if (paymentMethod === "mobile_banking") {
        setPaymentImageOrderId(orderId);
        setPaymentImageStatus(status);
        setIsPaymentImageModalOpen(true);
        return;
      }
    }

    // For other statuses, update directly
    await executeStatusChange(orderId, status);
  };

  const executeStatusChange = async (
    orderId: string,
    status: OrderStatus,
    paymentProofImage?: File
  ) => {
    try {
      const paymentMethod = paymentMethods.get(orderId) || "cash";

      await updateOrderStatus({
        id: orderId,
        status,
        paymentMethod,
        paymentProofImage,
      }).unwrap();
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

  const handlePaymentMethodChange = (
    orderId: string,
    method: PaymentMethod
  ) => {
    setPaymentMethods((prev) => {
      const newMap = new Map(prev);
      newMap.set(orderId, method);
      return newMap;
    });
  };

  const handlePaymentImageConfirm = async (file: File) => {
    if (paymentImageOrderId && paymentImageStatus) {
      await executeStatusChange(paymentImageOrderId, paymentImageStatus, file);
      setIsPaymentImageModalOpen(false);
      setPaymentImageOrderId(null);
      setPaymentImageStatus(null);
    }
  };

  const handleVoidConfirm = async () => {
    if (voidConfirmOrderId && voidConfirmStatus) {
      await executeStatusChange(voidConfirmOrderId, voidConfirmStatus);
      setIsVoidConfirmOpen(false);
      setVoidConfirmOrderId(null);
      setVoidConfirmStatus(null);
    }
  };

  const getAvailableStatuses = (
    currentStatus: OrderStatus,
    userRole: string
  ): OrderStatus[] => {
    const transitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      OPEN: ["PAID_TO_CASHIER", "VOIDED"], // Swapped: Paid first, then Voided
      VOIDED: [],
      PAID_TO_CASHIER:
        userRole === "cashier" || userRole === "owner"
          ? ["TRANSFERRED_TO_OWNER", "DISPUTED"]
          : [],
      TRANSFERRED_TO_OWNER: [],
      DISPUTED:
        userRole === "cashier" || userRole === "owner"
          ? ["PAID_TO_CASHIER", "TRANSFERRED_TO_OWNER"]
          : [],
    };

    return transitions[currentStatus] || [];
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

  // Update status filter based on roleView
  useEffect(() => {
    // Reset to "all" when switching views so users can see all orders for that view
    setStatusFilter("all");
  }, [roleView]);

  // Fetch all waiters from the API
  const { data: waitersData } = useListStaffQuery({
    role: "waiter",
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

  const errorMessage =
    error && "data" in error
      ? (error.data as { message?: string; error?: string })?.message ||
        (error.data as { message?: string; error?: string })?.error ||
        "An error occurred"
      : error && "error" in error
      ? (error.error as string) || "An error occurred"
      : null;

  // Debug: Log user and cashierId
  useEffect(() => {
    if (!cashierId) {
      console.warn("CashierHistory: No cashierId found. User:", user);
    }
  }, [cashierId, user]);

  if (!cashierId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Cashier ID not found. Please log in again.
        </p>
        <p className="text-sm text-slate-500 mt-2">
          User: {user?.name || "Unknown"} | Role: {user?.role || "Unknown"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
          Cashier History
        </h1>
        <div className="flex items-start gap-4">
          {/* Cash Flow Switcher - Track cash flow: Waiter (cash to accept) vs Owner (cash to give) */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 shadow-sm">
            {(["waiter", "owner", "all"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleView(r)}
                className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${
                  roleView === r
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
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
          {/* Date Range Preset Selector */}
          <div className="flex flex-col items-center gap-2">
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
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-start gap-2">
                  <span className="text-slate-500">from</span>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-[150px]"
                  />
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-slate-500">to</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-[150px]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {errorMessage && !isLoading && (
        <ErrorState message={errorMessage} onRetry={() => refetch()} />
      )}

      {isLoading && <LoadingState message="Loading orders..." />}

      {!isLoading && !errorMessage && (
        <>
          {/* Waiter Report */}
          {waiterReport && waiterFilter !== "all" && (
            <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 p-4">
              <h3 className="text-lg font-semibold mb-3">
                Waiter Report: {waiterReport.waiterName || "Unknown"}
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Total Orders</p>
                  <p className="text-2xl font-bold">
                    {waiterReport.totalOrders}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Sales</p>
                  <p className="text-2xl font-bold">
                    {waiterReport.totalSales.toFixed(2)} Br
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Avg Order Value</p>
                  <p className="text-2xl font-bold">
                    {waiterReport.averageOrderValue.toFixed(2)} Br
                  </p>
                </div>
              </div>
            </div>
          )}

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

          {/* Enhanced Summary Cards */}
          {orders.length > 0 && (
            <div
              className={`grid gap-4 ${
                roleView === "owner"
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
              }`}
            >
              {roleView === "owner" ? (
                <>
                  <EnhancedStatCard
                    label="Total Orders"
                    value={(summary as any).totalOrders || 0}
                    icon={<Package className="h-5 w-5" />}
                    color="blue"
                  />
                  <EnhancedStatCard
                    label="Transferred"
                    value={`${((summary as any).transferredTotal || 0).toFixed(
                      2
                    )} Br`}
                    icon={<ArrowRightLeft className="h-5 w-5" />}
                    color="purple"
                    subtitle={`${
                      (summary as any).transferredCount || 0
                    } orders`}
                  />
                  <EnhancedStatCard
                    label="Received from Waiters"
                    value={`${(
                      (summary as any).paidFromWaiterTotal || 0
                    ).toFixed(2)} Br`}
                    icon={<Wallet className="h-5 w-5" />}
                    color="emerald"
                    subtitle={`${(summary as any).paidCount || 0} orders`}
                  />
                  <EnhancedStatCard
                    label="Pending Transfer"
                    value={`${((summary as any).pendingTransfer || 0).toFixed(
                      2
                    )} Br`}
                    icon={<Clock className="h-5 w-5" />}
                    color="amber"
                    subtitle="Ready to transfer"
                  />
                  <EnhancedStatCard
                    label="Total Revenue"
                    value={`${((summary as any).totalRevenue || 0).toFixed(
                      2
                    )} Br`}
                    icon={<DollarSign className="h-5 w-5" />}
                    color="green"
                  />
                </>
              ) : roleView === "waiter" ? (
                <>
                  <EnhancedStatCard
                    label="Total Orders"
                    value={(summary as any).totalOrders || 0}
                    icon={<Package className="h-5 w-5" />}
                    color="blue"
                  />
                  <EnhancedStatCard
                    label="Open Orders"
                    value={(summary as any).openCount || 0}
                    icon={<AlertCircle className="h-5 w-5" />}
                    color="amber"
                    subtitle={`${((summary as any).openTotal || 0).toFixed(
                      2
                    )} Br`}
                  />
                  <EnhancedStatCard
                    label="Paid Orders"
                    value={(summary as any).paidCount || 0}
                    icon={<CheckCircle2 className="h-5 w-5" />}
                    color="green"
                    subtitle={`${((summary as any).paidTotal || 0).toFixed(
                      2
                    )} Br`}
                  />
                  <EnhancedStatCard
                    label="Total Amount"
                    value={`${((summary as any).totalAmount || 0).toFixed(
                      2
                    )} Br`}
                    icon={<Receipt className="h-5 w-5" />}
                    color="emerald"
                  />
                </>
              ) : (
                <>
                  <EnhancedStatCard
                    label="Total Orders"
                    value={(summary as any).totalOrders || 0}
                    icon={<Package className="h-5 w-5" />}
                    color="blue"
                  />
                  <EnhancedStatCard
                    label="Completed"
                    value={`${((summary as any).completedTotal || 0).toFixed(
                      2
                    )} Br`}
                    icon={<CheckCircle2 className="h-5 w-5" />}
                    color="green"
                    subtitle={`${(summary as any).completedCount || 0} orders`}
                  />
                  <EnhancedStatCard
                    label="Pending"
                    value={`${((summary as any).pendingTotal || 0).toFixed(
                      2
                    )} Br`}
                    icon={<Clock className="h-5 w-5" />}
                    color="amber"
                    subtitle={`${(summary as any).pendingCount || 0} orders`}
                  />
                  <EnhancedStatCard
                    label="Total Revenue"
                    value={`${((summary as any).totalRevenue || 0).toFixed(
                      2
                    )} Br`}
                    icon={<DollarSign className="h-5 w-5" />}
                    color="emerald"
                  />
                </>
              )}
            </div>
          )}

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 p-2 rounded-full border bg-white dark:bg-slate-800">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by order number, table, or waiter..."
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
                  {roleView === "owner" ? (
                    <>
                      <SelectItem value="all">All Statuses</SelectItem>
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
                    </>
                  ) : roleView === "waiter" ? (
                    <>
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
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
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

              {waiterList.length > 0 && (
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
              )}
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
                      {getAvailableStatuses(
                        selectedOrdersStatus,
                        user?.role || "cashier"
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
                      colSpan={7}
                      className="text-center py-8 text-gray-500 dark:text-gray-400"
                    >
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((o: DisplayOrder) => {
                    const isTerminalStatus =
                      o.backendStatus === "TRANSFERRED_TO_OWNER" ||
                      o.backendStatus === "VOIDED";
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
                              isTerminalStatus
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
                                setSelectedOrderId(o.id);
                                setIsModalOpen(true);
                              }}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {getAvailableStatuses(
                              o.backendStatus,
                              user?.role || "cashier"
                            ).length > 0 ? (
                              <div className="flex items-center gap-1">
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
                                      user?.role || "cashier"
                                    ).map((status) => (
                                      <SelectItem key={status} value={status}>
                                        <div className="flex items-center justify-between gap-2 w-full">
                                          <div className="flex items-center gap-2">
                                            {getStatusIcon(status)}
                                            {getStatusBadgeText(status)}
                                          </div>
                                          {status === "PAID_TO_CASHIER" && (
                                            <div className="shrink-0 flex items-center text-gray-600 dark:text-gray-400">
                                              {getPaymentMethodIcon(
                                                paymentMethods.get(o.id) ||
                                                  "cash"
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {o.backendStatus === "OPEN" &&
                                  getAvailableStatuses(
                                    o.backendStatus,
                                    user?.role || "cashier"
                                  ).includes("PAID_TO_CASHIER") && (
                                    <PaymentMethodSelector
                                      value={paymentMethods.get(o.id) || "cash"}
                                      onChange={(method) => {
                                        handlePaymentMethodChange(o.id, method);
                                      }}
                                      disabled={isUpdating}
                                    />
                                  )}
                              </div>
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

      {/* Order Details Modal */}
      <OrderDetailsModal
        orderId={selectedOrderId}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />

      {/* Void Confirmation Modal */}
      <AlertDialog open={isVoidConfirmOpen} onOpenChange={setIsVoidConfirmOpen}>
        <AlertDialogContent className="bg-white border border-gray-200 shadow-xl dark:bg-slate-800 dark:border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 dark:text-white">
              <Ban className="h-5 w-5 text-red-600" />
              Void Order Confirmation
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-400">
              Are you sure you want to void this order? This action cannot be
              undone. The order will be marked as voided and cannot be changed
              afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsVoidConfirmOpen(false);
                setVoidConfirmOrderId(null);
                setVoidConfirmStatus(null);
              }}
              className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:hover:bg-slate-600"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVoidConfirm}
              className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700"
            >
              Void Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Image Upload Modal */}
      <PaymentImageModal
        open={isPaymentImageModalOpen}
        onOpenChange={setIsPaymentImageModalOpen}
        onConfirm={handlePaymentImageConfirm}
        orderNumber={
          paymentImageOrderId
            ? filtered.find((o: DisplayOrder) => o.id === paymentImageOrderId)
                ?.orderNumber
            : undefined
        }
      />
    </div>
  );
}

// -------------------- Enhanced Stat Card Component -------------------- //
function EnhancedStatCard({
  label,
  value,
  icon,
  color = "blue",
  subtitle,
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
  subtitle?: string;
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
    <div
      className={`rounded-lg border p-4 shadow-sm transition-all hover:shadow-md ${colorClasses[color]}`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium opacity-80 uppercase tracking-wide">
          {label}
        </p>
        <div className="opacity-60">{icon}</div>
      </div>
      <p className="text-2xl font-bold mb-1">{value}</p>
      {subtitle && <p className="text-xs opacity-70 mt-1">{subtitle}</p>}
    </div>
  );
}

function ReportCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-white dark:bg-slate-800 dark:border-slate-700 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      </div>
      <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        {value}
      </p>
    </div>
  );
}
