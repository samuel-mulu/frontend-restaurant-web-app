"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Eye } from "lucide-react";
import { Order } from "@/lib/types";

const mockOrders: Order[] = [
  {
    id: "ORD001",
    customer: "Table 3 - John Smith",
    totalPrice: 85.5,
    status: "Completed",
    date: "2025-11-20 14:30",
  },
  {
    id: "ORD002",
    customer: "Table 5 - Sarah Johnson",
    totalPrice: 120.0,
    status: "Completed",
    date: "2025-11-20 13:15",
  },
  {
    id: "ORD003",
    customer: "Table 1 - Michael Brown",
    totalPrice: 65.75,
    status: "Pending",
    date: "2025-11-20 12:45",
  },
  {
    id: "ORD004",
    customer: "Table 7 - Emily Davis",
    totalPrice: 95.25,
    status: "Completed",
    date: "2025-11-19 19:20",
  },
  {
    id: "ORD005",
    customer: "Table 2 - David Wilson",
    totalPrice: 45.0,
    status: "Cancelled",
    date: "2025-11-19 18:00",
  },
];

export function OrderHistory() {
  const [orders] = useState<Order[]>(mockOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDateForFilter = (dateString: string): string => {
    // Convert "2025-11-20 14:30" to "2025-11-20"
    return dateString.split(" ")[0];
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;

    // Filter orders from the selected date onwards (to current date)
    let matchesDate = true;
    if (dateFilter) {
      const orderDate = formatDateForFilter(order.date);
      const today = new Date().toISOString().split("T")[0];
      // Show orders from selected date to today
      matchesDate = orderDate >= dateFilter && orderDate <= today;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-4 lg:mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Order History</h1>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="min-h-[44px] flex-1"
          />
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="min-h-[44px] w-full sm:w-auto"
            placeholder="Filter by date"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[44px] min-w-[120px]"
          >
            <option value="all">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {filteredOrders.map((order) => (
          <div
            key={order.id}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{order.id}</h3>
                <p className="text-sm text-gray-600 mt-1">{order.customer}</p>
              </div>
              <Badge
                className={getStatusColor(order.status)}
                variant="secondary"
              >
                {order.status}
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

      {/* Desktop Table View */}
      <div className="hidden lg:block rounded-lg border border-gray-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
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
                  colSpan={6}
                  className="text-center py-8 text-gray-500"
                >
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>{order.customer}</TableCell>
                  <TableCell>{order.totalPrice.toFixed(2)} ብር</TableCell>
                  <TableCell>
                    <Badge
                      className={getStatusColor(order.status)}
                      variant="secondary"
                    >
                      {order.status}
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
    </div>
  );
}
