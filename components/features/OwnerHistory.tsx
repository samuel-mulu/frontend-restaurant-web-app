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
  ArrowRightLeft,
  ShieldCheck,
  Ban,
  Eye,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  useGetOwnerOrdersQuery,
  useUpdateOrderStatusMutation,
  useBulkUpdateOrderStatusMutation,
  OrderStatus,
  Order as RTKOrder,
} from "@/stores/features/orders/ordersApi";
import { useListStaffQuery } from "@/stores/features/staff/staffApi";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";

// -------------------- Constants & Mappings -------------------- //

const OWNER_STATUS_MAP: Record<OrderStatus, string> = {
  OPEN: "AWAITING_PAYMENT",
  PAID_TO_CASHIER: "AWAITING_TRANSFER",
  TRANSFERRED_TO_OWNER: "AWAITING_CONFIRMATION",
  OWNER_CONFIRMED: "CONFIRMED",
  VOIDED: "CANCELLED",
  DISPUTED: "NEEDS_REVIEW",
};

const STATUS_CONFIG: Record<
  string,
  { text: string; color: string; icon: React.ReactNode }
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

const formatDate = (date: string) => new Date(date).toISOString().split("T")[0];

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
  };

  // Fetch orders
  const {
    data: ordersData,
    isLoading,
    error,
    refetch,
  } = useGetOwnerOrdersQuery({
    status: statusFilter !== "all" ? (statusFilter as OrderStatus) : undefined,
    waiterId:
      statusFilter === "OPEN" && staffFilter !== "all"
        ? staffFilter
        : undefined,
    cashierId: cashierFilter !== "all" ? cashierFilter : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    search: searchQuery.trim() || undefined,
  });

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

  const waiters = useMemo(
    () =>
      waitersData?.staff?.map((s) => ({ id: s._id || s.id, name: s.name })) ||
      [],
    [waitersData]
  );
  const cashiers = useMemo(
    () =>
      cashiersData?.staff?.map((s) => ({ id: s._id || s.id, name: s.name })) ||
      [],
    [cashiersData]
  );

  // Transform orders
  const orders = useMemo(() => {
    if (!ordersData) return [];
    const list = Array.isArray(ordersData)
      ? ordersData
      : ordersData.orders || [];
    return list.map((o: RTKOrder) => {
      const ownerStatus = OWNER_STATUS_MAP[o.status] || "AWAITING_PAYMENT";
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
      };
    });
  }, [ordersData]);

  // Client-side filtering
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (allCashierFilter === "cashier" && !o.cashierName) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return [o.orderNumber, o.tableNumber, o.waiterName, o.cashierName].some(
        (field) => field?.toLowerCase().includes?.(q)
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
      received: paidToCashier.reduce((s, o) => s + o.totalPrice, 0),
      receivedCount: paidToCashier.length,
      toConfirm: transferred.reduce((s, o) => s + o.totalPrice, 0),
      toConfirmCount: transferred.length,
      confirmed: confirmed.reduce((s, o) => s + o.totalPrice, 0),
      confirmedCount: confirmed.length,
      voided: voided.length,
      voidedAmount: voided.reduce((s, o) => s + o.totalPrice, 0),
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
      refetch();
    } catch {
      toast.error("Failed to confirm orders");
    }
  };

  const errorMsg = error
    ? (error as any)?.data?.message || "Failed to load orders"
    : null;

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

      {errorMsg && <ErrorState message={errorMsg} onRetry={refetch} />}
      {isLoading && <LoadingState message="Loading orders..." />}

      {!isLoading && !errorMsg && (
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
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
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
                              onClick={() => toast.info("Details coming soon")}
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
                                      refetch();
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
        </>
      )}
    </div>
  );
}

// Simple reusable stat card
function StatCard({ label, value, subtitle, icon, color = "blue" }: any) {
  const colors: any = {
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
