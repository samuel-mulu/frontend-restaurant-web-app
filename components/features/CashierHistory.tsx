"use client";

import { AddItemsToOrderModal } from "@/components/features/AddItemsToOrderModal";
import { OrderDetailsModal } from "@/components/features/OrderDetailsModal";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { WithdrawalModal } from "@/components/shared/WithdrawalModal";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { formatDateLocal } from "@/lib/date-utils";
import { useOrderSocket } from "@/hooks/useOrderSocket";
import { selectUser } from "@/stores/features/auth/authSlice";
import {
  OrderStatus,
  Order as RTKOrder,
  useBulkUpdateOrderStatusMutation,
  useGetOrdersByCashierQuery,
  useUpdateOrderStatusMutation,
} from "@/stores/features/orders/ordersApi";
import type { Staff } from "@/stores/features/staff/staffApi";
import { useListStaffQuery } from "@/stores/features/staff/staffApi";
import { posPrinterService } from "@/stores/features/posPrinter/posPrinterApi";
import {
  AlertCircle,
  ArrowRightLeft,
  Ban,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Download,
  Eye,
  Filter,
  Image as ImageIcon,
  Loader2,
  Package,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Smartphone,
  Square,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { PaymentImageModal } from "./PaymentImageModal";
import { PaymentMethod, PaymentMethodSelector } from "./PaymentMethodSelector";

// -------------------- Types & Utilities -------------------- //

export type ExtendedOrderStatus =
  | OrderStatus
  | "PAID_WITHOUT_PRINT"
  | "TRANSFERRED_WITHOUT_PRINT";

// localStorage utilities for persisting selected orders
const getSelectedOrdersStorageKey = (cashierId: string) =>
  `cashier_history_selected_orders_${cashierId}`;

const loadSelectedOrdersFromStorage = (cashierId: string): Set<string> => {
  try {
    const key = getSelectedOrdersStorageKey(cashierId);
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((id) => typeof id === "string"));
    }
    return new Set();
  } catch (error) {
    return new Set();
  }
};

const saveSelectedOrdersToStorage = (
  cashierId: string,
  selectedIds: Set<string>,
) => {
  try {
    const key = getSelectedOrdersStorageKey(cashierId);
    const data = Array.from(selectedIds);
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    // Silently fail for storage errors
  }
};

const cleanupInvalidOrdersFromStorage = (
  cashierId: string,
  validOrderIds: Set<string>,
) => {
  try {
    const saved = loadSelectedOrdersFromStorage(cashierId);
    const valid = new Set(
      Array.from(saved).filter((id) => validOrderIds.has(id)),
    );

    if (valid.size !== saved.size) {
      saveSelectedOrdersToStorage(cashierId, valid);
    }
  } catch (error) {
    // Silently fail for storage errors
  }
};

interface DisplayOrder {
  id: string;
  orderNumber: string;
  tableNumber: string;
  customer: string;
  totalPrice: number;
  status: "Completed" | "Pending";
  date: string;
  firstItemName?: string;
  waiterId?: string;
  waiterName?: string;
  cashierId?: string;
  cashierName?: string;
  backendStatus: OrderStatus;
  paymentMethod?: "cash" | "mobile_banking";
  paymentProofImage?: { url: string; publicId: string };
}

const formatDateForFilter = (date: string): string => {
  try {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      return date.includes(" ") ? date.split(" ")[0] : date.split("T")[0];
    }
    return formatDateLocal(parsed);
  } catch {
    return date.includes(" ") ? date.split(" ")[0] : date.split("T")[0];
  }
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

const getStatusBadgeText = (
  status: ExtendedOrderStatus,
  paymentMethod?: "cash" | "mobile_banking",
): string => {
  const statusMap: Partial<Record<ExtendedOrderStatus, string>> = {
    OPEN: "Open",
    VOIDED: "Voided",
    PAID_TO_CASHIER: "Paid to Waiter",
    PAID_WITHOUT_PRINT: "Paid to Waiter (no print)",
    TRANSFERRED_TO_OWNER: "Paid to Cashier",
    TRANSFERRED_WITHOUT_PRINT: "Paid to Cashier (no print)",
    OWNER_CONFIRMED: "Confirmed",
    DISPUTED: "Disputed",
  };
  let label = statusMap[status] || status;
  if (
    (status === "TRANSFERRED_TO_OWNER" || status === "TRANSFERRED_WITHOUT_PRINT") &&
    paymentMethod
  ) {
    label += ` (${paymentMethod === "mobile_banking" ? "Mobile Banking" : "Cash"})`;
  }
  return label;
};

const getStatusIcon = (status: ExtendedOrderStatus) => {
  const iconMap: Partial<Record<ExtendedOrderStatus, React.ReactNode>> = {
    OPEN: <AlertCircle className="h-4 w-4" />,
    VOIDED: <Ban className="h-4 w-4" />,
    PAID_TO_CASHIER: <CheckCircle2 className="h-4 w-4" />,
    PAID_WITHOUT_PRINT: <CheckCircle2 className="h-4 w-4 opacity-70" />,
    TRANSFERRED_TO_OWNER: <ArrowRightLeft className="h-4 w-4" />,
    TRANSFERRED_WITHOUT_PRINT: <ArrowRightLeft className="h-4 w-4 opacity-70" />,
    OWNER_CONFIRMED: <CheckCircle2 className="h-4 w-4" />,
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
  const waiterRef =
    typeof order.waiterId === "object" && order.waiterId ? order.waiterId : null;
  const waiterId =
    typeof order.waiterId === "string"
      ? order.waiterId
      : waiterRef?._id ||
        waiterRef?.id ||
        (waiterRef as { clientId?: string } | null)?.clientId ||
        "";
  const waiterName =
    typeof order.waiterId === "object" && order.waiterId?.name
      ? order.waiterId.name
      : "";

  const cashierRef =
    typeof order.cashierId === "object" && order.cashierId
      ? order.cashierId
      : null;
  const cashierId =
    typeof order.cashierId === "string"
      ? order.cashierId
      : cashierRef?._id ||
        cashierRef?.id ||
        (cashierRef as { clientId?: string } | null)?.clientId ||
        "";
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
    firstItemName: order.items[0]?.nameSnapshot || "No Items",
    waiterId,
    waiterName,
    cashierId,
    cashierName,
    backendStatus: order.status,
    paymentMethod: order.paymentMethod,
    paymentProofImage: order.paymentProofImage,
  };
}

const extractDates = (orders: DisplayOrder[]): string[] => {
  const dateSet = new Set<string>();
  orders.forEach((o) => {
    dateSet.add(formatDateForFilter(o.date));
  });
  return [...dateSet].sort().reverse();
};

// -------------------- Main Component -------------------- //
export function CashierHistory() {
  const user = useSelector(selectUser);
  const cashierId = user?.id || "";

  const [roleView, setRoleView] = useState<"all" | "waiter" | "owner">(
    "waiter",
  );
  const [statusFilter, setStatusFilter] = useState<string>("OPEN");
  const [dateFilter, setDateFilter] = useState<string>("latest");
  const [waiterFilter, setWaiterFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(() => {
    if (!cashierId) return new Set();
    return loadSelectedOrdersFromStorage(cashierId);
  });
  const [bulkStatusChange, setBulkStatusChange] = useState<ExtendedOrderStatus | "">(
    "",
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Order details modal state
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Add items modal state
  const [addItemsOrderId, setAddItemsOrderId] = useState<string | null>(null);
  const [isAddItemsOpen, setIsAddItemsOpen] = useState(false);

  // Without print checkbox state
  const [withoutPrint, setWithoutPrint] = useState(false);

  // Void confirmation modal state
  const [voidConfirmOrderId, setVoidConfirmOrderId] = useState<string | null>(
    null,
  );
  const [voidConfirmStatus, setVoidConfirmStatus] =
    useState<OrderStatus | null>(null);
  const [isVoidConfirmOpen, setIsVoidConfirmOpen] = useState(false);
  const [voidPin, setVoidPin] = useState<string>("");

  // Payment method state per order
  const [paymentMethods, setPaymentMethods] = useState<
    Map<string, PaymentMethod>
  >(new Map());

  // Payment image modal state
  const [paymentImageOrderId, setPaymentImageOrderId] = useState<string | null>(
    null,
  );
  const [paymentImageStatus, setPaymentImageStatus] =
    useState<ExtendedOrderStatus | null>(null);
  const [isPaymentImageModalOpen, setIsPaymentImageModalOpen] = useState(false);

  // Payment proof view modal state
  const [viewPaymentProofOrderId, setViewPaymentProofOrderId] = useState<
    string | null
  >(null);
  const [isViewPaymentProofModalOpen, setIsViewPaymentProofModalOpen] =
    useState(false);

  // Real-time updates
  const { isConnected: isRealtimeConnected } = useOrderSocket();

  // Fetch waiters for filter dropdown (server-side waiter filter)
  const { data: waitersData } = useListStaffQuery({
    role: "waiter",
    status: "active",
  });
  const waiterList = useMemo(() => {
    const staff = waitersData?.staff || [];
    return staff.map((w: Staff) => ({ id: w._id || w.id || "", name: w.name }));
  }, [waitersData]);

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [waiterFilter, dateFilter, statusFilter, debouncedSearch, limit]);

  // Map dateFilter to startDate/endDate for API
  const dateRange = useMemo(() => {
    if (dateFilter === "all") return { startDate: undefined, endDate: undefined };
    if (dateFilter === "latest") {
      const today = formatDateLocal(new Date());
      return { startDate: today, endDate: today };
    }
    return { startDate: dateFilter, endDate: dateFilter };
  }, [dateFilter]);

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

  // Fetch orders by cashier with server-side filters and pagination
  const {
    data: ordersResponse,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetOrdersByCashierQuery(
    {
      cashierId,
      status: statusesToFetch,
      waiterId: waiterFilter !== "all" ? waiterFilter : undefined,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      search: debouncedSearch.trim() || undefined,
      page,
      limit,
    },
    {
      skip: !cashierId,
      refetchOnFocus: false,
      refetchOnReconnect: true,
    },
  );

  // Transform orders to display format (server returns paginated data)
  const orders = useMemo(
    () =>
      (ordersResponse?.data || [])
        .map(transformOrder)
        .filter(
          (order: DisplayOrder) =>
            !order.cashierId || order.cashierId === cashierId,
        ),
    [ordersResponse?.data, cashierId],
  );

  // Build date options - last 30 days (configurable)
  const DATE_RANGE_DAYS = 30;
  const dates = useMemo(() => {
    const today = formatDateLocal(new Date());
    const options: string[] = [today];
    for (let i = 1; i < DATE_RANGE_DAYS; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      options.push(formatDateLocal(d));
    }
    return options.sort().reverse();
  }, []);

  const resolvedDateFilter =
    dateFilter === "all" ||
    dateFilter === "latest" ||
    dates.includes(dateFilter)
      ? dateFilter
      : "latest";

  const resolvedWaiterFilter =
    waiterFilter === "all" ||
    waiterList.some((waiter: { id: string; name: string }) => waiter.id === waiterFilter)
      ? waiterFilter
      : "all";

  const [updateOrderStatus, { isLoading: isUpdating }] =
    useUpdateOrderStatusMutation();
  const [bulkUpdateOrderStatus, { isLoading: isBulkUpdating }] =
    useBulkUpdateOrderStatusMutation();

  // Initialize payment methods from orders data
  useEffect(() => {
    const data = ordersResponse?.data;
    if (data) {
      setPaymentMethods((prev) => {
        const newMap = new Map(prev);
        data.forEach((order: RTKOrder) => {
          const orderId = order.id || order._id || "";
          if (order.paymentMethod && orderId) {
            newMap.set(orderId, order.paymentMethod as PaymentMethod);
          }
        });
        return newMap;
      });
    }
  }, [ordersResponse?.data]);

  // Save selected orders to localStorage whenever they change
  useEffect(() => {
    if (cashierId && selectedOrderIds.size > 0) {
      saveSelectedOrdersToStorage(cashierId, selectedOrderIds);
    }
  }, [cashierId, selectedOrderIds]);

  // Cleanup invalid order IDs from localStorage when orders data changes
  useEffect(() => {
    if (cashierId && orders.length > 0) {
      const validOrderIds = new Set(
        orders
          .map((order: DisplayOrder) => order.id)
          .filter((id: string | undefined) => typeof id === "string"),
      ) as Set<string>;
      cleanupInvalidOrdersFromStorage(cashierId, validOrderIds);

      // Also update current selection to only include valid orders
      setSelectedOrderIds((prev) => {
        const validSelection = new Set(
          Array.from(prev).filter((id) => validOrderIds.has(id)),
        );
        return validSelection;
      });
    }
  }, [cashierId, orders]);

  // Server returns paginated data; orders are already the current page
  const paginationInfo = ordersResponse?.pagination ?? {
    page: 1,
    limit,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  // paginatedOrders = orders (server already paginated)
  const paginatedOrders = orders;

  const summary = useMemo(() => {
    if (roleView === "owner") {
      // Owner view: Detailed breakdown by status
      const transferredOrders = orders.filter(
        (o: DisplayOrder) => o.backendStatus === "TRANSFERRED_TO_OWNER",
      );
      const paidOrders = orders.filter(
        (o: DisplayOrder) => o.backendStatus === "PAID_TO_CASHIER",
      );

      const transferredTotal = transferredOrders.reduce(
        (sum: number, o: DisplayOrder) => sum + (o.totalPrice || 0),
        0,
      );
      const paidFromWaiterTotal = paidOrders.reduce(
        (sum: number, o: DisplayOrder) => sum + (o.totalPrice || 0),
        0,
      );
      const totalRevenue = transferredTotal + paidFromWaiterTotal;

      return {
        totalOrders: orders.length,
        transferredCount: transferredOrders.length,
        transferredTotal,
        paidCount: paidOrders.length,
        paidFromWaiterTotal,
        totalRevenue,
        pendingTransfer: paidFromWaiterTotal, // Amount ready to transfer
      };
    } else if (roleView === "waiter") {
      // Waiter view: Breakdown by status
      const openOrders = orders.filter(
        (o: DisplayOrder) => o.backendStatus === "OPEN",
      );
      const paidOrders = orders.filter(
        (o: DisplayOrder) => o.backendStatus === "PAID_TO_CASHIER",
      );

      const openTotal = openOrders.reduce(
        (sum: number, o: DisplayOrder) => sum + (o.totalPrice || 0),
        0,
      );
      const paidTotal = paidOrders.reduce(
        (sum: number, o: DisplayOrder) => sum + (o.totalPrice || 0),
        0,
      );
      const totalAmount = openTotal + paidTotal;

      return {
        totalOrders: orders.length,
        openCount: openOrders.length,
        openTotal,
        paidCount: paidOrders.length,
        paidTotal,
        totalAmount,
        avgOrderValue: orders.length > 0 ? totalAmount / orders.length : 0,
      };
    } else {
      // All view: Comprehensive overview
      const statusBreakdown = orders.reduce(
        (
          acc: Record<OrderStatus, { count: number; total: number }>,
          o: DisplayOrder,
        ) => {
          const status = o.backendStatus;
          if (!acc[status]) {
            acc[status] = { count: 0, total: 0 };
          }
          acc[status].count += 1;
          acc[status].total += o.totalPrice || 0;
          return acc;
        },
        {} as Record<OrderStatus, { count: number; total: number }>,
      );

      const completedOrders = orders.filter(
        (o: DisplayOrder) =>
          o.backendStatus === "PAID_TO_CASHIER" ||
          o.backendStatus === "TRANSFERRED_TO_OWNER" ||
          o.backendStatus === "OWNER_CONFIRMED",
      );
      const pendingOrders = orders.filter(
        (o: DisplayOrder) => o.backendStatus === "OPEN",
      );

      const completedTotal = completedOrders.reduce(
        (sum: number, o: DisplayOrder) => sum + (o.totalPrice || 0),
        0,
      );
      const pendingTotal = pendingOrders.reduce(
        (sum: number, o: DisplayOrder) => sum + (o.totalPrice || 0),
        0,
      );
      const totalRevenue = completedTotal + pendingTotal;

      return {
        totalOrders: orders.length,
        completedCount: completedOrders.length,
        completedTotal,
        pendingCount: pendingOrders.length,
        pendingTotal,
        totalRevenue,
        avgTicket: orders.length > 0 ? totalRevenue / orders.length : 0,
        statusBreakdown,
      };
    }
  }, [orders, roleView]);

  // Get the common status of selected orders
  const selectedOrdersStatus = useMemo(() => {
    if (selectedOrderIds.size === 0) return null;
    const selectedOrders = orders.filter((o: DisplayOrder) =>
      selectedOrderIds.has(o.id),
    );
    if (selectedOrders.length === 0) return null;
    const firstStatus = selectedOrders[0].backendStatus;
    const allSameStatus = selectedOrders.every(
      (o: DisplayOrder) => o.backendStatus === firstStatus,
    );
    return allSameStatus ? firstStatus : null;
  }, [selectedOrderIds, orders]);

  const toggleSelect = (id: string, orderStatus: OrderStatus) => {
    if (orderStatus === "TRANSFERRED_TO_OWNER" || orderStatus === "VOIDED") {
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
        if (s.size === 0) {
          setBulkStatusChange("");
        }
      } else {
        if (s.size > 0) {
          const selectedOrders = orders.filter((o: DisplayOrder) =>
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
    if (orders.length === 0) return;
    const firstStatus = orders[0].backendStatus;

    if (firstStatus === "TRANSFERRED_TO_OWNER" || firstStatus === "VOIDED") {
      toast.error(
        `Cannot select orders with ${getStatusBadgeText(firstStatus)} status`,
      );
      return;
    }

    const sameStatusOrders = orders.filter(
      (o: DisplayOrder) =>
        o.backendStatus === firstStatus &&
        o.backendStatus !== "TRANSFERRED_TO_OWNER" &&
        o.backendStatus !== "VOIDED",
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
    const isWithoutPrintBulk =
      bulkStatusChange === "PAID_WITHOUT_PRINT" ||
      bulkStatusChange === "TRANSFERRED_WITHOUT_PRINT";
    const actualStatus = (isWithoutPrintBulk
      ? bulkStatusChange === "PAID_WITHOUT_PRINT"
        ? "PAID_TO_CASHIER"
        : "TRANSFERRED_TO_OWNER"
      : bulkStatusChange) as OrderStatus;

    const bulkPaymentMethod =
      actualStatus === "TRANSFERRED_TO_OWNER"
        ? (paymentMethods.get(ids[0]) as "cash" | "mobile_banking") || "cash"
        : undefined;

    try {
      const result = await bulkUpdateOrderStatus({
        orderIds: ids,
        status: actualStatus,
        ...(bulkPaymentMethod && { paymentMethod: bulkPaymentMethod }),
      }).unwrap();

      if (result.failed && result.failed.length > 0) {
        toast.warning(
          `Updated ${result.updated.length} order(s), ${result.failed.length} failed`,
        );
      } else {
        toast.success(`Successfully updated ${result.updated.length} order(s)`);
      }

      // Print receipt when updating to PAID_TO_CASHIER or TRANSFERRED_TO_OWNER
      if (
        (actualStatus === "PAID_TO_CASHIER" || actualStatus === "TRANSFERRED_TO_OWNER") &&
        !withoutPrint &&
        !isWithoutPrintBulk
      ) {
        if (
          actualStatus === "PAID_TO_CASHIER" &&
          result.updated.length > 1 &&
          result.mergedReceiptText
        ) {
          handlePrintReceipt(result.mergedReceiptText, "Merged");
        } else if (result.updated.length >= 1 && result.updated[0].receiptText) {
          handlePrintReceipt(
            result.updated[0].receiptText,
            result.updated[0].orderNumber || "Receipt",
          );
        }
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

  const handleStatusChange = async (orderId: string, status: ExtendedOrderStatus) => {
    // Show confirmation modal for voided status
    if (status === "VOIDED") {
      setVoidConfirmOrderId(orderId);
      setVoidConfirmStatus(status);
      setIsVoidConfirmOpen(true);
      return;
    }

    // For PAID_TO_CASHIER or TRANSFERRED, check payment method (mobile banking may need proof for PAID)
    if (
      status === "PAID_TO_CASHIER" ||
      status === "PAID_WITHOUT_PRINT" ||
      status === "TRANSFERRED_TO_OWNER" ||
      status === "TRANSFERRED_WITHOUT_PRINT"
    ) {
      const paymentMethod = paymentMethods.get(orderId) || "cash";

      // If mobile banking for PAID_TO_CASHIER, show image upload modal
      if (
        (status === "PAID_TO_CASHIER" || status === "PAID_WITHOUT_PRINT") &&
        paymentMethod === "mobile_banking"
      ) {
        setPaymentImageOrderId(orderId);
        setPaymentImageStatus(status);
        setIsPaymentImageModalOpen(true);
        return;
      }
    }

    await executeStatusChange(orderId, status);
  };

  const executeStatusChange = async (
    orderId: string,
    status: ExtendedOrderStatus,
    paymentProofImage?: File | null,
    paymentBankName?: string,
  ) => {
    try {
      const paymentMethod = paymentMethods.get(orderId) || "cash";

      const isWithoutPrintRow =
        status === "PAID_WITHOUT_PRINT" || status === "TRANSFERRED_WITHOUT_PRINT";
      const actualStatus = isWithoutPrintRow
        ? status === "PAID_WITHOUT_PRINT"
          ? "PAID_TO_CASHIER"
          : "TRANSFERRED_TO_OWNER"
        : (status as OrderStatus);

      const result = await updateOrderStatus({
        id: orderId,
        status: actualStatus,
        paymentMethod,
        paymentProofImage: paymentProofImage ?? undefined,
        paymentBankName,
      }).unwrap();
      toast.success("Order status updated successfully");

      // Print receipt if status changed to PAID_TO_CASHIER or TRANSFERRED_TO_OWNER and withoutPrint is not checked
      if (
        (actualStatus === "PAID_TO_CASHIER" || actualStatus === "TRANSFERRED_TO_OWNER") &&
        result.receiptText &&
        !withoutPrint &&
        !isWithoutPrintRow
      ) {
        handlePrintReceipt(result.receiptText, result.orderNumber);
      }

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

  const handlePaymentMethodChange = (
    orderId: string,
    method: PaymentMethod,
  ) => {
    setPaymentMethods((prev) => {
      const newMap = new Map(prev);
      newMap.set(orderId, method);
      return newMap;
    });
  };

  const handlePaymentImageConfirm = async (
    file: File | null,
    bankName?: string,
  ) => {
    if (paymentImageOrderId && paymentImageStatus) {
      await executeStatusChange(
        paymentImageOrderId,
        paymentImageStatus,
        file,
        bankName,
      );
      setIsPaymentImageModalOpen(false);
      setPaymentImageOrderId(null);
      setPaymentImageStatus(null);
    }
  };

  const handleVoidConfirm = async () => {
    if (voidPin !== "1219") {
      toast.error("Invalid security PIN");
      return;
    }

    if (voidConfirmOrderId && voidConfirmStatus) {
      await executeStatusChange(voidConfirmOrderId, voidConfirmStatus);
      setIsVoidConfirmOpen(false);
      setVoidConfirmOrderId(null);
      setVoidConfirmStatus(null);
      setVoidPin("");
    }
  };

  const handleViewPaymentProof = (orderId: string) => {
    setViewPaymentProofOrderId(orderId);
    setIsViewPaymentProofModalOpen(true);
  };

  const handleDownloadPaymentProof = (
    imageUrl: string,
    orderNumber: string,
  ) => {
    // Create a temporary anchor element to trigger download
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `payment-proof-${orderNumber}-${Date.now()}.jpg`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Download started");
  };

  const getPaymentProofImage = (orderId: string) => {
    const order = orders.find((o: DisplayOrder) => o.id === orderId);
    return order?.paymentProofImage;
  };

  const handlePrintReceipt = (receiptText: string, orderNumber: string) => {
    posPrinterService
      .print(receiptText)
      .then((printResult: any) => {
        if (!printResult.success) {
          toast.error(`Printer Error (Order #${orderNumber})`, {
            description:
              printResult.error || "Could not print receipt locally.",
          });
        }
      })
      .catch(() => {
        toast.error("Printer Error", {
          description: "POS Printer Service is not reachable.",
        });
      });
  };

  const getAvailableStatuses = (
    currentStatus: OrderStatus,
    userRole: string,
  ): ExtendedOrderStatus[] => {
    const transitions: Partial<Record<OrderStatus, ExtendedOrderStatus[]>> = {
      OPEN: [
        "PAID_TO_CASHIER",
        "PAID_WITHOUT_PRINT",
        "TRANSFERRED_TO_OWNER",
        "TRANSFERRED_WITHOUT_PRINT",
        "VOIDED",
      ],
      VOIDED: [],
      PAID_TO_CASHIER:
        userRole === "cashier" || userRole === "owner"
          ? ["TRANSFERRED_TO_OWNER", "TRANSFERRED_WITHOUT_PRINT", "DISPUTED"]
          : [],
      TRANSFERRED_TO_OWNER: [],
      DISPUTED:
        userRole === "cashier" || userRole === "owner"
          ? ["PAID_TO_CASHIER", "TRANSFERRED_TO_OWNER"]
          : [],
    };

    return transitions[currentStatus] || [];
  };

  // Handle role view change and reset status filter
  const handleRoleViewChange = (view: "all" | "waiter" | "owner") => {
    setRoleView(view);
    // Reset to "all" when switching views so users can see all orders for that view
    setStatusFilter("all");
    setPage(1); // Reset to first page
  };

  const handleSearchQueryChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleWaiterFilterChange = (value: string) => {
    setWaiterFilter(value);
    setPage(1);
  };

  const handleDateFilterChange = (value: string) => {
    setDateFilter(value);
    setPage(1);
  };

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
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold text-foreground">
            Cashier History
          </h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={`inline-block h-2 w-2 rounded-full ${isRealtimeConnected ? "bg-emerald-500" : "bg-muted-foreground"
                }`}
            />
            <span>
              Realtime: {isRealtimeConnected ? "Connected" : "Disconnected"}
            </span>
            {isFetching && <span>· Syncing…</span>}
          </div>
        </div>
        <div className="flex items-start gap-4">
          {/* Cash Flow Switcher - Track cash flow: Waiter (cash to accept) vs Owner (cash to give) */}
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1 shadow-sm">
            {(["waiter", "owner", "all"] as const).map((r) => (
              <button
                key={r}
                onClick={() => handleRoleViewChange(r)}
                className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${roleView === r
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
        </div>
      </header>

      {errorMessage && !isLoading && (
        <ErrorState message={errorMessage} onRetry={() => refetch()} />
      )}

      {isLoading && <LoadingState message="Loading orders..." />}

      {!isLoading && !errorMessage && (
        <>
          <div className="flex justify-end mb-4">
            <WithdrawalModal onSuccess={() => refetch()} />
          </div>

          {/* Enhanced Summary Cards */}
          {orders.length > 0 && (
            <>
              <div
                className={`grid gap-4 ${roleView === "owner"
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
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
                      value={`${(
                        (summary as any).transferredTotal || 0
                      ).toFixed(2)} Br`}
                      icon={<ArrowRightLeft className="h-5 w-5" />}
                      color="purple"
                      subtitle={`${(summary as any).transferredCount || 0
                        } orders`}
                    />
                    <EnhancedStatCard
                      label="Pending Transfer"
                      value={`${((summary as any).pendingTransfer || 0).toFixed(
                        2,
                      )} Br`}
                      icon={<Clock className="h-5 w-5" />}
                      color="amber"
                      subtitle="Ready to transfer"
                    />
                    <EnhancedStatCard
                      label="Total Revenue"
                      value={`${((summary as any).totalRevenue || 0).toFixed(
                        2,
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
                        2,
                      )} Br`}
                    />
                    <EnhancedStatCard
                      label="Paid Orders"
                      value={(summary as any).paidCount || 0}
                      icon={<CheckCircle2 className="h-5 w-5" />}
                      color="green"
                      subtitle={`${((summary as any).paidTotal || 0).toFixed(
                        2,
                      )} Br`}
                    />
                    <EnhancedStatCard
                      label="Total Amount"
                      value={`${((summary as any).totalAmount || 0).toFixed(
                        2,
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
                        2,
                      )} Br`}
                      icon={<CheckCircle2 className="h-5 w-5" />}
                      color="green"
                      subtitle={`${(summary as any).completedCount || 0} orders`}
                    />
                    <EnhancedStatCard
                      label="Pending"
                      value={`${((summary as any).pendingTotal || 0).toFixed(
                        2,
                      )} Br`}
                      icon={<Clock className="h-5 w-5" />}
                      color="amber"
                      subtitle={`${(summary as any).pendingCount || 0} orders`}
                    />
                    <EnhancedStatCard
                      label="Total Revenue"
                      value={`${((summary as any).totalRevenue || 0).toFixed(
                        2,
                      )} Br`}
                      icon={<DollarSign className="h-5 w-5" />}
                      color="emerald"
                    />
                  </>
                )}
              </div>
            </>
          )}

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 p-2 rounded-full border bg-card">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by order number, table, or waiter..."
                value={searchQuery}
                onChange={(e) => handleSearchQueryChange(e.target.value)}
                className="pl-10 pr-10 rounded-full"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchQueryChange("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
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
                      <SelectItem value="OWNER_CONFIRMED">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
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
                    </>
                  )}
                </SelectContent>
              </Select>

              <Select
                value={resolvedDateFilter}
                onValueChange={handleDateFilterChange}
              >
                <SelectTrigger className="w-fit rounded-full shrink-0 space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="latest">
                    Latest Date {dates[0] ? `(${dates[0]})` : ""}
                  </SelectItem>
                  {dates.map((d: string) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {waiterList.length > 0 && (
                <Select
                  value={resolvedWaiterFilter}
                  onValueChange={handleWaiterFilterChange}
                >
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
            <div className="flex items-center gap-3 p-4 rounded-xl border bg-card">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={selectAll}
                  className="text-blue-700 dark:text-blue-400 whitespace-nowrap"
                >
                  Select All (
                  {selectedOrdersStatus
                    ? orders.filter(
                      (o: DisplayOrder) =>
                        o.backendStatus === selectedOrdersStatus,
                    ).length
                    : orders.length}
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
                      setBulkStatusChange(value as ExtendedOrderStatus)
                    }
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Change status to..." />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableStatuses(
                        selectedOrdersStatus,
                        user?.role || "cashier",
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

              <div className="flex items-center gap-2 border-l border-border pl-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setWithoutPrint(!withoutPrint)}
                    className={`flex items-center justify-center h-4 w-4 rounded-sm border border-primary transition-colors ${withoutPrint ? "bg-primary text-primary-foreground" : "bg-transparent"}`}
                  >
                    {withoutPrint && <CheckSquare className="h-3.5 w-3.5" />}
                  </div>
                  <span className="text-sm font-medium text-foreground select-none pointer-events-none">
                    Without Print
                  </span>
                </label>
              </div>

              <div className="flex-1" />

              <Button
                variant="ghost"
                onClick={clearSelection}
                className="text-gray-600 dark:text-gray-400 whitespace-nowrap"
              >
                <Square className="h-4 w-4 mr-2" />
                Unselect All
              </Button>
            </div>
          )}

          {/* Table */}
          <div className="rounded-xl bg-card border overflow-hidden">
            <div className="flex items-center justify-end gap-2 px-3 py-2 border-b bg-card">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                disabled={isFetching}
                aria-label="Refresh orders"
                title="Refresh"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
            {isFetching && !isLoading ? (
              <TableSkeleton columnCount={7} rowCount={limit} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Waiter</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Order Items</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-gray-500 dark:text-gray-400"
                      >
                        No orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedOrders.map((o: DisplayOrder) => {
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
                                      o.backendStatus,
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
                              className={`hover:opacity-70 ${!canSelect
                                ? "opacity-30 cursor-not-allowed"
                                : ""
                                }`}
                              title={
                                isTerminalStatus
                                  ? `Orders with ${getStatusBadgeText(
                                    o.backendStatus,
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
                          <TableCell>{o.waiterName || "N/A"}</TableCell>
                          <TableCell>{o.totalPrice.toFixed(2)} Br</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(o.status)}>
                              {getStatusBadgeText(
                                        o.backendStatus,
                                        o.paymentMethod as
                                          | "cash"
                                          | "mobile_banking"
                                          | undefined,
                                      )}
                            </Badge>
                          </TableCell>
                          <TableCell>{o.firstItemName || "N/A"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-foreground"
                                onClick={() => {
                                  setSelectedOrderId(o.id);
                                  setIsModalOpen(true);
                                }}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {o.backendStatus === "OPEN" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-foreground"
                                  onClick={() => {
                                    setAddItemsOrderId(o.id);
                                    setIsAddItemsOpen(true);
                                  }}
                                  title="Add Items"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              )}
                              {getAvailableStatuses(
                                o.backendStatus,
                                user?.role || "cashier",
                              ).length > 0 ? (
                                <div className="flex items-center gap-1">
                                  <Select
                                    value={o.backendStatus}
                                    onValueChange={(value) => {
                                      if (value !== o.backendStatus) {
                                        handleStatusChange(
                                          o.id,
                                          value as ExtendedOrderStatus,
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
                                          {getStatusBadgeText(
                                        o.backendStatus,
                                        o.paymentMethod as
                                          | "cash"
                                          | "mobile_banking"
                                          | undefined,
                                      )}
                                        </div>
                                      </SelectItem>
                                      {getAvailableStatuses(
                                        o.backendStatus,
                                        user?.role || "cashier",
                                      ).map((status) => (
                                        <SelectItem key={status} value={status}>
                                          <div className="flex items-center justify-between gap-2 w-full">
                                            <div className="flex items-center gap-2">
                                              {getStatusIcon(status)}
                                              {getStatusBadgeText(status)}
                                            </div>
                                            {(status === "PAID_TO_CASHIER" ||
                                              status === "PAID_WITHOUT_PRINT" ||
                                              status === "TRANSFERRED_TO_OWNER" ||
                                              status === "TRANSFERRED_WITHOUT_PRINT") && (
                                              <div className="shrink-0 flex items-center text-gray-600 dark:text-gray-400">
                                                {getPaymentMethodIcon(
                                                  paymentMethods.get(o.id) ||
                                                  (o.paymentMethod as "cash" | "mobile_banking") ||
                                                  "cash",
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {(o.backendStatus === "OPEN" &&
                                    getAvailableStatuses(
                                      o.backendStatus,
                                      user?.role || "cashier",
                                    ).includes("PAID_TO_CASHIER")) ||
                                  (o.backendStatus === "PAID_TO_CASHIER" &&
                                    getAvailableStatuses(
                                      o.backendStatus,
                                      user?.role || "cashier",
                                    ).includes("TRANSFERRED_TO_OWNER")) ? (
                                    <PaymentMethodSelector
                                      value={
                                        paymentMethods.get(o.id) ||
                                        (o.paymentMethod as "cash" | "mobile_banking") ||
                                        "cash"
                                      }
                                      onChange={(method) => {
                                        handlePaymentMethodChange(
                                          o.id,
                                          method,
                                        );
                                      }}
                                      disabled={isUpdating}
                                    />
                                  ) : null}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  No actions
                                </span>
                              )}
                              {/* Payment Proof Icon - Show when order is paid with mobile banking and has proof */}
                              {o.backendStatus === "PAID_TO_CASHIER" &&
                                o.paymentProofImage?.url &&
                                (o.paymentMethod === "mobile_banking" ||
                                  paymentMethods.get(o.id) ===
                                  "mobile_banking") && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                    onClick={() => handleViewPaymentProof(o.id)}
                                    title="View Payment Proof"
                                  >
                                    <ImageIcon className="h-4 w-4" />
                                  </Button>
                                )}
                            </div>
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
          {paginationInfo.totalPages > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border rounded-lg bg-card">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Showing{" "}
                  {Math.min(
                    (paginationInfo.page - 1) * paginationInfo.limit + 1,
                    paginationInfo.total,
                  )}{" "}
                  to{" "}
                  {Math.min(
                    paginationInfo.page * paginationInfo.limit,
                    paginationInfo.total,
                  )}{" "}
                  of {paginationInfo.total} orders
                </span>
                <Select
                  value={limit.toString()}
                  onValueChange={(value) => {
                    setLimit(Number(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  per page
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!paginationInfo.hasPreviousPage || isLoading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from(
                    { length: Math.min(5, paginationInfo.totalPages) },
                    (_, i) => {
                      let pageNum;
                      if (paginationInfo.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (paginationInfo.page <= 3) {
                        pageNum = i + 1;
                      } else if (
                        paginationInfo.page >=
                        paginationInfo.totalPages - 2
                      ) {
                        pageNum = paginationInfo.totalPages - 4 + i;
                      } else {
                        pageNum = paginationInfo.page - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={
                            paginationInfo.page === pageNum
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => setPage(pageNum)}
                          disabled={isLoading}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    },
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((p) => Math.min(paginationInfo.totalPages, p + 1))
                  }
                  disabled={!paginationInfo.hasNextPage || isLoading}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Order Details Modal */}
      <OrderDetailsModal
        orderId={selectedOrderId}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />

      <AddItemsToOrderModal
        orderId={addItemsOrderId}
        open={isAddItemsOpen}
        onOpenChange={setIsAddItemsOpen}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* Void Confirmation Modal */}
      <AlertDialog open={isVoidConfirmOpen} onOpenChange={setIsVoidConfirmOpen}>
        <AlertDialogContent className="bg-card border-border shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Void Order Confirmation
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to void this order? This action cannot be
              undone. Please enter the security PIN to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              type="password"
              placeholder="Enter 4-digit PIN"
              value={voidPin}
              onChange={(e) => setVoidPin(e.target.value)}
              className="text-center text-2xl tracking-[1em] font-bold h-12"
              maxLength={4}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsVoidConfirmOpen(false);
                setVoidConfirmOrderId(null);
                setVoidConfirmStatus(null);
                setVoidPin("");
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleVoidConfirm();
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={voidPin.length !== 4}
            >
              Confirm Void
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
            ? orders.find((o: DisplayOrder) => o.id === paymentImageOrderId)
              ?.orderNumber
            : undefined
        }
      />

      {/* Payment Proof View Modal */}
      <Dialog
        open={isViewPaymentProofModalOpen}
        onOpenChange={setIsViewPaymentProofModalOpen}
      >
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Payment Proof
            </DialogTitle>
            <DialogDescription>
              {viewPaymentProofOrderId &&
                orders.find(
                  (o: DisplayOrder) => o.id === viewPaymentProofOrderId,
                )?.orderNumber && (
                  <span>
                    Order #{" "}
                    {
                      orders.find(
                        (o: DisplayOrder) => o.id === viewPaymentProofOrderId,
                      )?.orderNumber
                    }
                  </span>
                )}
            </DialogDescription>
          </DialogHeader>
          {viewPaymentProofOrderId && (
            <div className="mt-4">
              {getPaymentProofImage(viewPaymentProofOrderId)?.url ? (
                <div className="space-y-4">
                  <div className="relative w-full rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden bg-gray-50 dark:bg-slate-900">
                    <img
                      src={getPaymentProofImage(viewPaymentProofOrderId)?.url}
                      alt="Payment Proof"
                      className="w-full h-auto max-h-[500px] object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const imageUrl = getPaymentProofImage(
                          viewPaymentProofOrderId,
                        )?.url;
                        const orderNumber = orders.find(
                          (o: DisplayOrder) => o.id === viewPaymentProofOrderId,
                        )?.orderNumber;
                        if (imageUrl && orderNumber) {
                          handleDownloadPaymentProof(imageUrl, orderNumber);
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsViewPaymentProofModalOpen(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Payment proof image not found
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
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
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
