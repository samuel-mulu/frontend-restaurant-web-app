"use client";

import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { WithdrawalModal } from "@/components/shared/WithdrawalModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
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
import { convertToCSV, formatReportForThermal } from "@/lib/exportUtils";
import { posPrinterService } from "@/stores/features/posPrinter/posPrinterApi";
import {
  ReportStaffOrderDetail,
  SoldItemsPerformanceResponse,
  useCreateExpenseMutation,
  useGetDailyReportQuery,
  useGetExpensesQuery,
  useGetMonthlyReportQuery,
  useGetReportStaffOrdersQuery,
  useGetSoldItemsPerformanceQuery,
} from "@/stores/features/statistics/statisticsApi";
import {
  ArrowDownCircle,
  Banknote,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Package,
  Printer,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import "./print-styles.css";

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
                orders.reduce(
                  (sum: number, order: ReportStaffOrderDetail) =>
                    sum + order.totalAmount,
                  0,
                ) / orders.length,
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
            {Array.from(
              new Set(
                orders.map((o: ReportStaffOrderDetail) => o.paymentMethod),
              ),
            ).join(", ")}
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
                <PaymentBadge
                  paymentMethod={order.paymentMethod || "unknown"}
                />
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

const REASON_LABELS: Record<string, string> = {
  inventory: "Inventory Purchase",
  withdrawal: "General Withdrawal",
  salary_advance: "Salary Advance",
  broke_products: "Broke Products",
  utility: "Utilities / Repairs",
  other: "Other",
};
const EXPENSE_CATEGORY_ORDER = [
  "inventory",
  "withdrawal",
  "salary_advance",
  "broke_products",
  "utility",
  "other",
];

export default function ReportsPage() {
  const SOLD_ITEMS_PAGE_SIZE = 20;
  const EXPENSES_PAGE_SIZE = 10;
  const [viewType, setViewType] = useState<"daily" | "monthly">("daily");
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("TRANSFERRED_TO_OWNER");
  const [paymentFilter, setPaymentFilter] = useState<string>("ALL");
  const [expenseTypeFilter, setExpenseTypeFilter] = useState<string>("ALL");
  const [itemTypeFilter, setItemTypeFilter] = useState<
    "ALL" | "menu" | "inventory"
  >("ALL");
  const selectedStatus = statusFilter === "ALL" ? undefined : statusFilter;
  const [soldItemsPage, setSoldItemsPage] = useState(1);
  const [expensesPage, setExpensesPage] = useState(1);

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

  // Print Options Modal State
  const [printModal, setPrintModal] = useState({
    isOpen: false,
    sections: {
      sales: true,
      expenses: true,
      netRevenue: true,
      paymentBreakdown: true,
      cashierPerformance: false,
      menuPerformance: false,
      inventoryPerformance: false,
    },
  });

  // PDF Options Modal State
  const [pdfModal, setPdfModal] = useState<{
    isOpen: boolean;
    sections: {
      yesterdayComparison: boolean;
      orderStatusSummary: boolean;
      categoryMenuSummary: boolean;
      expenses: boolean;
      paymentBreakdown: boolean;
      cashierPerformance: boolean;
      waiterPerformance: boolean;
      itemPerformance: boolean;
    };
  }>({
    isOpen: false,
    sections: {
      yesterdayComparison: true,
      orderStatusSummary: true,
      categoryMenuSummary: true,
      expenses: true,
      paymentBreakdown: true,
      cashierPerformance: true,
      waiterPerformance: false,
      itemPerformance: true,
    },
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

  const yesterdayDate = subDays(selectedDate, 1);
  const yesterdayDateStr = formatDateForReport(yesterdayDate, "yyyy-MM-dd");
  const yesterdayRange = getReportDateRange(yesterdayDate, viewType);

  const lastMonthDate = subMonths(selectedDate, 1);
  const lastMonthRange = getReportDateRange(lastMonthDate, viewType);

  const yesterdayReportQuery = useGetDailyReportQuery(
    { date: yesterdayDateStr, status: selectedStatus },
    { skip: viewType !== "daily" },
  );
  const yesterdayExpensesQuery = useGetExpensesQuery(
    {
      startDate: yesterdayRange.startDate,
      endDate: yesterdayRange.endDate,
      expenseType: expenseTypeFilter,
    },
    { skip: viewType !== "daily" },
  );

  const lastMonthReportQuery = useGetMonthlyReportQuery(
    {
      year: lastMonthDate.getFullYear(),
      month: lastMonthDate.getMonth() + 1,
      status: selectedStatus,
    },
    { skip: viewType !== "monthly" },
  );
  const lastMonthExpensesQuery = useGetExpensesQuery(
    {
      startDate: lastMonthRange.startDate,
      endDate: lastMonthRange.endDate,
      expenseType: expenseTypeFilter,
    },
    { skip: viewType !== "monthly" },
  );

  const ordersByStatusQuery = useGetDailyReportQuery(
    { date: formatDateForReport(selectedDate, "yyyy-MM-dd") },
    { skip: viewType !== "daily" },
  );

  const monthlyOrdersByStatusQuery = useGetMonthlyReportQuery(
    {
      year: selectedDate.getFullYear(),
      month: selectedDate.getMonth() + 1,
    },
    { skip: viewType !== "monthly" },
  );

  const detailRange = getReportDateRange(selectedDate, viewType);
  const expensesQuery = useGetExpensesQuery({
    startDate: detailRange.startDate,
    endDate: detailRange.endDate,
    expenseType: expenseTypeFilter,
  });
  const soldItemsQuery = useGetSoldItemsPerformanceQuery({
    startDate: detailRange.startDate,
    endDate: detailRange.endDate,
    status: statusFilter,
    paymentMethod: paymentFilter,
    itemType: itemTypeFilter,
    page: soldItemsPage,
    limit: SOLD_ITEMS_PAGE_SIZE,
  });

  // Query for all sold items (unlimited) for PDF export
  const allSoldItemsQuery = useGetSoldItemsPerformanceQuery({
    startDate: detailRange.startDate,
    endDate: detailRange.endDate,
    status: statusFilter,
    paymentMethod: paymentFilter,
    itemType: itemTypeFilter,
    page: 1,
    limit: 9999, // fetch everything for PDF
  });
  const allSoldItems = allSoldItemsQuery.data?.items ?? [];

  const [createExpense, { isLoading: isCreatingExpense }] =
    useCreateExpenseMutation();

  const { data, isLoading, isFetching, error, refetch } =
    viewType === "daily" ? dailyQuery : monthlyQuery;
  const {
    data: expensesList = [],
    isFetching: isExpensesFetching,
  } = expensesQuery;

  useEffect(() => {
    setSoldItemsPage(1);
  }, [viewType, selectedDate, statusFilter, paymentFilter, itemTypeFilter]);

  useEffect(() => {
    setExpensesPage(1);
  }, [viewType, selectedDate, expenseTypeFilter]);

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

  const handleExportCSV = () => {
    try {
      const csvSections: string[] = [];
      const toTitleCase = (s: string) =>
        s.replace(/\w\S*/g, (w) =>
          w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
        );

      // === SUMMARY ===
      const summaryData = [
        { Metric: "Total Sales", Value: totalSales.toFixed(2) },
        { Metric: "Total Expenses", Value: totalExpenses.toFixed(2) },
        { Metric: "Net Revenue", Value: netRevenue.toFixed(2) },
      ];
      csvSections.push("=== SUMMARY ===");
      csvSections.push(convertToCSV(summaryData));

      // === YESTERDAY / LAST MONTH COMPARISON ===
      const prevReport =
        viewType === "daily"
          ? yesterdayReportQuery.data
          : lastMonthReportQuery.data;
      const prevExpenses =
        viewType === "daily"
          ? yesterdayExpensesQuery.data
          : lastMonthExpensesQuery.data;
      const prevLabel = viewType === "daily" ? "Yesterday" : "Last Month";
      const prevTotalSales =
        prevReport?.orders?.reduce(
          (s: number, o: any) => s + (o.total || 0),
          0,
        ) ?? 0;
      const prevTotalExpenses =
        prevExpenses?.reduce((s: number, e: any) => s + (e.amount || 0), 0) ?? 0;
      const prevNetRevenue = prevTotalSales - prevTotalExpenses;
      if (prevReport) {
        const comparisonData = [
          {
            Metric: "Revenue",
            [viewType === "daily" ? "Today" : "This Month"]:
              totalSales.toFixed(2),
            [prevLabel]: prevTotalSales.toFixed(2),
            Change: (totalSales - prevTotalSales).toFixed(2),
          },
          {
            Metric: "Expenses",
            [viewType === "daily" ? "Today" : "This Month"]:
              totalExpenses.toFixed(2),
            [prevLabel]: prevTotalExpenses.toFixed(2),
            Change: (totalExpenses - prevTotalExpenses).toFixed(2),
          },
          {
            Metric: "Net Revenue",
            [viewType === "daily" ? "Today" : "This Month"]:
              netRevenue.toFixed(2),
            [prevLabel]: prevNetRevenue.toFixed(2),
            Change: (netRevenue - prevNetRevenue).toFixed(2),
          },
        ];
        csvSections.push(`=== ${prevLabel.toUpperCase()} COMPARISON ===`);
        csvSections.push(convertToCSV(comparisonData));
      }

      // === ORDER STATUS SUMMARY (OPEN & VOIDED) ===
      const ordersByStatus =
        viewType === "daily"
          ? ordersByStatusQuery.data?.orders ?? []
          : monthlyOrdersByStatusQuery.data?.orders ?? [];
      const STATUS_LABELS: Record<string, string> = {
        OPEN: "Open (Not Paid / Pending)",
        VOIDED: "Voided (Cancelled)",
        PAID_TO_CASHIER: "Paid to Waiter",
        TRANSFERRED_TO_OWNER: "Paid to Cashier",
        OWNER_CONFIRMED: "Owner Confirmed",
        DISPUTED: "Disputed",
      };
      const STATUS_ORDER = [
        "OPEN",
        "VOIDED",
        "PAID_TO_CASHIER",
        "TRANSFERRED_TO_OWNER",
        "OWNER_CONFIRMED",
        "DISPUTED",
      ];
      if (ordersByStatus.length > 0) {
        const statusData = STATUS_ORDER.filter((k) =>
          ordersByStatus.some((o: any) => o._id === k),
        ).flatMap((key) => {
          const item = ordersByStatus.find((o: any) => o._id === key);
          if (!item) return [];
          const label = STATUS_LABELS[key] || key.replace(/_/g, " ");
          return [
            {
              Status: label,
              Orders: item.count ?? 0,
              Subtotal: (item.total ?? 0).toFixed(2),
            },
          ];
        });
        csvSections.push("=== ORDER STATUS SUMMARY (OPEN & VOIDED) ===");
        csvSections.push(convertToCSV(statusData));
      }

      // === EXPENSES & WITHDRAWALS ===
      if (expensesList.length > 0) {
        const groupedExpenses = expensesList.reduce(
          (acc: Record<string, any[]>, ex: any) => {
            const key = ex.reason || "other";
            if (!acc[key]) acc[key] = [];
            acc[key].push(ex);
            return acc;
          },
          {},
        );
        const expenseRows: {
          Category: string;
          Description: string;
          "Payment Method": string;
          Amount: string;
        }[] = [];
        EXPENSE_CATEGORY_ORDER.forEach((key) => {
          const items = groupedExpenses[key];
          if (!items?.length) return;
          const categoryLabel = REASON_LABELS[key] || key.replace("_", " ");
          items.forEach((ex: any) => {
            const paymentMethod =
              ex.expenseType === "mobile_banking" ? "Mobile Banking" : "Cash";
            expenseRows.push({
              Category: categoryLabel,
              Description: toTitleCase(ex.description || "—"),
              "Payment Method": paymentMethod,
              Amount: ex.amount.toFixed(2),
            });
          });
          const subtotal = items.reduce((s: number, ex: any) => s + ex.amount, 0);
          expenseRows.push({
            Category: `Subtotal - ${categoryLabel}`,
            Description: "",
            "Payment Method": "",
            Amount: subtotal.toFixed(2),
          });
        });
        expenseRows.push({
          Category: "Total Expenses",
          Description: "",
          "Payment Method": "",
          Amount: totalExpenses.toFixed(2),
        });
        csvSections.push("=== EXPENSES & WITHDRAWALS ===");
        csvSections.push(convertToCSV(expenseRows));
      }

      // === PAYMENT BREAKDOWN ===
      if (filteredSales.length > 0) {
        const paymentData = filteredSales.map((item: any) => ({
          Method:
            item._id.method === "unpaid"
              ? "Unpaid / Pending"
              : item._id.method.replace("_", " "),
          Bank: item._id.bank || "-",
          Orders: item.count,
          Amount: item.total.toFixed(2),
        }));
        csvSections.push("=== PAYMENT BREAKDOWN ===");
        csvSections.push(convertToCSV(paymentData));
      }

      // === CASHIER PERFORMANCE ===
      if (sortedCashiers.length > 0) {
        const cashierData = sortedCashiers.map((item: any) => ({
          Name: item.name,
          Orders: item.count,
          "Settled Amount": item.total.toFixed(2),
        }));
        csvSections.push("=== CASHIER PERFORMANCE ===");
        csvSections.push(convertToCSV(cashierData));
      }

      // === WAITER PERFORMANCE ===
      if (sortedWaiters.length > 0) {
        const waiterData = sortedWaiters.map((item: any) => ({
          Name: item.name,
          Orders: item.count,
          Revenue: item.total.toFixed(2),
        }));
        csvSections.push("=== WAITER PERFORMANCE ===");
        csvSections.push(convertToCSV(waiterData));
      }

      // === CATEGORY MENU SUMMARY (Breakfast, Lunch, Dinner, Treats) ===
      const MEAL_TYPE_LABELS: Record<string, string> = {
        breakfast: "Breakfast",
        lunch: "Lunch",
        dinner: "Dinner",
        treats: "Treats",
      };
      const MEAL_TYPE_ORDER = ["breakfast", "lunch", "dinner", "treats"];
      const menuItemsByMealType = (allSoldItems as any[])
        .filter((i) => i.itemType === "menu")
        .reduce(
          (acc: Record<string, { qty: number; amount: number }>, item: any) => {
            const key = item.mealType || "other";
            if (!acc[key]) acc[key] = { qty: 0, amount: 0 };
            acc[key].qty += item.qtySold ?? 0;
            acc[key].amount += item.salesAmount ?? 0;
            return acc;
          },
          {},
        );
      if (Object.keys(menuItemsByMealType).length > 0) {
        const categoryMenuData = [...MEAL_TYPE_ORDER, "other"]
          .filter((k) => menuItemsByMealType[k])
          .map((key) => ({
            Category: MEAL_TYPE_LABELS[key] || "Other",
            "Qty Sold": menuItemsByMealType[key].qty,
            Revenue: menuItemsByMealType[key].amount.toFixed(2),
          }));
        csvSections.push("=== CATEGORY MENU SUMMARY ===");
        csvSections.push(convertToCSV(categoryMenuData));
      }

      // === MENU PERFORMANCE ===
      const menuItems = (allSoldItems as any[]).filter(
        (i) => i.itemType === "menu",
      );
      if (menuItems.length > 0) {
        const menuData = menuItems.map((item: any) => ({
          "Item Name": toTitleCase(item.itemName || ""),
          Quantity: item.qtySold ?? 0,
          Amount: (item.salesAmount ?? 0).toFixed(2),
        }));
        csvSections.push("=== MENU PERFORMANCE ===");
        csvSections.push(convertToCSV(menuData));
      }

      // === INVENTORY PERFORMANCE ===
      const inventoryItems = (allSoldItems as any[]).filter(
        (i) => i.itemType === "inventory",
      );
      if (inventoryItems.length > 0) {
        const inventoryData = inventoryItems.map((item: any) => ({
          "Item Name": toTitleCase(item.itemName || ""),
          Quantity: item.qtySold ?? 0,
          Amount: (item.salesAmount ?? 0).toFixed(2),
        }));
        csvSections.push("=== INVENTORY PERFORMANCE ===");
        csvSections.push(convertToCSV(inventoryData));
      }

      const csvString = "\uFEFF" + csvSections.join("\n\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `Report_${viewType}_${formatDateForReport(selectedDate, "yyyy-MM-dd")}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("CSV Exported successfully");
    } catch (err) {
      toast.error("Failed to export CSV");
    }
  };

  const handleExportPDF = () => {
    setPdfModal((p) => ({ ...p, isOpen: true }));
  };

  const handleGeneratePDF = () => {
    setPdfModal((p) => ({ ...p, isOpen: false }));
    // Generate HTML and open in new window for better pagination
    setTimeout(() => {
      handlePrint();
    }, 300);
  };

  const handlePrint = () => {
    // Generate complete HTML with all data
    const printHTML = generatePrintHTML();

    // Generate filename with restaurant name and date
    const reportDate = formatDateForReport(
      selectedDate,
      viewType === "daily" ? "PPP" : "MMMM yyyy",
    );
    const filename = `Kandino's Kitchen-${reportDate}-report`;

    // Open new window with the HTML content
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printHTML);
      printWindow.document.close();

      // Set document title for filename
      printWindow.document.title = filename;

      // Wait for content to load, then trigger print dialog
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    } else {
      toast.error(
        "Failed to open print window. Please allow popups for this site.",
      );
    }
  };

  const TOP_ITEMS_LIMIT = 15;
  const toTitleCase = (s: string) =>
    s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

  const generatePrintHTML = () => {
    const currentDate = new Date().toLocaleString();
    const reportDate = formatDateForReport(
      selectedDate,
      viewType === "daily" ? "PPP" : "MMMM yyyy",
    );
    const pdfFormatCurrency = (n: number) =>
      new Intl.NumberFormat("en-ET", {
        style: "currency",
        currency: "ETB",
        minimumFractionDigits: 2,
      }).format(n);

    const prevReport =
      viewType === "daily" ? yesterdayReportQuery.data : lastMonthReportQuery.data;
    const prevExpenses =
      viewType === "daily"
        ? yesterdayExpensesQuery.data
        : lastMonthExpensesQuery.data;
    const prevLabel = viewType === "daily" ? "Yesterday" : "Last Month";
    const prevTotalSales =
      prevReport?.orders?.reduce((s: number, o: any) => s + (o.total || 0), 0) ?? 0;
    const prevTotalExpenses =
      prevExpenses?.reduce((s: number, e: any) => s + (e.amount || 0), 0) ?? 0;
    const prevNetRevenue = prevTotalSales - prevTotalExpenses;

    const ordersByStatus =
      viewType === "daily"
        ? ordersByStatusQuery.data?.orders ?? []
        : monthlyOrdersByStatusQuery.data?.orders ?? [];
    const STATUS_LABELS: Record<string, string> = {
      OPEN: "Open (Not Paid / Pending)",
      VOIDED: "Voided (Cancelled)",
      PAID_TO_CASHIER: "Paid to Waiter",
      TRANSFERRED_TO_OWNER: "Paid to Cashier",
      OWNER_CONFIRMED: "Owner Confirmed",
      DISPUTED: "Disputed",
    };
    const STATUS_ORDER = [
      "OPEN",
      "VOIDED",
      "PAID_TO_CASHIER",
      "TRANSFERRED_TO_OWNER",
      "OWNER_CONFIRMED",
      "DISPUTED",
    ];

    const MEAL_TYPE_LABELS: Record<string, string> = {
      breakfast: "Breakfast",
      lunch: "Lunch",
      dinner: "Dinner",
      treats: "Treats",
    };
    const MEAL_TYPE_ORDER = ["breakfast", "lunch", "dinner", "treats"];
    const menuItemsByMealType = (allSoldItems as any[])
      .filter((i) => i.itemType === "menu")
      .reduce((acc: Record<string, { qty: number; amount: number }>, item: any) => {
        const key = item.mealType || "other";
        if (!acc[key]) acc[key] = { qty: 0, amount: 0 };
        acc[key].qty += item.qtySold ?? 0;
        acc[key].amount += item.salesAmount ?? 0;
        return acc;
      }, {});

    // Group expenses by reason
    const groupedExpenses = expensesList.reduce((acc: Record<string, any[]>, ex: any) => {
      const key = ex.reason || "other";
      if (!acc[key]) acc[key] = [];
      acc[key].push(ex);
      return acc;
    }, {});

    const formatPaymentMethod = (ex: any) => {
      const t = ex.expenseType || "cash";
      return t === "mobile_banking" ? "Mobile Banking" : "Cash";
    };

    // Generate expenses HTML - categorized by reason with Payment Method column and subtotals
    const expensesHTML =
      pdfModal.sections.expenses && expensesList.length > 0
        ? EXPENSE_CATEGORY_ORDER.filter((key) => groupedExpenses[key]?.length)
            .map((key) => {
              const items = groupedExpenses[key];
              const subtotal = items.reduce((s: number, ex: any) => s + ex.amount, 0);
              const rows = items
                .map(
                  (ex: any) => `
                <tr>
                  <td>${toTitleCase(ex.description || "—")}</td>
                  <td>${formatPaymentMethod(ex)}</td>
                  <td class="text-right amount-cell">${pdfFormatCurrency(ex.amount)}</td>
                </tr>
              `,
                )
                .join("");
              const label = REASON_LABELS[key] || key.replace("_", " ");
              return `
              <div class="expense-category-block" style="margin-bottom: 20pt;">
                <h4 class="expense-category-title">${label}</h4>
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Payment Method</th>
                      <th class="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows}
                    <tr class="subtotal-row">
                      <td colspan="2" class="text-right subtotal-label">Subtotal</td>
                      <td class="text-right amount-cell subtotal-value">${pdfFormatCurrency(subtotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            `;
            })
            .join("") +
          `
          <div class="grand-total-expenses">
            <strong>Total Expenses: ${pdfFormatCurrency(expensesList.reduce((s: number, ex: any) => s + ex.amount, 0))}</strong>
          </div>
        `
        : "";

    // Generate payment breakdown HTML with total row
    const paymentTotal = filteredSales.reduce((s: number, i: any) => s + i.total, 0);
    const paymentHTML =
      pdfModal.sections.paymentBreakdown && filteredSales.length > 0
        ? filteredSales
            .map(
              (item: any) => `
          <tr>
            <td class="capitalize">${item._id.method === "unpaid" ? "Unpaid / Pending" : item._id.method.replace("_", " ")}</td>
            <td>${item._id.bank || "-"}</td>
            <td class="text-right">${item.count}</td>
            <td class="text-right amount-cell">${pdfFormatCurrency(item.total)}</td>
          </tr>
        `,
            )
            .join("") +
          `
          <tr class="subtotal-row">
            <td colspan="2" class="text-right subtotal-label">Total</td>
            <td class="text-right">${filteredSales.reduce((s: number, i: any) => s + i.count, 0)}</td>
            <td class="text-right amount-cell subtotal-value">${pdfFormatCurrency(paymentTotal)}</td>
          </tr>
        `
        : "";

    // Generate cashier performance HTML
    const cashierHTML =
      pdfModal.sections.cashierPerformance && sortedCashiers.length > 0
        ? sortedCashiers
            .map(
              (item: any) => `
          <tr>
            <td class="font-medium">${item.name}</td>
            <td class="text-right">${item.count}</td>
            <td class="text-right amount-cell">${pdfFormatCurrency(item.total)}</td>
          </tr>
        `,
            )
            .join("")
        : "";

    // Generate waiter performance HTML
    const waiterHTML =
      pdfModal.sections.waiterPerformance && sortedWaiters.length > 0
        ? sortedWaiters
            .map(
              (item: any) => `
          <tr>
            <td class="font-medium">${item.name}</td>
            <td class="text-right">${item.count}</td>
            <td class="text-right amount-cell">${pdfFormatCurrency(item.total)}</td>
          </tr>
        `,
            )
            .join("")
        : "";

    // Split menu and inventory, show Top 15 + Others
    const menuItems = (allSoldItems as any[]).filter((i) => i.itemType === "menu");
    const inventoryItems = (allSoldItems as any[]).filter((i) => i.itemType === "inventory");

    const buildItemPerformanceHTML = (
      items: any[],
      title: string,
    ) => {
      if (items.length === 0) return "";
      const topItems = items.slice(0, TOP_ITEMS_LIMIT);
      const restItems = items.slice(TOP_ITEMS_LIMIT);
      const restQty = restItems.reduce((s, i) => s + (i.qtySold || 0), 0);
      const restAmount = restItems.reduce((s, i) => s + (i.salesAmount || 0), 0);

      const rows = topItems
        .map(
          (item: any) => `
        <tr>
          <td>${toTitleCase(item.itemName || "")}</td>
          <td class="text-right">${item.qtySold ?? 0}</td>
          <td class="text-right amount-cell">${pdfFormatCurrency(item.salesAmount ?? 0)}</td>
        </tr>
      `,
        )
        .join("");

      const othersRow =
        restItems.length > 0
          ? `
        <tr class="subtotal-row">
          <td class="others-label">Others (${restItems.length} more items)</td>
          <td class="text-right">${restQty}</td>
          <td class="text-right amount-cell subtotal-value">${pdfFormatCurrency(restAmount)}</td>
        </tr>
      `
          : "";

      return `
        <div class="item-performance-block" style="margin-bottom: 20pt;">
          <h4 class="expense-category-title">${title}</h4>
          <table class="data-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
              ${othersRow}
            </tbody>
          </table>
        </div>
      `;
    };

    const menuPerformanceHTML =
      pdfModal.sections.itemPerformance && menuItems.length > 0
        ? buildItemPerformanceHTML(menuItems, "Menu Performance")
        : "";
    const inventoryPerformanceHTML =
      pdfModal.sections.itemPerformance && inventoryItems.length > 0
        ? buildItemPerformanceHTML(inventoryItems, "Inventory Performance")
        : "";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Restaurant Report</title>
        <style>
          @page {
            size: A4;
            margin: 1cm;
          }
          
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            line-height: 1.4;
            color: #2c3e50;
            background: white;
          }
          
          .header {
            text-align: center;
            border-bottom: 3px solid #3498db;
            padding-bottom: 16pt;
            margin-bottom: 24pt;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 20pt;
            border-radius: 8pt;
          }
          
          .header h1 {
            font-size: 24pt;
            font-weight: bold;
            margin-bottom: 8pt;
            color: #2c3e50;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
          }
          
          .header h2 {
            font-size: 18pt;
            font-weight: bold;
            margin-bottom: 8pt;
            color: #3498db;
          }
          
          .meta {
            font-size: 9pt;
            color: #7f8c8d;
            margin-top: 8pt;
            background: rgba(255,255,255,0.8);
            padding: 8pt;
            border-radius: 4pt;
          }
          
          .section {
            margin-bottom: 24pt;
            page-break-inside: avoid;
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 8pt;
            padding: 16pt;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }
          
          .section h3 {
            font-size: 14pt;
            font-weight: bold;
            text-transform: uppercase;
            border-bottom: 2px solid #3498db;
            padding-bottom: 8pt;
            margin-top: 0;
            margin-bottom: 12pt;
            page-break-after: avoid;
            color: #2c3e50;
          }
          
          .financial-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12pt;
            margin: 16pt 0;
            page-break-inside: avoid;
          }
          
          .financial-item {
            border: 2px solid #3498db;
            padding: 12pt;
            text-align: center;
            border-radius: 8pt;
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            box-shadow: 0 2px 8px rgba(52, 152, 219, 0.15);
          }
          
          .financial-label {
            font-size: 9pt;
            font-weight: bold;
            margin-bottom: 4pt;
            color: #7f8c8d;
            text-transform: uppercase;
            letter-spacing: 0.5pt;
          }
          
          .financial-value {
            font-size: 16pt;
            font-weight: bold;
            color: #2c3e50;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 8pt 0;
            font-size: 10pt;
            page-break-inside: auto;
          }
          
          th {
            border: 1px solid #3498db;
            padding: 6pt;
            text-align: left;
            font-weight: bold;
            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
            color: white;
            text-transform: uppercase;
            font-size: 9pt;
            letter-spacing: 0.5pt;
          }
          
          td {
            border: 1px solid #e9ecef;
            padding: 4pt 6pt;
            vertical-align: top;
            background: white;
          }
          
          tr:nth-child(even) td {
            background: #f8f9fa;
          }
          
          .text-right {
            text-align: right;
          }
          
          .font-bold {
            font-weight: bold;
            color: #2c3e50;
          }
          
          .footer {
            margin-top: 36pt;
            padding-top: 16pt;
            border-top: 2px solid #3498db;
            text-align: center;
            font-size: 8pt;
            color: #7f8c8d;
            page-break-before: auto;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 16pt;
            border-radius: 8pt;
          }
          
          .compact-table {
            font-size: 8pt;
            line-height: 1.1;
          }
          
          .compact-table th,
          .compact-table td {
            padding: 2pt 4pt;
          }

          .expense-category-title {
            font-size: 12pt;
            font-weight: bold;
            margin: 0 0 10pt 0;
            color: #2c3e50;
            text-transform: uppercase;
            letter-spacing: 0.5pt;
            border-bottom: 1px solid #e9ecef;
            padding-bottom: 6pt;
          }

          .subtotal-row td {
            background: #f0f7ff !important;
            font-weight: bold;
            border-top: 1px solid #3498db;
            padding: 8pt 6pt;
          }

          .subtotal-label {
            font-size: 10pt;
          }

          .subtotal-value {
            font-size: 11pt;
            color: #2c3e50;
          }

          .grand-total-expenses {
            margin-top: 16pt;
            padding: 12pt;
            background: linear-gradient(135deg, #e8f4fc 0%, #d6eaf8 100%);
            border: 2px solid #3498db;
            border-radius: 8pt;
            font-size: 14pt;
            text-align: right;
            color: #2c3e50;
          }

          .amount-cell {
            font-variant-numeric: tabular-nums;
            white-space: nowrap;
          }

          .others-label {
            font-style: italic;
            color: #7f8c8d;
          }

          .data-table {
            font-size: 10pt;
          }

          .header-meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8pt;
            margin-top: 12pt;
            font-size: 10pt;
            text-align: left;
          }

          .header-meta-item {
            background: rgba(255,255,255,0.9);
            padding: 8pt 12pt;
            border-radius: 4pt;
            border: 1px solid #e9ecef;
          }

          .header-meta-label {
            font-weight: bold;
            color: #7f8c8d;
            text-transform: uppercase;
            font-size: 8pt;
            letter-spacing: 0.5pt;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Kandino's Kitchen</h1>
          <h2>${viewType === "daily" ? "DAILY PERFORMANCE REPORT" : "MONTHLY PERFORMANCE REPORT"}</h2>
          <div class="header-meta-grid">
            <div class="header-meta-item">
              <div class="header-meta-label">Report Date</div>
              <div>${reportDate}</div>
            </div>
            <div class="header-meta-item">
              <div class="header-meta-label">Status Filter</div>
              <div>${toTitleCase(statusFilter.replace(/_/g, " "))}</div>
            </div>
            <div class="header-meta-item">
              <div class="header-meta-label">Payment Filter</div>
              <div>${paymentFilter === "ALL" ? "All Methods" : toTitleCase(paymentFilter.replace(/_/g, " "))}</div>
            </div>
            <div class="header-meta-item">
              <div class="header-meta-label">Generated</div>
              <div>${currentDate}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h3>Financial Summary</h3>
          <div class="financial-grid">
            <div class="financial-item">
              <div class="financial-label">Total Sales</div>
              <div class="financial-value">${pdfFormatCurrency(totalSales)}</div>
            </div>
            <div class="financial-item">
              <div class="financial-label">Total Expenses</div>
              <div class="financial-value">${pdfFormatCurrency(totalExpenses)}</div>
            </div>
            <div class="financial-item">
              <div class="financial-label">Net Revenue</div>
              <div class="financial-value">${pdfFormatCurrency(netRevenue)}</div>
            </div>
          </div>
        </div>

        ${
          pdfModal.sections.yesterdayComparison && prevReport
            ? `
        <div class="section">
          <h3>${prevLabel} Comparison</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th class="text-right">${viewType === "daily" ? "Today" : "This Month"}</th>
                <th class="text-right">${prevLabel}</th>
                <th class="text-right">Change</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Revenue</td>
                <td class="text-right amount-cell">${pdfFormatCurrency(totalSales)}</td>
                <td class="text-right amount-cell">${pdfFormatCurrency(prevTotalSales)}</td>
                <td class="text-right amount-cell">${pdfFormatCurrency(totalSales - prevTotalSales)}</td>
              </tr>
              <tr>
                <td>Expenses</td>
                <td class="text-right amount-cell">${pdfFormatCurrency(totalExpenses)}</td>
                <td class="text-right amount-cell">${pdfFormatCurrency(prevTotalExpenses)}</td>
                <td class="text-right amount-cell">${pdfFormatCurrency(totalExpenses - prevTotalExpenses)}</td>
              </tr>
              <tr class="subtotal-row">
                <td>Net Revenue</td>
                <td class="text-right amount-cell subtotal-value">${pdfFormatCurrency(netRevenue)}</td>
                <td class="text-right amount-cell subtotal-value">${pdfFormatCurrency(prevNetRevenue)}</td>
                <td class="text-right amount-cell subtotal-value">${pdfFormatCurrency(netRevenue - prevNetRevenue)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        `
            : ""
        }

        ${
          pdfModal.sections.orderStatusSummary && ordersByStatus.length > 0
            ? `
        <div class="section">
          <h3>Order Status Summary</h3>
          <p class="text-sm" style="margin-bottom: 10pt; color: #7f8c8d;">Open = orders not paid or pending. Voided = cancelled orders.</p>
          ${STATUS_ORDER.filter((k) => ordersByStatus.some((o: any) => o._id === k))
            .map((key) => {
              const item = ordersByStatus.find((o: any) => o._id === key);
              if (!item) return "";
              const label = STATUS_LABELS[key] || key.replace(/_/g, " ");
              return `
              <div class="expense-category-block" style="margin-bottom: 12pt;">
                <h4 class="expense-category-title">${label}</h4>
                <table class="data-table">
                  <tbody>
                    <tr>
                      <td>Orders</td>
                      <td class="text-right font-bold">${item.count ?? 0}</td>
                    </tr>
                    <tr class="subtotal-row">
                      <td class="subtotal-label">Subtotal</td>
                      <td class="text-right amount-cell subtotal-value">${pdfFormatCurrency(item.total ?? 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            `;
            })
            .join("")}
        </div>
        `
            : ""
        }

        ${
          expensesHTML
            ? `
        <div class="section">
          <h3>Expenses & Withdrawals</h3>
          ${expensesHTML}
        </div>
        `
            : ""
        }

        ${
          paymentHTML
            ? `
        <div class="section">
          <h3>Payment Breakdown</h3>
          <table>
            <thead>
              <tr>
                <th>Method</th>
                <th>Bank</th>
                <th class="text-right">Orders</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${paymentHTML}
            </tbody>
          </table>
        </div>
        `
            : ""
        }

        ${
          cashierHTML
            ? `
        <div class="section">
          <h3>Cashier Performance</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th class="text-right">Orders</th>
                <th class="text-right">Settled</th>
              </tr>
            </thead>
            <tbody>
              ${cashierHTML}
            </tbody>
          </table>
        </div>
        `
            : ""
        }

        ${
          waiterHTML
            ? `
        <div class="section">
          <h3>Waiter Performance</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th class="text-right">Orders</th>
                <th class="text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${waiterHTML}
            </tbody>
          </table>
        </div>
        `
            : ""
        }

        ${
          pdfModal.sections.categoryMenuSummary &&
          Object.keys(menuItemsByMealType).length > 0
            ? `
        <div class="section">
          <h3>Category Menu Summary</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th class="text-right">Qty Sold</th>
                <th class="text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${[...MEAL_TYPE_ORDER, "other"]
                .filter((k) => menuItemsByMealType[k])
                .map(
                  (key) => `
                <tr>
                  <td>${MEAL_TYPE_LABELS[key] || "Other"}</td>
                  <td class="text-right">${menuItemsByMealType[key].qty}</td>
                  <td class="text-right amount-cell">${pdfFormatCurrency(menuItemsByMealType[key].amount)}</td>
                </tr>
              `,
                )
                .join("")}
              <tr class="subtotal-row">
                <td class="subtotal-label">Total</td>
                <td class="text-right">${Object.values(menuItemsByMealType).reduce((s, v) => s + v.qty, 0)}</td>
                <td class="text-right amount-cell subtotal-value">${pdfFormatCurrency(
                  Object.values(menuItemsByMealType).reduce((s, v) => s + v.amount, 0),
                )}</td>
              </tr>
            </tbody>
          </table>
        </div>
        `
            : ""
        }

        ${
          menuPerformanceHTML || inventoryPerformanceHTML
            ? `
        <div class="section">
          <h3>Menu & Inventory Performance</h3>
          ${menuPerformanceHTML}
          ${inventoryPerformanceHTML}
        </div>
        `
            : ""
        }

        <div class="footer">
          Generated: ${currentDate} • System Generated Report
        </div>
      </body>
      </html>
    `;
  };

  const handleThermalPrint = async () => {
    try {
      const receiptText = formatReportForThermal({
        title:
          viewType === "daily"
            ? "DAILY PERFORMANCE REPORT"
            : "MONTHLY PERFORMANCE REPORT",
        dateRange:
          viewType === "daily"
            ? formatDateForReport(selectedDate, "PPP")
            : formatDateForReport(selectedDate, "MMMM yyyy"),
        totalSales,
        totalExpenses,
        netRevenue,
        sections: printModal.sections,
        details: {
          salesByPayment: reportData.salesByPaymentMethod,
          expenses: expensesList,
          cashierPerformance: sortedCashiers,
          menuPerformance: soldItemsData.items.filter(
            (item) => item.itemType === "menu",
          ),
          inventoryPerformance: soldItemsData.items.filter(
            (item) => item.itemType === "inventory",
          ),
        },
      });

      const result = await posPrinterService.print(receiptText);
      if (result.success) {
        toast.success("Sent to printer successfully");
        setPrintModal((prev) => ({ ...prev, isOpen: false }));
      } else {
        toast.error("Printing failed", { description: result.error });
      }
    } catch (err) {
      toast.error("POS Printer connection failed");
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
    if (error instanceof Error) return error.message || "An error occurred";
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

  const reportData = data || {
    orders: [],
    expenses: [],
    salesByPaymentMethod: [],
    staffPerformance: { byWaiter: [], byCashier: [] },
  };

  const sortedWaiters = [...reportData.staffPerformance.byWaiter].sort(
    (a: any, b: any) => b.count - a.count,
  );
  const sortedCashiers = [...reportData.staffPerformance.byCashier].sort(
    (a: any, b: any) => b.count - a.count,
  );

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
    paymentFilter === "ALL" ? totalFromOrders : totalSalesFromPayment;
  const totalExpenses = expensesList.reduce(
    (acc: number, ex: { amount: number }) => acc + ex.amount,
    0,
  );
  const netRevenue = totalSales - totalExpenses;

  const flattenedExpenses = expensesList;
  const totalExpensesPages = Math.max(
    1,
    Math.ceil(flattenedExpenses.length / EXPENSES_PAGE_SIZE),
  );
  const paginatedExpenses = flattenedExpenses.slice(
    (expensesPage - 1) * EXPENSES_PAGE_SIZE,
    expensesPage * EXPENSES_PAGE_SIZE,
  );
  const soldItemsData: SoldItemsPerformanceResponse = soldItemsQuery.data || {
    items: [],
    pagination: {
      page: 1,
      limit: SOLD_ITEMS_PAGE_SIZE,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };

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
          <div className="flex flex-wrap items-center gap-2">
            <WithdrawalModal
              selectedDate={selectedDate}
              onSuccess={() => {
                refetch();
                expensesQuery.refetch();
              }}
            />

            <Select
              onValueChange={(val) => {
                if (val === "csv") handleExportCSV();
                if (val === "pdf") handleExportPDF();
                if (val === "print")
                  setPrintModal({ ...printModal, isOpen: true });
              }}
            >
              <SelectTrigger className="w-[140px] bg-slate-900 border-slate-700 text-white hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                    <span>CSV / Excel</span>
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-rose-500" />
                    <span>PDF Document</span>
                  </div>
                </SelectItem>
                <SelectItem value="print">
                  <div className="flex items-center gap-2">
                    <Printer className="h-4 w-4 text-blue-500" />
                    <span>Thermal Print</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

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
<SelectItem value="PAID_TO_CASHIER">Paid to Waiter</SelectItem>
                <SelectItem value="TRANSFERRED_TO_OWNER">
                  Paid to Cashier
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
                    {isExpensesFetching ? (
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
                    {isFetching || isExpensesFetching ? (
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
                            {item._id.method === "unpaid"
                              ? "Unpaid / Pending"
                              : item._id.method.replace("_", " ")}
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

            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-rose-500" />
                  Expenses & Withdrawals
                </CardTitle>
                <Select
                  value={expenseTypeFilter}
                  onValueChange={(v) => {
                    setExpenseTypeFilter(v);
                    setExpensesPage(1);
                  }}
                >
                  <SelectTrigger className="w-[160px] h-8 text-sm bg-white dark:bg-slate-800">
                    <SelectValue placeholder="Expense type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="mobile_banking">Mobile Banking</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="p-0">
                {isExpensesFetching ? (
                  <TableSkeleton columnCount={3} rowCount={3} />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reason / Details</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedExpenses.map((ex: any) => (
                        <TableRow key={ex._id}>
                          <TableCell className="capitalize">
                            <span className="font-semibold">
                              {REASON_LABELS[ex.reason || "other"] ||
                                (ex.reason || "").replace("_", " ")}
                            </span>
                            {ex.description && (
                              <span className="text-xs text-slate-500 block">
                                {ex.description}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {ex.expenseType === "mobile_banking"
                              ? "Mobile Banking"
                              : "Cash"}
                          </TableCell>
                          <TableCell className="text-rose-600 font-bold">
                            -{formatCurrency(ex.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {flattenedExpenses.length === 0 && (
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
                {flattenedExpenses.length > EXPENSES_PAGE_SIZE && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <span className="text-sm text-muted-foreground">
                      Page {expensesPage} of {totalExpensesPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setExpensesPage((p) => Math.max(1, p - 1))
                        }
                        disabled={expensesPage <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Prev
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setExpensesPage((p) =>
                            Math.min(totalExpensesPages, p + 1),
                          )
                        }
                        disabled={expensesPage >= totalExpensesPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

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
                      {sortedWaiters.map((item: any) => (
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
                      {sortedCashiers.map((item: any) => (
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
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b pb-4">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Package className="h-5 w-5 text-indigo-500" />
                    Menu & Inventory Performance
                  </CardTitle>
                  <Select
                    value={itemTypeFilter}
                    onValueChange={(value) =>
                      setItemTypeFilter(value as "ALL" | "menu" | "inventory")
                    }
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Item Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Items</SelectItem>
                      <SelectItem value="menu">Menu</SelectItem>
                      <SelectItem value="inventory">Inventory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {soldItemsQuery.isFetching ? (
                  <TableSkeleton columnCount={4} rowCount={5} />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Qty Sold</TableHead>
                        <TableHead className="text-right">
                          Sales Amount
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {soldItemsData.items.map((item, index) => (
                        <TableRow
                          key={`${item.itemType}-${item.itemId}-${index}`}
                        >
                          <TableCell className="font-medium">
                            {item.itemName}
                          </TableCell>
                          <TableCell className="text-xs uppercase text-muted-foreground">
                            {item.itemType}
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            {item.qtySold}x
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.salesAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {soldItemsData.items.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No sold items for selected filters
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <span className="text-xs text-muted-foreground">
                    Page {soldItemsData.pagination.page} of{" "}
                    {soldItemsData.pagination.totalPages || 1} ·{" "}
                    {soldItemsData.pagination.total} items
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!soldItemsData.pagination.hasPreviousPage}
                      onClick={() =>
                        setSoldItemsPage((p) => Math.max(1, p - 1))
                      }
                    >
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!soldItemsData.pagination.hasNextPage}
                      onClick={() => setSoldItemsPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
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
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
              <Users className="h-6 w-6 text-primary" />
              {staffDetailModal.staffName} History
            </DialogTitle>
            <DialogDescription>
              Detailed view of orders handled by this staff member.
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
                setStaffDetailModal((prev) => ({ ...prev, isOpen: false }))
              }
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Options Modal */}
      <Dialog
        open={printModal.isOpen}
        onOpenChange={(open) => setPrintModal((p) => ({ ...p, isOpen: open }))}
      >
        <DialogContent className="max-w-md bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" />
              Thermal Print Options
            </DialogTitle>
            <DialogDescription>
              Customize the sections to include in the printed receipt.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border">
              <div className="flex flex-col">
                <span className="text-sm font-semibold">Financial Summary</span>
                <span className="text-xs text-muted-foreground">
                  Required for report validity
                </span>
              </div>
              <Badge variant="secondary">Mandatory</Badge>
            </div>

            <div className="space-y-2">
              {[
                { id: "paymentBreakdown", label: "Payment Breakdown" },
                { id: "expenses", label: "Expenses Detail" },
                { id: "cashierPerformance", label: "Cashier Performance" },
                { id: "menuPerformance", label: "Menu Performance" },
                { id: "inventoryPerformance", label: "Inventory Performance" },
              ].map((section) => (
                <label
                  key={section.id}
                  className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer border transition-colors"
                >
                  <span className="text-sm font-medium">{section.label}</span>
                  <input
                    type="checkbox"
                    checked={(printModal.sections as any)[section.id]}
                    onChange={(e) =>
                      setPrintModal((p) => ({
                        ...p,
                        sections: {
                          ...p.sections,
                          [section.id]: e.target.checked,
                        },
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                </label>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setPrintModal((p) => ({ ...p, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button
              onClick={handleThermalPrint}
              className="bg-primary text-white"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print to Thermal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Options Modal */}
      <Dialog
        open={pdfModal.isOpen}
        onOpenChange={(open) => setPdfModal((p) => ({ ...p, isOpen: open }))}
      >
        <DialogContent className="max-w-md bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Generate PDF Report
            </DialogTitle>
            <DialogDescription>
              Customize sections for the PDF
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border">
              <div className="flex flex-col">
                <span className="text-sm font-semibold">Financial Summary</span>
                <span className="text-xs text-muted-foreground">
                  Required for report validity
                </span>
              </div>
              <Badge variant="secondary">REQUIRED</Badge>
            </div>

            <div className="space-y-2">
              {[
                { id: "yesterdayComparison", label: `${viewType === "daily" ? "Yesterday" : "Last Month"} Comparison` },
                { id: "orderStatusSummary", label: "Order Status Summary (Open & Voided)" },
                { id: "categoryMenuSummary", label: "Category Menu Summary" },
                { id: "expenses", label: "Expenses & Withdrawals" },
                { id: "paymentBreakdown", label: "Payment Breakdown" },
                { id: "cashierPerformance", label: "Cashier Performance" },
                { id: "waiterPerformance", label: "Waiter Performance" },
                {
                  id: "itemPerformance",
                  label: "Menu & Inventory Performance",
                },
              ].map((section) => (
                <label
                  key={section.id}
                  className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer border transition-colors"
                >
                  <span className="text-sm font-medium">{section.label}</span>
                  <input
                    type="checkbox"
                    checked={
                      pdfModal.sections[
                        section.id as keyof typeof pdfModal.sections
                      ]
                    }
                    onChange={(e) =>
                      setPdfModal((p) => ({
                        ...p,
                        sections: {
                          ...p.sections,
                          [section.id]: e.target.checked,
                        },
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                </label>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setPdfModal((p) => ({ ...p, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGeneratePDF}
              className="bg-primary text-white"
            >
              <FileText className="mr-2 h-4 w-4" />
              Generate PDF →
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
