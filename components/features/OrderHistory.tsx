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
import { Eye, Loader2 } from "lucide-react";
import { Order } from "@/lib/types";
import { listOrders, ApiError } from "@/lib/api/orders";
import { toast } from "sonner";

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
  const [isLoading, setIsLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState<"waiter" | "owner">("waiter");
  const [statusFilter, setStatusFilter] = useState<string>("Pending");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [waiterFilter, setWaiterFilter] = useState<string>("all");

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

  /**
   * Format date string to YYYY-MM-DD
   */
  const formatDateForFilter = (dateString: string): string => {
    // Handle different date formats
    if (dateString.includes(" ")) {
      return dateString.split(" ")[0];
    }
    if (dateString.includes("T")) {
      return dateString.split("T")[0];
    }
    return dateString;
  };

  /**
   * Get available dates from orders based on status
   */
  const getAvailableDates = (orders: Order[], status: string): string[] => {
    const statusToFilter = status === "all" ? null : status;
    const filtered = statusToFilter
      ? orders.filter((order) => {
          // Map status for comparison
          const orderStatus = mapStatusForFilter(order.status);
          return orderStatus === statusToFilter;
        })
      : orders;

    const dates = new Set<string>();
    filtered.forEach((order) => {
      const date = formatDateForFilter(order.date);
      if (date) dates.add(date);
    });

    return Array.from(dates).sort().reverse(); // Most recent first
  };

  /**
   * Get unique waiter names from orders
   */
  const getWaiterNames = (orders: Order[]): { id: string; name: string }[] => {
    const waitersMap = new Map<string, string>();
    orders.forEach((order) => {
      if (order.waiterId && order.waiterName) {
        waitersMap.set(order.waiterId, order.waiterName);
      }
    });
    return Array.from(waitersMap.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  };

  /**
   * Map order status to filter status
   */
  const mapStatusForFilter = (status: string): string => {
    const statusMap: Record<string, string> = {
      placed: "Pending",
      pending: "Pending",
      served: "Served",
      preparing: "Preparing",
      ready: "Ready",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return statusMap[status.toLowerCase()] || status;
  };

  /**
   * Get display status for UI
   */
  const getDisplayStatus = (status: string): string => {
    return mapStatusForFilter(status);
  };

  const getStatusColor = (status: string) => {
    const displayStatus = getDisplayStatus(status);
    switch (displayStatus) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      case "Served":
      case "Preparing":
      case "Ready":
        return "bg-blue-100 text-blue-800";
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

  // Get waiter names for filter
  const waiterNames = useMemo(() => getWaiterNames(orders), [orders]);

  // Reset date filter when status changes (Waiter view)
  useEffect(() => {
    if (roleFilter === "waiter" && statusFilter) {
      const dates = getAvailableDates(orders, statusFilter);
      if (dates.length > 0 && dateFilter !== "all" && !dates.includes(dateFilter)) {
        setDateFilter("all"); // Reset if current date not available
      }
    }
  }, [statusFilter, roleFilter, orders]);

  // Reset filters when role changes
  useEffect(() => {
    if (roleFilter === "owner") {
      setStatusFilter("Completed"); // Auto-set to completed
      setWaiterFilter("all"); // Reset waiter filter
      // Reset date filter if no completed orders available
      const completedDates = getAvailableDates(orders, "Completed");
      if (completedDates.length > 0 && dateFilter !== "all" && !completedDates.includes(dateFilter)) {
        setDateFilter("all");
      }
    } else {
      setStatusFilter("Pending"); // Default to Pending for waiter view
    }
  }, [roleFilter]);

  // Calculate order counts by status
  const orderCounts = useMemo(() => {
    const completed = orders.filter(
      (order) =>
        (order.status === "completed" || order.status === "Completed") &&
        (roleFilter === "owner" ? order.waiterId : true)
    ).length;
    const pending = orders.filter(
      (order) =>
        (order.status === "pending" ||
          order.status === "Pending" ||
          order.status === "placed") &&
        (roleFilter === "owner" ? false : true) // Owner doesn't see pending
    ).length;
    return { completed, pending };
  }, [orders, roleFilter]);

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

  return (
    <div>
      {/* Header */}
      <div className="mb-4 lg:mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Order History</h1>
          
          {/* Role Tab Selector */}
          <div className="flex gap-2 border border-gray-200 rounded-lg p-1 bg-gray-50">
            <button
              onClick={() => setRoleFilter("waiter")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] ${
                roleFilter === "waiter"
                  ? "bg-white text-primary shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Waiter
            </button>
            <button
              onClick={() => setRoleFilter("owner")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] ${
                roleFilter === "owner"
                  ? "bg-white text-primary shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Owner
            </button>
          </div>
        </div>

        {/* Status Summary */}
        <div className="mb-4 flex gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
            <span className="text-sm font-medium text-green-800">Completed:</span>
            <span className="text-lg font-bold text-green-900">{orderCounts.completed}</span>
          </div>
          {roleFilter === "waiter" && (
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 rounded-lg border border-yellow-200">
              <span className="text-sm font-medium text-yellow-800">Pending:</span>
              <span className="text-lg font-bold text-yellow-900">{orderCounts.pending}</span>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Status Filter - Only for Waiter view */}
          {roleFilter === "waiter" && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="min-h-[44px] w-full sm:w-auto min-w-[140px]">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Date Dropdown - Dynamic based on status */}
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="min-h-[44px] w-full sm:w-auto min-w-[160px]">
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

          {/* Waiter Filter - Only for Waiter view */}
          {roleFilter === "waiter" && (
            <Select value={waiterFilter} onValueChange={setWaiterFilter}>
              <SelectTrigger className="min-h-[44px] w-full sm:w-auto min-w-[160px]">
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
                      {waiter.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

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
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {order.orderNumber || order.id}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {order.customer || `Table ${order.tableNumber || "N/A"}`}
                  </p>
                  {roleFilter === "waiter" && order.waiterName && (
                    <p className="text-xs text-gray-500 mt-1">
                      Waiter: {order.waiterName}
                    </p>
                  )}
                  {order.cashierName && (
                    <p className="text-xs text-gray-500 mt-1">
                      Cashier: {order.cashierName}
                    </p>
                  )}
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
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {filteredOrders.length === 0 && (
            <p className="text-center text-gray-500 py-8">No orders found</p>
          )}
        </div>
      )}

      {/* Desktop Table View */}
      {!isLoading && (
        <div className="hidden lg:block rounded-lg border border-gray-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Number</TableHead>
                <TableHead>Table</TableHead>
                {roleFilter === "waiter" && <TableHead>Waiter</TableHead>}
                <TableHead>Cashier</TableHead>
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
                    colSpan={roleFilter === "waiter" ? 7 : 6}
                    className="text-center py-8 text-gray-500"
                  >
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.orderNumber || order.id}
                    </TableCell>
                    <TableCell>
                      {order.tableNumber ? `Table ${order.tableNumber}` : "N/A"}
                    </TableCell>
                    {roleFilter === "waiter" && (
                      <TableCell>
                        {order.waiterName || "N/A"}
                      </TableCell>
                    )}
                    <TableCell>
                      {order.cashierName || "N/A"}
                    </TableCell>
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
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
