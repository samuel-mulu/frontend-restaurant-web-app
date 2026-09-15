"use client";

import { OrderDetailsModal } from "@/components/features/OrderDetailsModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { RoleGuard } from "@/components/shared/RoleGuard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  formatDateWithSystem,
  useCalendarSystem,
} from "@/hooks/useCalendarSystem";
import { useLanguage } from "@/hooks/useLanguage";
import { TranslationKey } from "@/lib/i18n";
import { formatDateLocal } from "@/lib/date-utils";
import { Order, OrderStatus } from "@/stores/features/orders/ordersApi";
import {
  useGetWaiterOrdersQuery,
  useGetWaiterSummaryQuery,
} from "@/stores/features/waiter/waiterApi";
import {
  addDays,
  addMonths,
  endOfMonth,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import {
  Banknote,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Search,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
  }).format(amount);

const STATUS_OPTIONS: Array<OrderStatus | "ALL"> = [
  "ALL",
  "OPEN",
  "PAID_TO_CASHIER",
  "TRANSFERRED_TO_OWNER",
  "OWNER_CONFIRMED",
  "VOIDED",
  "DISPUTED",
];

function personName(
  value?: string | { name?: string } | null,
): string {
  if (!value || typeof value === "string") return "—";
  return value.name || "—";
}

function statusLabel(
  status: OrderStatus | "ALL",
  t: (key: TranslationKey) => string,
) {
  const map: Record<string, string> = {
    ALL: t("reports_all_statuses"),
    OPEN: t("status_open"),
    PAID_TO_CASHIER: t("status_paid_to_waiter"),
    TRANSFERRED_TO_OWNER: t("status_paid_to_cashier"),
    OWNER_CONFIRMED: t("status_confirmed"),
    VOIDED: t("status_voided"),
    DISPUTED: t("status_disputed"),
  };
  return map[status] || status;
}

function WaiterReportContent() {
  const { t } = useLanguage();
  const { calSystem, formatDate } = useCalendarSystem();
  const [viewType, setViewType] = useState<"daily" | "monthly" | "range">(
    "daily",
  );
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [rangeStart, setRangeStart] = useState(formatDateLocal(new Date()));
  const [rangeEnd, setRangeEnd] = useState(formatDateLocal(new Date()));
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  const period = useMemo(() => {
    if (viewType === "daily") {
      const day = formatDateLocal(selectedDate);
      return { startDate: day, endDate: day };
    }
    if (viewType === "monthly") {
      return {
        startDate: formatDateLocal(startOfMonth(selectedDate)),
        endDate: formatDateLocal(endOfMonth(selectedDate)),
      };
    }
    return { startDate: rangeStart, endDate: rangeEnd };
  }, [viewType, selectedDate, rangeStart, rangeEnd]);

  useEffect(() => {
    setPage(1);
  }, [viewType, selectedDate, rangeStart, rangeEnd, statusFilter, debouncedSearch]);

  const queryArgs = {
    startDate: period.startDate,
    endDate: period.endDate,
    status: statusFilter,
    search: debouncedSearch || undefined,
  };

  const {
    data: summary,
    isFetching: isSummaryFetching,
    error: summaryError,
    refetch: refetchSummary,
  } = useGetWaiterSummaryQuery(queryArgs);

  const {
    data: ordersData,
    isFetching: isOrdersFetching,
    error: ordersError,
    refetch: refetchOrders,
  } = useGetWaiterOrdersQuery({
    ...queryArgs,
    page,
    limit: 20,
  });

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

  const orders: Order[] = ordersData?.orders ?? [];
  const pagination = ordersData?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <header>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
            {t("waiter_report_title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("waiter_report_subtitle")}
            {summary?.waiterName ? ` · ${summary.waiterName}` : ""}
          </p>
        </header>

        {viewType !== "range" ? (
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-1 rounded-lg border shadow-sm w-fit">
            <Button variant="ghost" size="icon" onClick={handlePrevDate}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 px-4 font-semibold text-sm min-w-[160px] justify-center">
              <CalendarIcon className="h-4 w-4 text-primary" />
              {formatDateWithSystem(
                calSystem,
                selectedDate,
                viewType === "daily" ? undefined : { monthYear: true },
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={handleNextDate}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>

      <Tabs
        value={viewType}
        onValueChange={(value) =>
          setViewType(value as "daily" | "monthly" | "range")
        }
      >
        <TabsList className="grid w-full max-w-[420px] grid-cols-3">
          <TabsTrigger value="daily">{t("reports_daily")}</TabsTrigger>
          <TabsTrigger value="monthly">{t("reports_monthly")}</TabsTrigger>
          <TabsTrigger value="range">{t("reports_range")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium">{t("reports_filters")}</span>
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as OrderStatus | "ALL")
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusLabel(status, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative min-w-[220px] flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t("waiter_search_placeholder")}
              className="pl-9"
            />
          </div>
          {viewType === "range" ? (
            <>
              <div className="space-y-1">
                <Label className="text-xs">{t("waiter_start_date")}</Label>
                <Input
                  type="date"
                  value={rangeStart}
                  onChange={(event) => setRangeStart(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("waiter_end_date")}</Label>
                <Input
                  type="date"
                  value={rangeEnd}
                  onChange={(event) => setRangeEnd(event.target.value)}
                />
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {summaryError || ordersError ? (
        <ErrorState
          message={t("waiter_load_error")}
          onRetry={() => {
            refetchSummary();
            refetchOrders();
          }}
        />
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Kpi
          label={t("waiter_kpi_orders")}
          value={String(summary?.totalOrders ?? 0)}
          loading={isSummaryFetching}
          icon={<ShoppingBag className="h-5 w-5 text-blue-600" />}
        />
        <Kpi
          label={t("waiter_kpi_sales")}
          value={formatCurrency(summary?.totalAmount ?? 0)}
          loading={isSummaryFetching}
          icon={<Banknote className="h-5 w-5 text-emerald-600" />}
        />
        <Kpi
          label={t("waiter_avg_order")}
          value={formatCurrency(summary?.averageOrderValue ?? 0)}
          loading={isSummaryFetching}
          icon={<TrendingUp className="h-5 w-5 text-violet-600" />}
        />
        <Kpi
          label={t("waiter_kpi_open")}
          value={String(summary?.byStatus?.OPEN?.count ?? 0)}
          loading={isSummaryFetching}
          icon={<Filter className="h-5 w-5 text-amber-600" />}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isOrdersFetching && orders.length === 0 ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : orders.length === 0 ? (
            <EmptyState message={t("waiter_no_orders")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("waiter_col_order")}</TableHead>
                  <TableHead>{t("waiter_col_table")}</TableHead>
                  <TableHead>{t("waiter_col_cashier")}</TableHead>
                  <TableHead>{t("waiter_col_time")}</TableHead>
                  <TableHead>{t("history_col_status")}</TableHead>
                  <TableHead className="text-right">{t("history_col_total")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const id = order._id || order.id;
                  return (
                    <TableRow key={id}>
                      <TableCell className="font-medium">
                        #{order.orderNumber}
                      </TableCell>
                      <TableCell>{order.tableNumber || "—"}</TableCell>
                      <TableCell>{personName(order.cashierId)}</TableCell>
                      <TableCell>
                        {formatDate(order.placedAt || order.createdAt, {
                          dateTime: true,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {statusLabel(order.status, t)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(order.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedOrderId(id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t("history_col_items")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("reports_page_of")} {pagination.page} {t("reports_of")}{" "}
            {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasPreviousPage}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              {t("reports_prev")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasNextPage}
              onClick={() => setPage((prev) => prev + 1)}
            >
              {t("reports_next")}
            </Button>
          </div>
        </div>
      ) : null}

      <OrderDetailsModal
        orderId={selectedOrderId}
        open={Boolean(selectedOrderId)}
        onOpenChange={(open) => {
          if (!open) setSelectedOrderId(null);
        }}
        readOnly
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  loading,
  icon,
}: {
  label: string;
  value: string;
  loading: boolean;
  icon: ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              {label}
            </p>
            {loading ? (
              <Skeleton className="h-8 w-24 mt-2" />
            ) : (
              <h3 className="text-2xl font-bold mt-1">{value}</h3>
            )}
          </div>
          <div className="p-2 bg-muted rounded-lg">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function WaiterReportPage() {
  return (
    <RoleGuard allowedRoles={["waiter"]}>
      <WaiterReportContent />
    </RoleGuard>
  );
}
