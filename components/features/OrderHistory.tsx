// Refactored and improved OrderHistory component
// Clean, professional UI + reduced repetition + modular utilities

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
import { CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import { updateOrderStatus } from "@/lib/api/orders";
import { Order } from "@/lib/types";

// -------------------- Utilities -------------------- //
const formatDate = (date: string): string =>
  date.includes(" ") ? date.split(" ")[0] : date.split("T")[0];
const normalizeStatus = (s: string): "Completed" | "Pending" =>
  s.toLowerCase() === "completed" ? "Completed" : "Pending";
const getStatusColor = (status: string): string =>
  ({
    Completed: "bg-emerald-50 text-emerald-700",
    Pending: "bg-amber-50 text-amber-700",
  }[normalizeStatus(status)] || "bg-slate-100 text-slate-700");

const extractDates = (orders: Order[]): string[] =>
  [...new Set(orders.map((o) => formatDate(o.date)))].sort().reverse();

const groupWaiters = (
  orders: Order[]
): Array<{ id: string; name: string; count: number }> => {
  const map = new Map<string, { id: string; name: string; count: number }>();
  for (const o of orders) {
    if (!o.waiterId) continue;
    map.set(o.waiterId, {
      id: o.waiterId,
      name: o.waiterName || "",
      count: (map.get(o.waiterId)?.count || 0) + 1,
    });
  }
  return [...map.values()];
};

// -------------------- Mock Data -------------------- //
const mockOrders: Order[] = [
  {
    id: "ORD001",
    orderNumber: "ORD-20250120-0001",
    tableNumber: "3",
    customer: "Table 3 - John Smith",
    totalPrice: 85.5,
    status: "Pending" as const,
    date: "2025-11-20 14:30",
    waiterId: "waiter1",
    waiterName: "John Smith",
    cashierId: "cashier1",
    cashierName: "Alice Cashier",
    items: [
      { itemId: "item1", qty: 2, nameSnapshot: "Burger", priceSnapshot: 25.5 },
      {
        itemId: "item2",
        qty: 1,
        nameSnapshot: "Coca Cola",
        priceSnapshot: 15.0,
      },
      { itemId: "item3", qty: 1, nameSnapshot: "Fries", priceSnapshot: 10.0 },
    ],
  },
  {
    id: "ORD002",
    orderNumber: "ORD-20250120-0002",
    tableNumber: "5",
    customer: "Table 5 - Sarah Johnson",
    totalPrice: 120.0,
    status: "Completed" as const,
    date: "2025-11-20 13:15",
    waiterId: "waiter2",
    waiterName: "Sarah Johnson",
    cashierId: "cashier1",
    cashierName: "Alice Cashier",
  },
];

// -------------------- Main Component -------------------- //
export function OrderHistory() {
  const [orders, setOrders] = useState(mockOrders);
  const [role, setRole] = useState("waiter");
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [dateFilter, setDateFilter] = useState("all");
  const [waiterFilter, setWaiterFilter] = useState("all");
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const norm = normalizeStatus(o.status);
      if (role === "owner" && norm !== "Completed") return false;
      if (role === "waiter" && statusFilter !== "all" && norm !== statusFilter)
        return false;
      if (waiterFilter !== "all" && o.waiterId !== waiterFilter) return false;
      if (dateFilter !== "all" && formatDate(o.date) !== dateFilter)
        return false;
      return true;
    });
  }, [orders, role, statusFilter, waiterFilter, dateFilter]);

  const pendingOrders = filtered.filter(
    (o) => normalizeStatus(o.status) === "Pending"
  );

  const summary = useMemo(() => {
    const totals = filtered.reduce(
      (acc, o) => {
        const norm = normalizeStatus(o.status);
        acc[norm] += o.totalPrice || 0;
        return acc;
      },
      { Completed: 0, Pending: 0 }
    );

    const avg = filtered.length ? totals.Completed / filtered.length : 0;
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
    setSelectedOrderIds(new Set(pendingOrders.map((o) => o.id)));
  };

  const clearSelection = () => setSelectedOrderIds(new Set());

  const markSelectedCompleted = async () => {
    if (!selectedOrderIds.size) return toast.error("No orders selected");
    const ids = Array.from(selectedOrderIds) as string[];

    try {
      await Promise.all(ids.map((id) => updateOrderStatus(id, "completed")));
      setOrders((prev) =>
        prev.map((o) =>
          ids.includes(o.id) ? { ...o, status: "Completed" } : o
        )
      );
      toast.success("Orders updated");
      clearSelection();
    } catch {
      toast.error("Failed to update");
    }
  };

  const dates = extractDates(orders);
  const waiterList = groupWaiters(orders);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Order History</h1>
        <div className="flex gap-2 rounded-full border p-1 bg-white">
          {["waiter", "owner"].map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`px-4 py-2 rounded-full text-sm ${
                role === r ? "bg-black text-white" : "text-slate-600"
              } `}
            >
              {r}
            </button>
          ))}
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Orders" value={summary.count} />
        <Stat
          label="Completed"
          value={`${summary.completedTotal.toFixed(2)} Br`}
        />
        <Stat label="Pending" value={`${summary.pendingTotal.toFixed(2)} Br`} />
        <Stat
          label="Avg. Ticket"
          value={`${summary.avgTicket.toFixed(2)} Br`}
        />
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-3 p-4 rounded-xl border bg-white overflow-x-auto">
        {role === "waiter" &&
          statusFilter === "Pending" &&
          pendingOrders.length > 0 && (
            <div className="flex items-center gap-2 shrink-0 ">
              <Button
                variant="ghost"
                onClick={selectAll}
                className="text-blue-700 whitespace-nowrap"
              >
                Select All
              </Button>
              {selectedOrderIds.size > 0 && (
                <>
                  <span className="text-blue-700 text-sm whitespace-nowrap">
                    {selectedOrderIds.size} selected
                  </span>
                  <Button
                    onClick={markSelectedCompleted}
                    className="bg-green-600 hover:bg-green-700 text-white rounded-full whitespace-nowrap"
                  >
                    Mark Completed
                  </Button>
                </>
              )}
            </div>
          )}
        <div className="flex gap-2 shrink-0">
          {role === "waiter" && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-fit rounded-xl shrink-0">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-fit rounded-xl shrink-0">
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

          {role === "waiter" && (
            <Select value={waiterFilter} onValueChange={setWaiterFilter}>
              <SelectTrigger className="w-fit rounded-xl shrink-0">
                <SelectValue placeholder="Waiter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Waiters</SelectItem>
                {waiterList.map(
                  (w: { id: string; name: string; count: number }) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} ({w.count})
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Table */}
      <Table className="rounded-xl bg-white border">
        <TableHeader>
          <TableRow>
            {role === "waiter" && <TableHead></TableHead>}
            <TableHead>Order #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((o) => (
            <TableRow key={o.id}>
              {role === "waiter" && (
                <TableCell>
                  <button onClick={() => toggleSelect(o.id)}>
                    {selectedOrderIds.has(o.id) ? (
                      <CheckSquare className="text-blue-600" />
                    ) : (
                      <Square />
                    )}
                  </button>
                </TableCell>
              )}
              <TableCell>{o.orderNumber}</TableCell>
              <TableCell>{o.customer}</TableCell>
              <TableCell>{o.totalPrice} Br</TableCell>
              <TableCell>
                <Badge className={getStatusColor(o.status)}>
                  {normalizeStatus(o.status)}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(o.date)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// -------------------- Small Components -------------------- //
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
