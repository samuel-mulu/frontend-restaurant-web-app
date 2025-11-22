"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Eye, Loader2, CheckSquare, Square } from "lucide-react";
import { Order } from "@/lib/types";

const formatDateForFilter = (dateString: string): string => {
  if (dateString.includes(" ")) {
    return dateString.split(" ")[0];
  }
  if (dateString.includes("T")) {
    return dateString.split("T")[0];
  }
  return dateString;
};

const mapStatusForFilter = (status: string): string => {
  const statusLower = status.toLowerCase();
  if (statusLower === "placed" || statusLower === "pending") {
    return "Pending";
  }
  if (statusLower === "completed") {
    return "Completed";
  }
  return "Pending";
};

const getDisplayStatus = (status: string): string => {
  return mapStatusForFilter(status);
};

const getAvailableDates = (orders: Order[], status: string): string[] => {
  const statusToFilter = status === "all" ? null : status;
  const filtered = statusToFilter
    ? orders.filter((order) => {
        const orderStatus = mapStatusForFilter(order.status);
        return orderStatus === statusToFilter;
      })
    : orders;

  const dates = new Set<string>();
  filtered.forEach((order) => {
    const date = formatDateForFilter(order.date);
    if (date) dates.add(date);
  });

  return Array.from(dates).sort().reverse();
};

const getWaiterNames = (
  orders: Order[]
): { id: string; name: string; count: number }[] => {
  const waitersMap = new Map<string, { name: string; count: number }>();
  orders.forEach((order) => {
    if (order.waiterId && order.waiterName) {
      const existing = waitersMap.get(order.waiterId);
      if (existing) {
        existing.count += 1;
      } else {
        waitersMap.set(order.waiterId, {
          name: order.waiterName,
          count: 1,
        });
      }
    }
  });
  return Array.from(waitersMap.entries()).map(([id, data]) => ({
    id,
    name: data.name,
    count: data.count,
  }));
};
import { OrderItemInput, updateOrderStatus } from "@/lib/api/orders";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

// Mock orders for development (will be replaced with API call)
const mockOrders: Order[] = [
  {
    id: "ORD001",
    orderNumber: "ORD-20250120-0001",
    tableNumber: "3",
    customer: "Table 3 - John Smith",
    totalPrice: 85.5,
    status: "Pending",
    date: "2025-11-20 14:30",
    waiterId: "waiter1",
    waiterName: "John Smith",
    cashierId: "cashier1",
    cashierName: "Alice Cashier",
    items: [
      {
        itemId: "item1",
        typeSnapshot: "food",
        qty: 2,
        nameSnapshot: "Burger",
        priceSnapshot: 25.5,
      },
      {
        itemId: "item2",
        typeSnapshot: "beverage",
        qty: 1,
        nameSnapshot: "Coca Cola",
        priceSnapshot: 15.0,
      },
      {
        itemId: "item3",
        typeSnapshot: "food",
        qty: 1,
        nameSnapshot: "Fries",
        priceSnapshot: 10.0,
      },
    ],
  },
  {
    id: "ORD002",
    orderNumber: "ORD-20250120-0002",
    tableNumber: "5",
    customer: "Table 5 - Sarah Johnson",
    totalPrice: 120.0,
    status: "Completed",
    date: "2025-11-20 13:15",
    waiterId: "waiter2",
    waiterName: "Sarah Johnson",
    cashierId: "cashier1",
    cashierName: "Alice Cashier",
  },
  {
    id: "ORD003",
    orderNumber: "ORD-20250120-0003",
    tableNumber: "1",
    customer: "Table 1 - Michael Brown",
    totalPrice: 65.75,
    status: "Pending",
    date: "2025-11-20 12:45",
    waiterId: "waiter3",
    waiterName: "Michael Brown",
    cashierId: "cashier2",
    cashierName: "Bob Cashier",
  },
  {
    id: "ORD004",
    orderNumber: "ORD-20250119-0001",
    tableNumber: "7",
    customer: "Table 7 - Emily Davis",
    totalPrice: 95.25,
    status: "Completed",
    date: "2025-11-19 19:20",
    waiterId: "waiter4",
    waiterName: "Emily Davis",
    cashierId: "cashier1",
    cashierName: "Alice Cashier",
  },
  {
    id: "ORD005",
    orderNumber: "ORD-20250119-0002",
    tableNumber: "2",
    customer: "Table 2 - David Wilson",
    totalPrice: 45.0,
    status: "Cancelled",
    date: "2025-11-19 18:00",
    waiterId: "waiter5",
    waiterName: "David Wilson",
    cashierId: "cashier2",
    cashierName: "Bob Cashier",
  },
];

export function OrderHistory() {
  // State management
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [isLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState<"waiter" | "owner">("waiter");
  const [statusFilter, setStatusFilter] = useState<string>("Pending");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [waiterFilter, setWaiterFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(
    new Set()
  );
  const [isStatusChangeDialogOpen, setIsStatusChangeDialogOpen] =
    useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Fetch orders from API (commented out for now, using mock data)
  useEffect(() => {
    // Uncomment when ready to use API
    // const fetchOrders = async () => {
    //   try {
    //     setIsLoading(true);
    //     const data = await listOrders();
    //     setOrders(data);
    //   } catch (err) {
    //     if (err instanceof ApiError) {
    //       toast.error(err.message || "Failed to load orders");
    //     } else {
    //       toast.error("An unexpected error occurred");
    //     }
    //   } finally {
    //     setIsLoading(false);
    //   }
    // };
    // fetchOrders();
  }, []);

  const getStatusColor = (status: string) => {
    const displayStatus = getDisplayStatus(status);
    switch (displayStatus) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get available dates based on current status filter
  const availableDates = useMemo(() => {
    if (roleFilter === "owner") {
      // Owner view: Only show dates with completed orders from waiters
      const completedOrders = orders.filter(
        (order) =>
          (order.status === "completed" || order.status === "Completed") &&
          order.waiterId
      );
      return getAvailableDates(completedOrders, "Completed");
    } else {
      // Waiter view: Show dates based on selected status
      return getAvailableDates(orders, statusFilter);
    }
  }, [orders, statusFilter, roleFilter]);

  // Get waiter names for filter (based on filtered orders to show accurate counts)
  const waiterNames = useMemo(() => {
    // Use filtered orders to show counts that match current filters
    const ordersForCount = orders.filter((order) => {
      // Apply same filters as filteredOrders but without waiter filter
      if (roleFilter === "owner") {
        const isCompleted =
          order.status === "completed" || order.status === "Completed";
        if (!isCompleted || !order.waiterId) return false;
      } else {
        const orderStatus = mapStatusForFilter(order.status);
        if (statusFilter !== "all" && orderStatus !== statusFilter) {
          return false;
        }
      }

      if (dateFilter && dateFilter !== "all") {
        const orderDate = formatDateForFilter(order.date);
        if (orderDate !== dateFilter) return false;
      }

      return true;
    });
    return getWaiterNames(ordersForCount);
  }, [orders, roleFilter, statusFilter, dateFilter]);

  // Reset date filter when status changes (Waiter view)
  useEffect(() => {
    if (roleFilter === "waiter" && statusFilter) {
      const dates = getAvailableDates(orders, statusFilter);
      if (
        dates.length > 0 &&
        dateFilter !== "all" &&
        !dates.includes(dateFilter)
      ) {
        setDateFilter("all"); // Reset if current date not available
      }
    }
  }, [statusFilter, roleFilter, orders, dateFilter]);

  // Reset filters when role changes
  useEffect(() => {
    if (roleFilter === "owner") {
      setStatusFilter("Completed"); // Auto-set to completed
      setWaiterFilter("all"); // Reset waiter filter
      // Reset date filter if no completed orders available
      const completedDates = getAvailableDates(orders, "Completed");
      if (
        completedDates.length > 0 &&
        dateFilter !== "all" &&
        !completedDates.includes(dateFilter)
      ) {
        setDateFilter("all");
      }
    } else {
      setStatusFilter("Pending"); // Default to Pending for waiter view
    }
  }, [roleFilter, orders, dateFilter]);

  // Calculate total prices by status based on filtered orders (excluding status filter)
  const orderTotals = useMemo(() => {
    // Filter orders based on role, date, and waiter (but not status)
    const filteredForTotals = orders.filter((order) => {
      // Role-based filtering
      if (roleFilter === "owner") {
        // Owner: Only completed orders from waiters
        const isCompleted =
          order.status === "completed" || order.status === "Completed";
        if (!isCompleted || !order.waiterId) return false;
      }

      // Waiter filter
      if (
        roleFilter === "waiter" &&
        waiterFilter !== "all" &&
        order.waiterId !== waiterFilter
      ) {
        return false;
      }

      // Date filtering
      if (dateFilter && dateFilter !== "all") {
        const orderDate = formatDateForFilter(order.date);
        if (orderDate !== dateFilter) return false;
      }

      return true;
    });

    // Calculate totals for each status from filtered orders
    const completed = filteredForTotals
      .filter(
        (order) => order.status === "completed" || order.status === "Completed"
      )
      .reduce((sum, order) => sum + (order.totalPrice || 0), 0);

    const pending = filteredForTotals
      .filter((order) => {
        const statusLower = (order.status || "").toLowerCase();
        return statusLower === "pending" || statusLower === "placed";
      })
      .reduce((sum, order) => sum + (order.totalPrice || 0), 0);

    return { completed, pending };
  }, [orders, roleFilter, dateFilter, waiterFilter]);

  // Filter orders based on role and filters
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Role-based filtering
      if (roleFilter === "owner") {
        // Owner: Only completed orders from waiters
        const isCompleted =
          order.status === "completed" || order.status === "Completed";
        if (!isCompleted || !order.waiterId) return false;
      } else {
        // Waiter: Apply status filter
        const orderStatus = mapStatusForFilter(order.status);
        if (statusFilter !== "all" && orderStatus !== statusFilter) {
          return false;
        }

        // Waiter filter
        if (waiterFilter !== "all" && order.waiterId !== waiterFilter) {
          return false;
        }
      }

      // Date filtering
      if (dateFilter && dateFilter !== "all") {
        const orderDate = formatDateForFilter(order.date);
        if (orderDate !== dateFilter) return false;
      }

      return true;
    });
  }, [orders, roleFilter, statusFilter, dateFilter, waiterFilter]);

  // Get pending orders for multi-select
  const pendingOrders = useMemo(() => {
    return filteredOrders.filter((order) => {
      const statusLower = (order.status || "").toLowerCase();
      return statusLower === "pending" || statusLower === "placed";
    });
  }, [filteredOrders]);

  const filteredOrdersTotal = useMemo(
    () =>
      filteredOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0),
    [filteredOrders]
  );

  const averageTicket =
    filteredOrders.length > 0 ? filteredOrdersTotal / filteredOrders.length : 0;

  const summaryCards = [
    {
      label: "Filtered orders",
      value: filteredOrders.length,
      helper: roleFilter === "owner" ? "owner snapshot" : "waiter overview",
    },
    {
      label: "Completed volume",
      value: `${orderTotals.completed.toFixed(2)} ብር`,
      helper: "settled payments",
    },
    {
      label: "Pending volume",
      value:
        roleFilter === "waiter" ? `${orderTotals.pending.toFixed(2)} ብር` : "—",
      helper: "awaiting closure",
    },
    {
      label: "Avg. ticket",
      value: averageTicket > 0 ? `${averageTicket.toFixed(2)} ብር` : "—",
      helper: "current filters",
    },
  ];

  // Check if all pending orders are selected
  const isAllPendingSelected = useMemo(() => {
    if (pendingOrders.length === 0) return false;
    return pendingOrders.every((order) => selectedOrderIds.has(order.id));
  }, [pendingOrders, selectedOrderIds]);

  // Toggle select all pending orders
  const handleSelectAllPending = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (isAllPendingSelected) {
      // Deselect all pending orders
      setSelectedOrderIds((prev) => {
        const newSet = new Set(prev);
        pendingOrders.forEach((order) => newSet.delete(order.id));
        return newSet;
      });
    } else {
      // Select all pending orders
      setSelectedOrderIds((prev) => {
        const newSet = new Set(prev);
        pendingOrders.forEach((order) => newSet.add(order.id));
        return newSet;
      });
    }
  };

  // Toggle individual order selection
  const handleToggleOrderSelection = (
    orderId: string,
    e?: React.MouseEvent
  ) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setSelectedOrderIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  // Handle bulk status change
  const handleBulkStatusChange = async () => {
    if (selectedOrderIds.size === 0) {
      toast.error("Please select at least one order");
      return;
    }

    const selectedPendingOrders = pendingOrders.filter((order) =>
      selectedOrderIds.has(order.id)
    );

    if (selectedPendingOrders.length === 0) {
      toast.error("Only pending orders can be changed to completed");
      return;
    }

    setIsStatusChangeDialogOpen(true);
  };

  // Confirm and update status
  const confirmStatusChange = async () => {
    if (selectedOrderIds.size === 0) return;

    setIsUpdatingStatus(true);
    const orderIds = Array.from(selectedOrderIds);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Update all selected orders
      await Promise.all(
        orderIds.map(async (orderId) => {
          try {
            await updateOrderStatus(orderId, "completed");
            successCount++;
          } catch (err) {
            errorCount++;
            console.error(`Failed to update order ${orderId}:`, err);
          }
        })
      );

      // Update local state
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          selectedOrderIds.has(order.id)
            ? { ...order, status: "Completed" as const }
            : order
        )
      );

      // Clear selection
      setSelectedOrderIds(new Set());
      setIsStatusChangeDialogOpen(false);

      if (errorCount === 0) {
        toast.success(
          `Successfully updated ${successCount} order(s) to Completed`
        );
      } else {
        toast.warning(`Updated ${successCount} order(s), ${errorCount} failed`);
      }
    } catch {
      toast.error("Failed to update order status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="glass-panel p-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Operations
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">
                Order history
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Review live and completed tickets, filter by role, and confirm
                settlements with confidence.
              </p>
            </div>

            <div className="flex gap-2 rounded-full border border-slate-200/80 bg-white/80 p-1">
              <button
                onClick={() => setRoleFilter("waiter")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors min-h-[40px] ${
                  roleFilter === "waiter"
                    ? "bg-slate-900 text-white shadow"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Waiter
              </button>
              <button
                onClick={() => setRoleFilter("owner")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors min-h-[40px] ${
                  roleFilter === "owner"
                    ? "bg-slate-900 text-white shadow"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Owner
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-inner shadow-slate-200/40"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {stat.label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {stat.value}
                </p>
                <p className="text-xs text-slate-500">{stat.helper}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="soft-card p-4 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {roleFilter === "waiter" && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="min-h-[44px] w-full sm:w-auto min-w-[140px] rounded-2xl border-slate-200/80 bg-white/70">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="min-h-[44px] w-full sm:w-auto min-w-[160px] rounded-2xl border-slate-200/80 bg-white/70">
              <SelectValue
                placeholder={
                  roleFilter === "owner"
                    ? "Select date (Completed orders)"
                    : "Select date"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              {availableDates.length === 0 ? (
                <SelectItem value="no-dates" disabled>
                  No dates available
                </SelectItem>
              ) : (
                availableDates.map((date) => (
                  <SelectItem key={date} value={date}>
                    {new Date(date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          {roleFilter === "waiter" && (
            <Select value={waiterFilter} onValueChange={setWaiterFilter}>
              <SelectTrigger className="min-h-[44px] w-full sm:w-auto min-w-[160px] rounded-2xl border-slate-200/80 bg-white/70">
                <SelectValue placeholder="Select waiter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Waiters</SelectItem>
                {waiterNames.length === 0 ? (
                  <SelectItem value="no-waiters" disabled>
                    No waiters available
                  </SelectItem>
                ) : (
                  waiterNames.map((waiter) => (
                    <SelectItem key={waiter.id} value={waiter.id}>
                      {waiter.name} ({waiter.count})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        </div>

        {roleFilter === "waiter" &&
          statusFilter === "Pending" &&
          pendingOrders.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
              <button
                type="button"
                onClick={(e) => handleSelectAllPending(e)}
                className="flex items-center gap-2 text-sm font-medium text-blue-900 hover:text-blue-700"
              >
                {isAllPendingSelected ? (
                  <CheckSquare className="h-5 w-5" />
                ) : (
                  <Square className="h-5 w-5" />
                )}
                {isAllPendingSelected ? "Deselect All" : "Select All"}
              </button>
              {selectedOrderIds.size > 0 && (
                <>
                  <span className="text-sm text-blue-700">
                    {selectedOrderIds.size} selected
                  </span>
                  <Button
                    onClick={handleBulkStatusChange}
                    size="sm"
                    className="ml-auto min-h-[40px] rounded-full bg-green-600 px-4 text-white hover:bg-green-700"
                  >
                    Mark as Completed
                  </Button>
                </>
              )}
            </div>
          )}
      </section>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading orders...</span>
        </div>
      )}

      {/* Mobile Card View */}
      {!isLoading && (
        <div className="lg:hidden space-y-4">
          {filteredOrders.map((order) => {
            const isPending =
              (order.status || "").toLowerCase() === "pending" ||
              (order.status || "").toLowerCase() === "placed";
            const isSelected = selectedOrderIds.has(order.id);
            const showCheckbox =
              roleFilter === "waiter" &&
              statusFilter === "Pending" &&
              isPending;

            return (
              <div
                key={order.id}
                className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    {showCheckbox && (
                      <button
                        type="button"
                        onClick={(e) => handleToggleOrderSelection(order.id, e)}
                        className="mt-1"
                        aria-label={
                          isSelected ? "Deselect order" : "Select order"
                        }
                      >
                        {isSelected ? (
                          <CheckSquare className="h-5 w-5 text-primary" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {order.orderNumber || order.id}
                      </h3>
                      {roleFilter === "waiter" && order.waiterName && (
                        <p className="text-xs text-gray-500 mt-1">
                          Waiter: {order.waiterName}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge
                    className={getStatusColor(order.status)}
                    variant="secondary"
                  >
                    {getDisplayStatus(order.status)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      {order.totalPrice.toFixed(2)} ብር
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{order.date}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsDetailDialogOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
          {filteredOrders.length === 0 && (
            <p className="text-center text-gray-500 py-8">No orders found</p>
          )}
        </div>
      )}

      {/* Desktop Table View */}
      {!isLoading && (
        <div className="hidden lg:block soft-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {roleFilter === "waiter" && statusFilter === "Pending" && (
                  <TableHead className="w-12">
                    <button
                      type="button"
                      onClick={(e) => handleSelectAllPending(e)}
                      className="flex items-center justify-center w-full h-full"
                      aria-label={
                        isAllPendingSelected ? "Deselect all" : "Select all"
                      }
                    >
                      {isAllPendingSelected ? (
                        <CheckSquare className="h-5 w-5 text-primary" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </TableHead>
                )}
                <TableHead>Order Number</TableHead>
                {roleFilter === "waiter" && <TableHead>Waiter</TableHead>}
                <TableHead>Total Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      roleFilter === "waiter" && statusFilter === "Pending"
                        ? 6
                        : roleFilter === "waiter"
                        ? 5
                        : 4
                    }
                    className="text-center py-8 text-gray-500"
                  >
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => {
                  const isPending =
                    (order.status || "").toLowerCase() === "pending" ||
                    (order.status || "").toLowerCase() === "placed";
                  const isSelected = selectedOrderIds.has(order.id);
                  const showCheckbox =
                    roleFilter === "waiter" &&
                    statusFilter === "Pending" &&
                    isPending;

                  return (
                    <TableRow key={order.id}>
                      {showCheckbox && (
                        <TableCell>
                          <button
                            type="button"
                            onClick={(e) =>
                              handleToggleOrderSelection(order.id, e)
                            }
                            className="flex items-center justify-center w-full h-full"
                            aria-label={
                              isSelected ? "Deselect order" : "Select order"
                            }
                          >
                            {isSelected ? (
                              <CheckSquare className="h-5 w-5 text-primary" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                        </TableCell>
                      )}
                      <TableCell className="font-medium">
                        {order.orderNumber || order.id}
                      </TableCell>
                      {roleFilter === "waiter" && (
                        <TableCell>{order.waiterName || "N/A"}</TableCell>
                      )}
                      <TableCell>{order.totalPrice.toFixed(2)} ብር</TableCell>
                      <TableCell>
                        <Badge
                          className={getStatusColor(order.status)}
                          variant="secondary"
                        >
                          {getDisplayStatus(order.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.date}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsDetailDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Order Details: {selectedOrder?.orderNumber || selectedOrder?.id}
            </DialogTitle>
            <DialogDescription>
              View order items and information
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Order Information */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Order Number</p>
                  <p className="font-semibold text-gray-900">
                    {selectedOrder.orderNumber || selectedOrder.id}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge
                    className={getStatusColor(selectedOrder.status)}
                    variant="secondary"
                  >
                    {getDisplayStatus(selectedOrder.status)}
                  </Badge>
                </div>
                {selectedOrder.waiterName && (
                  <div>
                    <p className="text-sm text-gray-600">Waiter</p>
                    <p className="font-medium text-gray-900">
                      {selectedOrder.waiterName}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-medium text-gray-900">
                    {selectedOrder.date}
                  </p>
                </div>
                {selectedOrder.note && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Note</p>
                    <p className="font-medium text-gray-900">
                      {selectedOrder.note}
                    </p>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Order Items
                </h3>
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">
                            Unit Price
                          </TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.items.map(
                          (item: OrderItemInput, index: number) => {
                            const subtotal = item.priceSnapshot * item.qty;
                            return (
                              <TableRow key={`${item.itemId}-${index}`}>
                                <TableCell className="font-medium">
                                  {item.nameSnapshot}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={
                                      item.typeSnapshot === "beverage"
                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                        : "bg-orange-50 text-orange-700 border-orange-200"
                                    }
                                  >
                                    {item.typeSnapshot === "beverage"
                                      ? "Beverage"
                                      : "Food"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {item.qty}
                                </TableCell>
                                <TableCell className="text-right">
                                  {item.priceSnapshot.toFixed(2)} ብር
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {subtotal.toFixed(2)} ብር
                                </TableCell>
                              </TableRow>
                            );
                          }
                        )}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    No items found for this order
                  </p>
                )}
              </div>

              {/* Total */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedOrder.totalPrice.toFixed(2)} ብር
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Change Confirmation Dialog */}
      <AlertDialog
        open={isStatusChangeDialogOpen}
        onOpenChange={setIsStatusChangeDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change {selectedOrderIds.size} order(s)
              from Pending to Completed? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingStatus}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStatusChange}
              disabled={isUpdatingStatus}
              className="bg-green-600 hover:bg-green-700"
            >
              {isUpdatingStatus ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Confirm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
