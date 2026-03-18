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

export default function ReportsPage() {
  const SOLD_ITEMS_PAGE_SIZE = 20;
  const EXPENSES_PAGE_SIZE = 10;
  const [viewType, setViewType] = useState<"daily" | "monthly">("daily");
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("PAID_TO_CASHIER");
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
      expenses: boolean;
      paymentBreakdown: boolean;
      cashierPerformance: boolean;
      waiterPerformance: boolean;
      itemPerformance: boolean;
    };
  }>({
    isOpen: false,
    sections: {
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
      const csvData: any[] = [];

      // Financial Summary
      csvData.push({
        Category: "SUMMARY",
        Label: "Total Sales",
        Value: totalSales,
      });
      csvData.push({
        Category: "SUMMARY",
        Label: "Total Expenses",
        Value: totalExpenses,
      });
      csvData.push({
        Category: "SUMMARY",
        Label: "Net Revenue",
        Value: netRevenue,
      });
      csvData.push({}); // Empty row

      // Payment Breakdown
      csvData.push({
        Category: "PAYMENT BREAKDOWN",
        Label: "Method",
        Bank: "Bank",
        Count: "Orders",
        Total: "Amount",
      });
      reportData.salesByPaymentMethod.forEach((item: any) => {
        csvData.push({
          Category: "Payment",
          Label: item._id.method.replace("_", " "),
          Bank: item._id.bank || "N/A",
          Count: item.count,
          Total: item.total,
        });
      });
      csvData.push({});

      // Expenses
      csvData.push({
        Category: "EXPENSES",
        Label: "Reason",
        Description: "Details",
        Total: "Amount",
      });
      expensesList.forEach((ex: any) => {
        csvData.push({
          Category: "Expense",
          Label: (ex.reason || "").replace("_", " "),
          Description: ex.description || "-",
          Total: -ex.amount,
        });
      });
      csvData.push({});

      // Waiter Performance
      csvData.push({
        Category: "WAITER PERFORMANCE",
        Label: "Name",
        Count: "Orders",
        Total: "Revenue",
      });
      sortedWaiters.forEach((item: any) => {
        csvData.push({
          Category: "Waiter",
          Label: item.name,
          Count: item.count,
          Total: item.total,
        });
      });
      csvData.push({});

      // Cashier Performance
      csvData.push({
        Category: "CASHIER PERFORMANCE",
        Label: "Name",
        Count: "Orders",
        Total: "Settled",
      });
      sortedCashiers.forEach((item: any) => {
        csvData.push({
          Category: "Cashier",
          Label: item.name,
          Count: item.count,
          Total: item.total,
        });
      });
      csvData.push({});

      // Menu/Inventory Performance
      csvData.push({
        Category: "ITEM PERFORMANCE",
        Label: "Item Name",
        Type: "Type",
        Count: "Quantity",
      });
      soldItemsData.items.forEach((item) => {
        csvData.push({
          Category: "Item",
          Label: item.itemName,
          Type: item.itemType,
          Count: item.qtySold,
        });
      });

      const csvString = convertToCSV(csvData);
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

  const generatePrintHTML = () => {
    const currentDate = new Date().toLocaleString();
    const reportDate = formatDateForReport(
      selectedDate,
      viewType === "daily" ? "PPP" : "MMMM yyyy",
    );

    // Generate expenses HTML
    const expensesHTML =
      pdfModal.sections.expenses && expensesList.length > 0
        ? expensesList
            .map(
              (ex: any) => `
            <tr>
              <td>
                <div class="font-bold">${(ex.reason || "").replace("_", " ")}</div>
                <div class="text-sm">• ${ex.description || "N/A"}</div>
              </td>
              <td class="text-right font-bold">ETB ${ex.amount.toFixed(2)}</td>
            </tr>
          `,
            )
            .join("")
        : "";

    // Generate payment breakdown HTML
    const paymentHTML =
      pdfModal.sections.paymentBreakdown && filteredSales.length > 0
        ? filteredSales
            .map(
              (item: any, i: number) => `
          <tr>
            <td class="capitalize">${item._id.method === "unpaid" ? "Unpaid / Pending" : item._id.method.replace("_", " ")}</td>
            <td>${item._id.bank || "-"}</td>
            <td class="text-right">${item.count}</td>
            <td class="text-right font-bold">ETB ${item.total.toFixed(2)}</td>
          </tr>
        `,
            )
            .join("")
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
            <td class="text-right font-bold">ETB ${item.total.toFixed(2)}</td>
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
            <td class="text-right font-bold">ETB ${item.total.toFixed(2)}</td>
          </tr>
        `,
            )
            .join("")
        : "";

    // Generate inventory HTML
    const inventoryHTML =
      pdfModal.sections.itemPerformance && allSoldItems.length > 0
        ? allSoldItems
            .map(
              (item: any) => `
          <tr>
            <td>${item.itemName}</td>
            <td class="capitalize">${item.itemType}</td>
            <td class="text-right font-bold">${item.qtySold}</td>
            <td class="text-right font-bold">ETB ${item.salesAmount.toFixed(2)}</td>
          </tr>
        `,
            )
            .join("")
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
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Kandino's Kitchen</h1>
          <h2>${viewType === "daily" ? "DAILY PERFORMANCE REPORT" : "MONTHLY PERFORMANCE REPORT"}</h2>
          <div class="meta">
            <p>${reportDate}</p>
            <div>Status: ${statusFilter.replace("_", " ")} • Payment: ${paymentFilter.replace("_", " ")}</div>
          </div>
        </div>

        <div class="section">
          <h3>Financial Summary</h3>
          <div class="financial-grid">
            <div class="financial-item">
              <div class="financial-label">Total Sales</div>
              <div class="financial-value">${formatCurrency(totalSales)}</div>
            </div>
            <div class="financial-item">
              <div class="financial-label">Expenses</div>
              <div class="financial-value">${formatCurrency(totalExpenses)}</div>
            </div>
            <div class="financial-item">
              <div class="financial-label">Net Revenue</div>
              <div class="financial-value">${formatCurrency(netRevenue)}</div>
            </div>
          </div>
        </div>

        ${
          expensesHTML
            ? `
        <div class="section">
          <h3>Expenses & Withdrawals</h3>
          <table>
            <thead>
              <tr>
                <th>Reason/Details</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${expensesHTML}
            </tbody>
          </table>
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
          inventoryHTML
            ? `
        <div class="section">
          <h3>Menu & Inventory Performance</h3>
          <div class="mb-4 text-sm text-gray-600">
            Showing all ${allSoldItems.length} items
          </div>
          <table class="compact-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Type</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${inventoryHTML}
            </tbody>
          </table>
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
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedExpenses.map((ex: any) => (
                        <TableRow key={ex._id}>
                          <TableCell className="capitalize">
                            <span className="font-semibold">
                              {(ex.reason || "").replace("_", " ")}
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
                        </TableRow>
                      ))}
                      {flattenedExpenses.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={2}
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
                      {soldItemsData.items.map((item) => (
                        <TableRow key={`${item.itemType}-${item.itemId}`}>
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
