"use client";

import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ReportStaffOrderDetail,
  useCreateExpenseMutation,
  useDeleteExpenseMutation,
  useGetDailyReportQuery,
  useGetMonthlyReportQuery,
  useGetReportStaffOrdersQuery,
} from "@/stores/features/statistics/statisticsApi";
import {
  ArrowDownCircle,
  Banknote,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Eye,
  Filter,
  Plus,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// Staff Order Details Component
interface StaffOrderDetailsProps {
  staffId: string;
  staffType: "waiter" | "cashier";
  startDate: string;
  endDate: string;
  statusFilter: string;
  paymentFilter: string;
}

const formatCurrencyValue = (amount: number) =>
  new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
  }).format(amount);

function StaffOrderDetails({
  staffId,
  staffType,
  startDate,
  endDate,
  statusFilter,
  paymentFilter,
}: StaffOrderDetailsProps) {
  const statusQuery = statusFilter === "ALL" ? undefined : statusFilter;
  const paymentQuery = paymentFilter === "ALL" ? undefined : paymentFilter;

  const {
    data: orders = [],
    isLoading,
    error,
  } = useGetReportStaffOrdersQuery(
    {
      staffType,
      staffId,
      startDate,
      endDate,
      status: statusQuery,
      paymentMethod: paymentQuery,
    },
    {
      skip: !staffId || !startDate || !endDate,
    },
  );

  if (isLoading) {
    return <OrderDetailsSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Failed to load order details.
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No orders found for this {staffType} in the selected filters.
      </div>
    );
  }

  const totalRevenue = orders.reduce(
    (sum: number, order: ReportStaffOrderDetail) => sum + order.totalAmount,
    0,
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-sm font-medium text-muted-foreground">
            Total Orders
          </div>
          <div className="text-2xl font-bold">{orders.length}</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-sm font-medium text-muted-foreground">
            Total Revenue
          </div>
          <div className="text-2xl font-bold">
            {formatCurrencyValue(totalRevenue)}
          </div>
        </div>
        {staffType === "waiter" && (
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-sm font-medium text-muted-foreground">
              Average Order
            </div>
            <div className="text-2xl font-bold">
              {formatCurrencyValue(
                orders.reduce((sum: number, order: ReportStaffOrderDetail) => sum + order.totalAmount, 0) /
                orders.length,
              )}
            </div>
          </div>
        )}
        {staffType === "cashier" && (
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-sm font-medium text-muted-foreground">
              Total Settled
            </div>
            <div className="text-2xl font-bold">
              {formatCurrencyValue(totalRevenue)}
            </div>
          </div>
        )}
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-sm font-medium text-muted-foreground">
            Payment Methods
          </div>
          <div className="text-sm">
            {Array.from(new Set(orders.map((o: ReportStaffOrderDetail) => o.paymentMethod))).join(", ")}
          </div>
        </div>
      </div>

      <OrderDetailsTable orders={orders} />
    </div>
  );
}

// Reusable skeleton component
function OrderDetailsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-muted/50 rounded-lg p-3">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="border rounded-lg p-4">
        <Skeleton className="h-4 w-full mb-4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center space-x-4 py-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Reusable order details table
function OrderDetailsTable({ orders }: { orders: ReportStaffOrderDetail[] }) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order #</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order._id}>
              <TableCell className="font-medium">{order.orderNumber}</TableCell>
              <TableCell>
                {new Date(order.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {order.items?.map((item, index: number) => (
                    <div key={index} className="text-sm">
                      {item.quantity}x {item.name}
                    </div>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <PaymentBadge paymentMethod={order.paymentMethod || "unknown"} />
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrencyValue(order.totalAmount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Reusable payment badge component
function PaymentBadge({ paymentMethod }: { paymentMethod: string }) {
  const getBadgeColor = (method: string) => {
    switch (method.toLowerCase()) {
      case "cash":
        return "bg-green-100 text-green-800";
      case "card":
        return "bg-blue-100 text-blue-800";
      case "mobile_banking":
        return "bg-purple-100 text-purple-800";
      case "unpaid":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(paymentMethod)}`}
    >
      {paymentMethod}
    </span>
  );
}

// Date utility functions to replace date-fns
const formatDateForReport = (date: Date, formatStr: string): string => {
  const d = new Date(date);

  if (formatStr === "PPP") {
    // Long format: "Tuesday, March 15, 2016"
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } else if (formatStr === "MMMM yyyy") {
    // Month year format: "March 2016"
    return d.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  } else if (formatStr === "yyyy-MM-dd") {
    // ISO date format: "2016-03-15"
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return d.toLocaleDateString();
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

const subDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};

const subMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() - months);
  return result;
};

const getReportDateRange = (
  date: Date,
  viewType: "daily" | "monthly",
): { startDate: string; endDate: string } => {
  if (viewType === "daily") {
    const day = formatDateForReport(date, "yyyy-MM-dd");
    return { startDate: day, endDate: day };
  }

  const year = date.getFullYear();
  const month = date.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return {
    startDate: formatDateForReport(start, "yyyy-MM-dd"),
    endDate: formatDateForReport(end, "yyyy-MM-dd"),
  };
};

export default function ReportsPage() {
  const [viewType, setViewType] = useState<"daily" | "monthly">("daily");
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("PAID_TO_CASHIER");
  const [paymentFilter, setPaymentFilter] = useState<string>("ALL");
  const selectedStatus = statusFilter === "ALL" ? undefined : statusFilter;

  // Expense form state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    amount: "",
    reason: "",
    description: "",
  });

  // Staff detail modal state
  const [staffDetailModal, setStaffDetailModal] = useState<{
    isOpen: boolean;
    type: "waiter" | "cashier";
    staffId: string;
    staffName: string;
  }>({
    isOpen: false,
    type: "waiter",
    staffId: "",
    staffName: "",
  });

  const dailyQuery = useGetDailyReportQuery(
    {
      date: formatDateForReport(selectedDate, "yyyy-MM-dd"),
      status: selectedStatus,
    },
    { skip: viewType !== "daily" },
  );

  const monthlyQuery = useGetMonthlyReportQuery(
    {
      year: selectedDate.getFullYear(),
      month: selectedDate.getMonth() + 1,
      status: selectedStatus,
    },
    { skip: viewType !== "monthly" },
  );

  const [createExpense, { isLoading: isCreatingExpense }] =
    useCreateExpenseMutation();
  const [deleteExpense] = useDeleteExpenseMutation();

  const { data, isLoading, isFetching, error, refetch } =
    viewType === "daily" ? dailyQuery : monthlyQuery;

  const handlePrevDate = () => {
    setSelectedDate((prev) =>
      viewType === "daily" ? subDays(prev, 1) : subMonths(prev, 1),
    );
  };

  const handleNextDate = () => {
    setSelectedDate((prev) =>
      viewType === "daily" ? addDays(prev, 1) : addMonths(prev, 1),
    );
  };

  const handleAddExpense = async () => {
    if (!newExpense.amount || !newExpense.reason) {
      toast.error("Please fill in amount and reason");
      return;
    }

    try {
      await createExpense({
        ...newExpense,
        amount: parseFloat(newExpense.amount),
        date: formatDateForReport(selectedDate, "yyyy-MM-dd"),
      }).unwrap();

      toast.success("Expense recorded successfully");
      setIsAddExpenseOpen(false);
      setNewExpense({
        amount: "",
        reason: "",
        description: "",
      });
      refetch();
    } catch (err: unknown) {
      const errorMessage =
        (err as any)?.data?.message || "Failed to record expense";
      toast.error(errorMessage);
    }
  };

  const handleDeleteExpense = async (id: string | undefined) => {
    if (!id) return;
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      await deleteExpense(id).unwrap();
      toast.success("Expense deleted");
      refetch();
    } catch {
      toast.error("Failed to delete expense");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
    }).format(amount);
  };

  // Enhanced error handling
  const getErrorMessage = (error: unknown): string => {
    if (!error) return "Unknown error occurred";

    if (typeof error === "string") return error;

    if (error instanceof Error) {
      return error.message || "An error occurred";
    }

    if (typeof error === "object" && error !== null) {
      const errorObj = error as any;
      return errorObj.message || errorObj.data?.message || "An error occurred";
    }

    return "An error occurred";
  };

  if (isLoading) return <LoadingState message="Generating report..." />;
  if (error)
    return (
      <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
    );

  // Type-safe data access with fallbacks
  const reportData = data || {
    orders: [],
    expenses: [],
    salesByPaymentMethod: [],
    staffPerformance: { byWaiter: [], byCashier: [] },
  };

  const filteredSales = reportData.salesByPaymentMethod.filter(
    (s: { _id: { method: string } }) =>
      paymentFilter === "ALL" || s._id.method === paymentFilter,
  );

  const totalFromOrders = reportData.orders.reduce(
    (acc: number, curr: { total: number }) => acc + curr.total,
    0,
  );

  const totalSalesFromPayment = filteredSales.reduce(
    (acc: number, curr: { total: number }) => acc + curr.total,
    0,
  );

  const totalSales =
    paymentFilter === "ALL"
      ? totalFromOrders
      : totalSalesFromPayment;

  const totalExpenses = reportData.expenses.reduce(
    (acc: number, curr: { total: number }) => acc + curr.total,
    0,
  );
  const netRevenue = totalSales - totalExpenses;
  const detailRange = getReportDateRange(selectedDate, viewType);

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Reports
          </h1>
          <p className="text-muted-foreground italic">
            Professional restaurant performance tracking
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-end gap-4">
          <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm bg-rose-600 hover:bg-rose-700 text-white border-none">
                <Plus className="h-4 w-4" />
                Record Cashout
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50">
              <DialogHeader>
                <DialogTitle>Record Cashout / Expense</DialogTitle>
                <DialogDescription>
                  Record withdrawals or other expenses for{" "}
                  {formatDateForReport(selectedDate, "PPP")}.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount text-sm font-semibold">
                    Amount (ETB)
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50"
                    value={newExpense.amount}
                    onChange={(e) =>
                      setNewExpense({ ...newExpense, amount: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reason text-sm font-semibold">Reason</Label>
                  <Select
                    value={newExpense.reason}
                    onValueChange={(v) =>
                      setNewExpense({ ...newExpense, reason: v })
                    }
                  >
                    <SelectTrigger id="reason">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="withdrawal">
                        General Withdrawal
                      </SelectItem>
                      <SelectItem value="inventory">
                        Inventory Purchase
                      </SelectItem>
                      <SelectItem value="salary_advance">
                        Salary Advance
                      </SelectItem>
                      <SelectItem value="broke_products">
                        Broke Products
                      </SelectItem>
                      <SelectItem value="utility">
                        Utilities / Repairs
                      </SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description text-sm font-semibold">
                    Description (Optional)
                  </Label>
                  <Input
                    id="description"
                    placeholder="Additional details..."
                    value={newExpense.description}
                    className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50"
                    onChange={(e) =>
                      setNewExpense({
                        ...newExpense,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddExpenseOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddExpense}
                  disabled={isCreatingExpense}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {isCreatingExpense ? "Recording..." : "Save Transaction"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-1 rounded-lg border shadow-sm">
            <Button variant="ghost" size="icon" onClick={handlePrevDate}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 px-4 font-semibold text-sm">
              <CalendarIcon className="h-4 w-4 text-primary" />
              {viewType === "daily"
                ? formatDateForReport(selectedDate, "PPP")
                : formatDateForReport(selectedDate, "MMMM yyyy")}
            </div>
            <Button variant="ghost" size="icon" onClick={handleNextDate}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Tabs
        value={viewType}
        onValueChange={(value: string) =>
          setViewType(value as "daily" | "monthly")
        }
        className="w-full"
      >
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="daily">Daily Report</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Report</TabsTrigger>
        </TabsList>

        <div className="mt-6 space-y-6">
          {/* Filter Bar */}
          <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
            <CardContent className="p-4 flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium">Filters:</span>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50">
                  <SelectValue placeholder="Order Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="PAID_TO_CASHIER">Paid</SelectItem>
                  <SelectItem value="TRANSFERRED_TO_OWNER">
                    Transferred
                  </SelectItem>
                  <SelectItem value="OWNER_CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="VOIDED">Voided</SelectItem>
                  <SelectItem value="DISPUTED">Disputed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-[180px] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50">
                  <SelectValue placeholder="Payment Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Payments</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mobile_banking">Mobile Banking</SelectItem>
                  <SelectItem value="unpaid">Unpaid / Pending</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="overflow-hidden border-l-4 border-l-emerald-500">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                      Total Sales
                    </p>
                    {isFetching ? (
                      <Skeleton className="h-8 w-32 mt-1" />
                    ) : (
                      <h3 className="text-2xl font-bold mt-1">
                        {formatCurrency(totalSales)}
                      </h3>
                    )}
                  </div>
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-l-4 border-l-rose-500">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                      Total Expenses
                    </p>
                    {isFetching ? (
                      <Skeleton className="h-8 w-32 mt-1" />
                    ) : (
                      <h3 className="text-2xl font-bold mt-1 text-rose-600">
                        {formatCurrency(totalExpenses)}
                      </h3>
                    )}
                  </div>
                  <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                    <ArrowDownCircle className="h-5 w-5 text-rose-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-l-4 border-l-blue-500 bg-blue-50/10">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                      Net Revenue
                    </p>
                    {isFetching ? (
                      <Skeleton className="h-8 w-32 mt-1" />
                    ) : (
                      <h3 className="text-2xl font-bold mt-1 text-blue-600">
                        {formatCurrency(netRevenue)}
                      </h3>
                    )}
                  </div>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Breakdown */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Payment Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isFetching ? (
                  <TableSkeleton columnCount={4} rowCount={3} />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Method</TableHead>
                        <TableHead>Bank</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSales.map((item: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="capitalize">
                            {item._id.method === "unpaid" ? "Unpaid / Pending" : item._id.method.replace("_", " ")}
                          </TableCell>
                          <TableCell>{item._id.bank || "-"}</TableCell>
                          <TableCell className="text-right">
                            {item.count}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredSales.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No sales recorded
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Expenses Breakdown */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-rose-500" />
                  Expenses & Withdrawals
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isFetching ? (
                  <TableSkeleton columnCount={3} rowCount={3} />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reason / Details</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.expenses.map((item: any) =>
                        item.items.map((ex: any) => (
                          <TableRow key={ex._id}>
                            <TableCell className="capitalize">
                              <span className="font-semibold">
                                {ex.reason.replace("_", " ")}
                              </span>
                              {ex.description && (
                                <span className="text-xs text-slate-500 block">
                                  {ex.description}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-rose-600 font-bold">
                              -{formatCurrency(ex.amount)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-rose-600"
                                onClick={() => handleDeleteExpense(ex._id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )),
                      )}
                      {(!data?.expenses || data.expenses.length === 0) && (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No expenses recorded
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Staff Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Waiter Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isFetching ? (
                  <TableSkeleton columnCount={3} rowCount={3} />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.staffPerformance.byWaiter.map((item: any) => (
                        <TableRow key={item._id}>
                          <TableCell className="font-medium">
                            {item.name}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.count}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.total)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setStaffDetailModal({
                                  isOpen: true,
                                  type: "waiter",
                                  staffId: item._id,
                                  staffName: item.name,
                                })
                              }
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!data?.staffPerformance.byWaiter ||
                        data.staffPerformance.byWaiter.length === 0) && (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="h-16 text-center text-muted-foreground"
                            >
                              No waiter data for selected filters
                            </TableCell>
                          </TableRow>
                        )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  Cashier Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isFetching ? (
                  <TableSkeleton columnCount={3} rowCount={3} />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Settled</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.staffPerformance.byCashier.map((item: any) => (
                        <TableRow key={item._id}>
                          <TableCell className="font-medium">
                            {item.name}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.count}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.total)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setStaffDetailModal({
                                  isOpen: true,
                                  type: "cashier",
                                  staffId: item._id,
                                  staffName: item.name,
                                })
                              }
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!data?.staffPerformance.byCashier ||
                        data.staffPerformance.byCashier.length === 0) && (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="h-16 text-center text-muted-foreground"
                            >
                              No cashier data for selected filters
                            </TableCell>
                          </TableRow>
                        )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </Tabs>

      {/* Staff Detail Modal */}
      <Dialog
        open={staffDetailModal.isOpen}
        onOpenChange={(open) =>
          setStaffDetailModal((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {staffDetailModal.type === "waiter" ? "Waiter" : "Cashier"}{" "}
              Details
            </DialogTitle>
            <DialogDescription>
              Order details for {staffDetailModal.staffName}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <StaffOrderDetails
              key={`${staffDetailModal.staffId}-${staffDetailModal.type}`}
              staffId={staffDetailModal.staffId}
              staffType={staffDetailModal.type}
              startDate={detailRange.startDate}
              endDate={detailRange.endDate}
              statusFilter={statusFilter}
              paymentFilter={paymentFilter}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setStaffDetailModal({
                  isOpen: false,
                  type: "waiter",
                  staffId: "",
                  staffName: "",
                })
              }
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
