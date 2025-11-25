"use client";

import {
  useState,
  useMemo,
  useEffect,
  useRef,
  startTransition,
  type ReactNode,
} from "react";
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
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ArrowRightLeft,
  ShieldCheck,
  Ban,
  Eye,
  TrendingUp,
  Users,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  useGetOwnerOrdersQuery,
  useUpdateOrderStatusMutation,
  useBulkUpdateOrderStatusMutation,
  OrderStatus,
  Order as RTKOrder,
  OrderItem,
  PaginationMeta,
  PaginatedOrdersResponse,
} from "@/stores/features/orders/ordersApi";
import { useListStaffQuery } from "@/stores/features/staff/staffApi";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";

// -------------------- Constants & Mappings -------------------- //

type OwnerStatus =
  | "AWAITING_PAYMENT"
  | "AWAITING_TRANSFER"
  | "AWAITING_CONFIRMATION"
  | "CONFIRMED"
  | "CANCELLED"
  | "NEEDS_REVIEW";

const OWNER_STATUS_MAP: Record<OrderStatus, OwnerStatus> = {
  OPEN: "AWAITING_PAYMENT",
  PAID_TO_CASHIER: "AWAITING_TRANSFER",
  TRANSFERRED_TO_OWNER: "AWAITING_CONFIRMATION",
  OWNER_CONFIRMED: "CONFIRMED",
  VOIDED: "CANCELLED",
  DISPUTED: "NEEDS_REVIEW",
};

const STATUS_CONFIG: Record<
  OwnerStatus,
  { text: string; color: string; icon: ReactNode }
> = {
  AWAITING_PAYMENT: {
    text: "Awaiting Payment",
    color:
      "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
    icon: <AlertCircle className="h-4 w-4" />,
  },
  AWAITING_TRANSFER: {
    text: "Awaiting Transfer",
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  AWAITING_CONFIRMATION: {
    text: "Awaiting Confirmation",
    color:
      "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
    icon: <ArrowRightLeft className="h-4 w-4" />,
  },
  CONFIRMED: {
    text: "Confirmed",
    color:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
    icon: <ShieldCheck className="h-4 w-4" />,
  },
  CANCELLED: {
    text: "Cancelled",
    color: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
    icon: <Ban className="h-4 w-4" />,
  },
  NEEDS_REVIEW: {
    text: "Needs Review",
    color:
      "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
    icon: <XCircle className="h-4 w-4" />,
  },
};

type OwnerOrderRow = {
  id: string;
  orderNumber?: string;
  tableNumber?: string | number;
  totalPrice: number;
  date?: string;
  waiterName?: string;
  cashierName?: string;
  backendStatus: OrderStatus;
  ownerStatus: OwnerStatus;
  statusText: string;
  statusColor: string;
  statusIcon: ReactNode;
  items: OrderItem[];
  note?: string;
};

type StaffRecord = {
  _id?: string;
  id?: string;
  name?: string;
};

type StaffOption = {
  id: string;
  name: string;
};

const formatDate = (date?: string) => {
  if (!date) return "—";
  return new Date(date).toISOString().split("T")[0];
};

const getDateRange = () => {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  return {
    today: {
      start: formatDate(today.toISOString()),
      end: formatDate(today.toISOString()),
    },
    thisWeek: {
      start: formatDate(startOfWeek.toISOString()),
      end: formatDate(today.toISOString()),
    },
    thisMonth: {
      start: formatDate(startOfMonth.toISOString()),
      end: formatDate(today.toISOString()),
    },
  };
};

const formatDateTime = (date?: string) => {
  if (!date) return "—";
  return new Date(date).toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCurrency = (amount: number) =>
  `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} Br`;

const mapStaffToOptions = (staff?: StaffRecord[] | null): StaffOption[] => {
  if (!staff) return [];
  return staff
    .map((member) => ({
      id: member?._id || member?.id || "",
      name: member?.name || "Unnamed",
    }))
    .filter((option) => Boolean(option.id));
};

const getErrorMessage = (err: unknown) => {
  if (!err) return null;
  if (
    typeof err === "object" &&
    err !== null &&
    "data" in err &&
    typeof (err as { data?: { message?: string } }).data === "object"
  ) {
    const data = (err as { data?: { message?: string } }).data;
    if (data?.message) {
      return data.message;
    }
  }
  if (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as { message?: string }).message === "string"
  ) {
    return (err as { message?: string }).message;
  }
  return "Failed to load orders";
};

// -------------------- Main Component -------------------- //

export function OwnerHistory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cashierFilter, setCashierFilter] = useState("all");
  const [staffFilter, setStaffFilter] = useState("all");
  const [dateRangePreset, setDateRangePreset] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [allCashierFilter, setAllCashierFilter] = useState<"all" | "cashier">(
    "all"
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailOrder, setDetailOrder] = useState<OwnerOrderRow | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const prevFiltersRef = useRef({
    statusFilter,
    cashierFilter,
    staffFilter,
    searchQuery,
    allCashierFilter,
  });

  const datePresets = getDateRange();

  // Handle date range preset change and update dates accordingly
  const handleDateRangePresetChange = (value: string) => {
    setDateRangePreset(value);
    if (value === "all") {
      setStartDate("");
      setEndDate("");
    } else if (value !== "custom") {
      const range = datePresets[value as keyof typeof datePresets];
      if (range) {
        setStartDate(range.start);
        setEndDate(range.end);
      }
    }
    // For "custom", keep existing dates or leave empty
    setPage(1); // Reset to first page when date range changes
  };

  // Reset page when filters change
  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (
      prev.statusFilter !== statusFilter ||
      prev.cashierFilter !== cashierFilter ||
      prev.staffFilter !== staffFilter ||
      prev.searchQuery !== searchQuery ||
      prev.allCashierFilter !== allCashierFilter
    ) {
      startTransition(() => {
        setPage(1);
      });
      prevFiltersRef.current = {
        statusFilter,
        cashierFilter,
        staffFilter,
        searchQuery,
        allCashierFilter,
      };
    }
  }, [statusFilter, cashierFilter, staffFilter, searchQuery, allCashierFilter]);

  // When "Cashier Only" is selected, fetch only OWNER_CONFIRMED and TRANSFERRED_TO_OWNER
  const shouldFetchCashierOnly =
    allCashierFilter === "cashier" && statusFilter === "all";

  const {
    data: ordersDataConfirmed,
    isLoading: isLoadingConfirmed,
    error: errorConfirmed,
    refetch: refetchConfirmed,
  } = useGetOwnerOrdersQuery(
    {
      status: "OWNER_CONFIRMED" as OrderStatus,
      cashierId: cashierFilter !== "all" ? cashierFilter : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: searchQuery.trim() || undefined,
      page: shouldFetchCashierOnly ? page : undefined,
      limit: shouldFetchCashierOnly ? limit : undefined,
    },
    { skip: !shouldFetchCashierOnly }
  );

  const {
    data: ordersDataTransferred,
    isLoading: isLoadingTransferred,
    error: errorTransferred,
    refetch: refetchTransferred,
  } = useGetOwnerOrdersQuery(
    {
      status: "TRANSFERRED_TO_OWNER" as OrderStatus,
      cashierId: cashierFilter !== "all" ? cashierFilter : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: searchQuery.trim() || undefined,
      page: shouldFetchCashierOnly ? page : undefined,
      limit: shouldFetchCashierOnly ? limit : undefined,
    },
    { skip: !shouldFetchCashierOnly }
  );

  // Regular query when not in "Cashier Only" mode or when status filter is set
  const {
    data: ordersData,
    isLoading,
    error,
    refetch,
  } = useGetOwnerOrdersQuery(
    {
      status:
        allCashierFilter === "cashier" && statusFilter !== "all"
          ? (statusFilter as OrderStatus)
          : statusFilter !== "all"
          ? (statusFilter as OrderStatus)
          : undefined,
      waiterId:
        statusFilter === "OPEN" && staffFilter !== "all"
          ? staffFilter
          : undefined,
      cashierId: cashierFilter !== "all" ? cashierFilter : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: searchQuery.trim() || undefined,
      page: !shouldFetchCashierOnly ? page : undefined,
      limit: !shouldFetchCashierOnly ? limit : undefined,
    },
    { skip: shouldFetchCashierOnly }
  );

  // Extract orders and pagination from responses
  const getOrdersAndPagination = (
    data: PaginatedOrdersResponse | RTKOrder[] | undefined
  ) => {
    if (!data) return { orders: [], pagination: null };
    if (Array.isArray(data)) {
      return { orders: data, pagination: null };
    }
    if ("orders" in data && "pagination" in data) {
      return {
        orders: data.orders,
        pagination: data.pagination as PaginationMeta,
      };
    }
    return { orders: [], pagination: null };
  };

  // Combine data from both queries when in "Cashier Only" mode
  const combinedOrdersData = useMemo(() => {
    if (shouldFetchCashierOnly) {
      const confirmed = getOrdersAndPagination(ordersDataConfirmed);
      const transferred = getOrdersAndPagination(ordersDataTransferred);
      // For combined mode, we'll use client-side pagination
      return [...confirmed.orders, ...transferred.orders];
    }
    const result = getOrdersAndPagination(ordersData);
    return result.orders;
  }, [
    shouldFetchCashierOnly,
    ordersDataConfirmed,
    ordersDataTransferred,
    ordersData,
  ]);

  // Get pagination info
  const paginationInfo = useMemo(() => {
    if (shouldFetchCashierOnly) {
      // Client-side pagination for combined mode
      const total = combinedOrdersData.length;
      const totalPages = Math.ceil(total / limit);
      return {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    }
    const result = getOrdersAndPagination(ordersData);
    return (
      result.pagination || {
        page: 1,
        limit,
        total: result.orders.length,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      }
    );
  }, [shouldFetchCashierOnly, ordersData, combinedOrdersData, page, limit]);

  const isLoadingCombined = shouldFetchCashierOnly
    ? isLoadingConfirmed || isLoadingTransferred
    : isLoading;
  const errorCombined = shouldFetchCashierOnly
    ? errorConfirmed || errorTransferred
    : error;

  const [updateStatus, { isLoading: updating }] =
    useUpdateOrderStatusMutation();
  const [bulkUpdate, { isLoading: bulkUpdating }] =
    useBulkUpdateOrderStatusMutation();

  // Staff lists
  const { data: waitersData } = useListStaffQuery({
    role: "waiter",
    status: "active",
    limit: 100,
  });
  const { data: cashiersData } = useListStaffQuery({
    role: "cashier",
    limit: 100,
  });

  const waiters: StaffOption[] = useMemo(
    () => mapStaffToOptions(waitersData?.staff as StaffRecord[] | undefined),
    [waitersData]
  );
  const cashiers: StaffOption[] = useMemo(
    () => mapStaffToOptions(cashiersData?.staff as StaffRecord[] | undefined),
    [cashiersData]
  );

  // Refetch function that handles both query modes
  const handleRefetch = () => {
    if (shouldFetchCashierOnly) {
      // Refetch both queries
      refetchConfirmed();
      refetchTransferred();
    } else {
      refetch();
    }
  };

  // Transform orders and apply client-side pagination if needed
  const orders: OwnerOrderRow[] = useMemo(() => {
    if (!combinedOrdersData || combinedOrdersData.length === 0) return [];

    let list = combinedOrdersData;

    // Apply client-side pagination for combined mode
    if (shouldFetchCashierOnly) {
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      list = combinedOrdersData.slice(startIndex, endIndex);
    }

    return list.map((o: RTKOrder): OwnerOrderRow => {
      const ownerStatus: OwnerStatus =
        OWNER_STATUS_MAP[o.status] || "AWAITING_PAYMENT";
      const config = STATUS_CONFIG[ownerStatus];

      return {
        id: o.id || o._id || "",
        orderNumber: o.orderNumber,
        tableNumber: o.tableNumber,
        totalPrice: o.totalAmount,
        date: o.placedAt || o.createdAt,
        waiterName:
          typeof o.waiterId === "object" ? o.waiterId?.name || "" : "",
        cashierName:
          typeof o.cashierId === "object" ? o.cashierId?.name || "" : "",
        backendStatus: o.status,
        ownerStatus,
        statusText: config.text,
        statusColor: config.color,
        statusIcon: config.icon,
        items: Array.isArray(o.items) ? o.items : [],
        note: o.note,
      };
    });
  }, [combinedOrdersData, shouldFetchCashierOnly, page, limit]);

  // Client-side filtering
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // When "Cashier Only" is selected, show only orders with cashier
      // Status filtering is already done at API level
      if (allCashierFilter === "cashier") {
        if (!o.cashierName) return false;
      }

      // Search filtering
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return [o.orderNumber, o.tableNumber, o.waiterName, o.cashierName].some(
        (field) =>
          String(field ?? "")
            .toLowerCase()
            .includes(q)
      );
    });
  }, [orders, searchQuery, allCashierFilter]);

  // Summary stats
  const summary = useMemo(() => {
    const paidToCashier = filteredOrders.filter(
      (o) => o.backendStatus === "PAID_TO_CASHIER"
    );
    const transferred = filteredOrders.filter(
      (o) => o.backendStatus === "TRANSFERRED_TO_OWNER"
    );
    const confirmed = filteredOrders.filter(
      (o) => o.backendStatus === "OWNER_CONFIRMED"
    );
    const voided = filteredOrders.filter((o) => o.backendStatus === "VOIDED");
    const open = filteredOrders.filter((o) => o.backendStatus === "OPEN");

    return {
      total: filteredOrders.length,
      open: open.length,
      received: paidToCashier.reduce(
        (sum: number, order: OwnerOrderRow) => sum + order.totalPrice,
        0
      ),
      receivedCount: paidToCashier.length,
      toConfirm: transferred.reduce(
        (sum: number, order: OwnerOrderRow) => sum + order.totalPrice,
        0
      ),
      toConfirmCount: transferred.length,
      confirmed: confirmed.reduce(
        (sum: number, order: OwnerOrderRow) => sum + order.totalPrice,
        0
      ),
      confirmedCount: confirmed.length,
      voided: voided.length,
      voidedAmount: voided.reduce(
        (sum: number, order: OwnerOrderRow) => sum + order.totalPrice,
        0
      ),
    };
  }, [filteredOrders]);

  // Selection logic
  const canConfirmSelected =
    selectedIds.size > 0 &&
    filteredOrders.some(
      (o) => selectedIds.has(o.id) && o.backendStatus === "TRANSFERRED_TO_OWNER"
    );

  const toggleSelect = (id: string, status: OrderStatus) => {
    if (status !== "TRANSFERRED_TO_OWNER") {
      toast.error("Only transferred orders can be confirmed");
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllTransferable = () => {
    const transferable = filteredOrders
      .filter((o) => o.backendStatus === "TRANSFERRED_TO_OWNER")
      .map((o) => o.id);
    if (transferable.length === 0) {
      toast.error("No transferred orders to select");
      return;
    }
    setSelectedIds(new Set(transferable));
  };

  const confirmBulk = async () => {
    const ids = Array.from(selectedIds);
    try {
      const res = await bulkUpdate({
        orderIds: ids,
        status: "OWNER_CONFIRMED",
      }).unwrap();
      toast.success(`Confirmed ${res.updated?.length || ids.length} order(s)`);
      setSelectedIds(new Set());
      handleRefetch();
    } catch {
      toast.error("Failed to confirm orders");
    }
  };

  const handleViewDetails = (order: OwnerOrderRow) => {
    setDetailOrder(order);
    setDetailsOpen(true);
  };

  const handleDetailsOpenChange = (open: boolean) => {
    setDetailsOpen(open);
    if (!open) {
      setDetailOrder(null);
    }
  };

  const errorMsg = errorCombined ? getErrorMessage(errorCombined) : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Owner History</h1>
          {orders.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Total: {orders.length} orders
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border bg-background p-1">
            {(["all", "cashier"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setAllCashierFilter(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${
                  allCashierFilter === tab
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "all" ? "All" : "Cashier Only"}
              </button>
            ))}
          </div>

          <Select
            value={dateRangePreset}
            onValueChange={handleDateRangePresetChange}
          >
            <SelectTrigger className="w-48">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
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
            <div className="flex gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          )}
        </div>
      </header>

      {errorMsg && <ErrorState message={errorMsg} onRetry={handleRefetch} />}
      {isLoadingCombined && <LoadingState message="Loading orders..." />}

      {!isLoadingCombined && !errorMsg && (
        <>
          {/* Stats */}
          {filteredOrders.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard
                label="Open Orders"
                value={summary.open}
                icon={<AlertCircle />}
                color="blue"
              />
              <StatCard
                label="To be Received"
                value={`${summary.received.toFixed(2)} Br`}
                subtitle={`${summary.receivedCount} orders`}
                icon={<TrendingUp />}
                color="emerald"
              />
              <StatCard
                label="Awaiting Confirm"
                value={`${summary.toConfirm.toFixed(2)} Br`}
                subtitle={`${summary.toConfirmCount} transferable`}
                icon={<ArrowRightLeft />}
                color="amber"
              />
              <StatCard
                label="Confirmed"
                value={`${summary.confirmed.toFixed(2)} Br`}
                subtitle={`${summary.confirmedCount} orders`}
                icon={<ShieldCheck />}
                color="indigo"
              />
              <StatCard
                label="Voided"
                value={summary.voided}
                subtitle={`${summary.voidedAmount.toFixed(2)} Br`}
                icon={<Ban />}
                color="red"
              />
            </div>
          )}

          {/* Search & Filters */}
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search order, table, waiter, cashier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setStaffFilter("all");
                }}
              >
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(STATUS_CONFIG)
                    .filter(([key]) => {
                      // When "Cashier Only" is selected, only show TRANSFERRED_TO_OWNER and OWNER_CONFIRMED
                      if (allCashierFilter === "cashier") {
                        const backendStatus = Object.keys(
                          OWNER_STATUS_MAP
                        ).find(
                          (k) => OWNER_STATUS_MAP[k as OrderStatus] === key
                        ) as OrderStatus;
                        return (
                          backendStatus === "TRANSFERRED_TO_OWNER" ||
                          backendStatus === "OWNER_CONFIRMED"
                        );
                      }
                      return true;
                    })
                    .map(([key, cfg]) => (
                      <SelectItem
                        key={key}
                        value={
                          Object.keys(OWNER_STATUS_MAP).find(
                            (k) => OWNER_STATUS_MAP[k as OrderStatus] === key
                          )!
                        }
                      >
                        <div className="flex items-center gap-2">
                          {cfg.icon} {cfg.text}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {statusFilter === "OPEN" && waiters.length > 0 && (
                <Select value={staffFilter} onValueChange={setStaffFilter}>
                  <SelectTrigger>
                    <Users className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Waiter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Waiters</SelectItem>
                    {waiters.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {cashiers.length > 0 && (
                <Select value={cashierFilter} onValueChange={setCashierFilter}>
                  <SelectTrigger>
                    <Users className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Cashier" />
                  </SelectTrigger>
                  <SelectContent className="w-fit">
                    <SelectItem value="all">All Cashiers</SelectItem>
                    {cashiers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAllTransferable}
                >
                  Select All Transferable ({summary.toConfirmCount})
                </Button>
                <span className="text-sm font-medium">
                  {selectedIds.size} selected
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={confirmBulk}
                  disabled={bulkUpdating || !canConfirmSelected}
                >
                  {bulkUpdating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-2 h-4 w-4" />
                  )}
                  {bulkUpdating ? "Confirming..." : "Confirm Transfer"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="border rounded-xl overflow-hidden bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12" />
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
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-12 text-muted-foreground"
                    >
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((o) => {
                    const selectable =
                      o.backendStatus === "TRANSFERRED_TO_OWNER";
                    const selected = selectedIds.has(o.id);
                    return (
                      <TableRow key={o.id}>
                        <TableCell>
                          <button
                            onClick={() =>
                              selectable && toggleSelect(o.id, o.backendStatus)
                            }
                            className={
                              selectable ? "cursor-pointer" : "opacity-30"
                            }
                            title={
                              selectable
                                ? "Select"
                                : "Only transferred orders can be confirmed"
                            }
                          >
                            {selected ? (
                              <CheckSquare className="text-primary" />
                            ) : (
                              <Square className="text-muted-foreground" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="font-medium">
                          {o.orderNumber}
                        </TableCell>
                        <TableCell>{o.waiterName || "—"}</TableCell>
                        <TableCell>{o.cashierName || "—"}</TableCell>
                        <TableCell>{o.totalPrice.toFixed(2)} Br</TableCell>
                        <TableCell>
                          <Badge className={o.statusColor}>
                            {o.statusIcon}{" "}
                            <span className="ml-1">{o.statusText}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(o.date)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewDetails(o)}
                              aria-label="View order details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {o.backendStatus === "TRANSFERRED_TO_OWNER" && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  updateStatus({
                                    id: o.id,
                                    status: "OWNER_CONFIRMED",
                                  })
                                    .unwrap()
                                    .then(() => {
                                      toast.success("Confirmed");
                                      handleRefetch();
                                    })
                                    .catch(() => toast.error("Failed"))
                                }
                                disabled={updating}
                              >
                                {updating ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ShieldCheck className="h-4 w-4 mr-1" />
                                )}
                                <span className="hidden sm:inline">
                                  Confirm
                                </span>
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
          </div>

          {/* Pagination Controls */}
          {paginationInfo.totalPages > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border rounded-lg bg-background">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Showing{" "}
                  {Math.min(
                    (paginationInfo.page - 1) * paginationInfo.limit + 1,
                    paginationInfo.total
                  )}{" "}
                  to{" "}
                  {Math.min(
                    paginationInfo.page * paginationInfo.limit,
                    paginationInfo.total
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
                <span className="text-sm text-muted-foreground">per page</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={
                    !paginationInfo.hasPreviousPage || isLoadingCombined
                  }
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
                          disabled={isLoadingCombined}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    }
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((p) => Math.min(paginationInfo.totalPages, p + 1))
                  }
                  disabled={!paginationInfo.hasNextPage || isLoadingCombined}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      <Dialog
        open={detailsOpen && !!detailOrder}
        onOpenChange={handleDetailsOpenChange}
      >
        {detailOrder && (
          <DialogContent className="flex max-w-2xl flex-col overflow-hidden border-none bg-background p-0 shadow-2xl dark:bg-background max-h-[90vh] sm:max-h-[85vh]">
            <DialogHeader className="shrink-0 border-b border-border bg-muted/40 px-6 pt-6 pb-4 dark:bg-muted/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Order Details
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <DialogTitle className="text-2xl font-semibold">
                    #{detailOrder.orderNumber || detailOrder.id.slice(-6)}
                  </DialogTitle>
                  <DialogDescription>
                    {formatDateTime(detailOrder.date)}
                  </DialogDescription>
                  <p className="text-xs">
                    <span className="font-bold">Table </span> -{" "}
                    {detailOrder.tableNumber}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Badge className={`w-fit ${detailOrder.statusColor}`}>
                    {detailOrder.statusIcon}
                    <span className="ml-1">{detailOrder.statusText}</span>
                  </Badge>
                  <p className="text-xs">
                    <span className="font-bold">Cashier </span> -{" "}
                    {detailOrder.cashierName || "—"}
                  </p>
                  <p className="text-xs">
                    <span className="font-bold">Waiter </span> -{" "}
                    {detailOrder.waiterName || "—"}
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-2">
              <div className="flex flex-col gap-6">
                {detailOrder.note && (
                  <div className="rounded-2xl border bg-muted/20 p-4 dark:bg-muted/10">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Order Note
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {detailOrder.note}
                    </p>
                  </div>
                )}

                <OrderItemsList items={detailOrder.items} />
              </div>
            </div>

            <DialogFooter className="shrink-0 px-6 pb-6">
              <div className="flex w-full items-center justify-end gap-3">
                {detailOrder.backendStatus === "TRANSFERRED_TO_OWNER" && (
                  <Button
                    onClick={() =>
                      updateStatus({
                        id: detailOrder.id,
                        status: "OWNER_CONFIRMED",
                      })
                        .unwrap()
                        .then(() => {
                          toast.success("Transfer confirmed successfully");
                          handleRefetch();
                          handleDetailsOpenChange(false);
                        })
                        .catch(() => toast.error("Failed to confirm transfer"))
                    }
                    disabled={updating}
                    className="w-full sm:w-auto"
                  >
                    {updating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Confirm Transfer
                      </>
                    )}
                  </Button>
                )}
                <DialogClose asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    Close
                  </Button>
                </DialogClose>
              </div>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

// Simple reusable stat card
type StatCardColor = "blue" | "emerald" | "amber" | "indigo" | "red";

type StatCardProps = {
  label: string;
  value: number | string;
  subtitle?: string;
  icon?: ReactNode;
  color?: StatCardColor;
};

function StatCard({
  label,
  value,
  subtitle,
  icon,
  color = "blue",
}: StatCardProps) {
  const colors: Record<StatCardColor, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className={`p-4 rounded-lg border ${colors[color]} bg-opacity-50`}>
      <div className="flex justify-between items-start mb-2">
        <p className="text-xs font-medium uppercase opacity-80">{label}</p>
        <div className="opacity-70">{icon}</div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {subtitle && <p className="text-xs opacity-70 mt-1">{subtitle}</p>}
    </div>
  );
}

function OrderItemsList({ items }: { items: OrderItem[] }) {
  const hasItems = items.length > 0;

  const getItemName = (item: OrderItem) => {
    if (item.nameSnapshot) return item.nameSnapshot;
    if (typeof item.itemId === "object") {
      return item.itemId?.name || "Unnamed Item";
    }
    return "Unnamed Item";
  };

  const getItemKey = (item: OrderItem, index: number) => {
    if (typeof item.itemId === "string") return item.itemId;
    if (typeof item.itemId === "object" && item.itemId?._id) {
      return item.itemId._id;
    }
    return `${getItemName(item)}-${index}`;
  };

  return (
    <div className="rounded-2xl border bg-background/70 p-4 shadow-sm dark:bg-background/30">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Order Items
          </p>
          <p className="text-sm font-semibold text-foreground">
            {hasItems ? `${items.length} item(s)` : "No items"}
          </p>
        </div>
      </div>
      {hasItems ? (
        <div className="mt-4 divide-y divide-border">
          {items.map((item, index) => {
            const name = getItemName(item);
            const lineTotal = item.qty * item.priceSnapshot;
            return (
              <div
                key={getItemKey(item, index)}
                className="flex items-start justify-between gap-4 py-3 first:pt-0"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{name}</p>
                  <p className="text-xs text-muted-foreground">
                    Qty {item.qty} · {formatCurrency(item.priceSnapshot)}
                  </p>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(lineTotal)}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          No items available for this order.
        </p>
      )}
    </div>
  );
}
