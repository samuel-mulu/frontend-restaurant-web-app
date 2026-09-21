"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/ui/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCalendarSystem } from "@/hooks/useCalendarSystem";
import { useLanguage } from "@/hooks/useLanguage";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { addisNoon, formatCivilYmd } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { selectUser } from "@/stores/features/auth/authSlice";
import {
  BarmanApprovalHistoryRow,
  BarmanDailySummaryRow,
  InventoryAssignment,
  useApproveInventoryAssignmentMutation,
  useGetBarmanDailySummaryQuery,
  useListInventoryAssignmentsQuery,
  useRejectInventoryAssignmentMutation,
} from "@/stores/features/inventory/inventoryAssignmentsApi";
import { Staff, useListStaffQuery } from "@/stores/features/staff/staffApi";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Loader2,
  Package,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

function fill(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template
  );
}

function getInventoryName(
  assignment: InventoryAssignment,
  fallback: string
) {
  const inv = assignment.inventoryId;
  if (inv && typeof inv === "object") {
    const name = inv.name?.trim();
    if (name) return name;
  }
  return fallback;
}

function getInventoryUnit(assignment: InventoryAssignment) {
  const inv = assignment.inventoryId;
  if (inv && typeof inv === "object") {
    return inv.unit || "";
  }
  return "";
}

function getPersonName(
  value: InventoryAssignment["barmanId"] | InventoryAssignment["assignedBy"],
  fallback: string
) {
  if (value && typeof value === "object") {
    const name = value.name?.trim();
    if (name) return name;
  }
  return fallback;
}

function getAddisToday(): string {
  return formatCivilYmd(new Date());
}

/** Shift a civil YYYY-MM-DD by N days in Africa/Addis_Ababa. */
function shiftCivilDate(ymd: string, days: number): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const date = addisNoon(year, month, day);
  date.setUTCDate(date.getUTCDate() + days);
  return formatCivilYmd(date);
}

export default function BarmanAssignmentsPage() {
  const auth = useRequireAuth({
    allowedRoles: ["barman", "owner", "cashier"],
    redirectTo: "/login",
  });
  const { t } = useLanguage();
  const { formatDate } = useCalendarSystem();
  const user = useSelector(selectUser);
  const isBarman = user?.role === "barman";
  const canFilterBarman = user?.role === "owner" || user?.role === "cashier";

  const [selectedDate, setSelectedDate] = useState(() => getAddisToday());
  const [selectedBarmanId, setSelectedBarmanId] = useState<string>("all");
  const [historyOpen, setHistoryOpen] = useState(false);

  const {
    data: assignments = [],
    isLoading: isAssignmentsLoading,
    refetch: refetchAssignments,
  } = useListInventoryAssignmentsQuery(
    { status: "pending" },
    { skip: !auth.isAuthenticated }
  );

  const { data: barmenData } = useListStaffQuery(
    { role: "barman" },
    { skip: !auth.isAuthenticated || !canFilterBarman }
  );

  const {
    data: dailySummary,
    isLoading: isDailyLoading,
    refetch: refetchDaily,
  } = useGetBarmanDailySummaryQuery(
    {
      date: selectedDate,
      ...(canFilterBarman &&
        selectedBarmanId !== "all" && { barmanId: selectedBarmanId }),
    },
    { skip: !auth.isAuthenticated }
  );

  const [approveAssignment, { isLoading: isApproving }] =
    useApproveInventoryAssignmentMutation();
  const [rejectAssignment, { isLoading: isRejecting }] =
    useRejectInventoryAssignmentMutation();

  const [approveQtyById, setApproveQtyById] = useState<Record<string, string>>(
    {}
  );

  const pending = useMemo(
    () => assignments.filter((a: InventoryAssignment) => a.status === "pending"),
    [assignments]
  );

  const summaryRows = dailySummary?.items || [];
  const approvalHistory = dailySummary?.approvalHistory || [];

  const totalCurrent = useMemo(
    () =>
      summaryRows.reduce(
        (sum: number, row: BarmanDailySummaryRow) =>
          sum + (row.remaining || 0),
        0
      ),
    [summaryRows]
  );

  const handleApprove = async (assignment: InventoryAssignment) => {
    const raw =
      approveQtyById[assignment.id] ?? String(assignment.assignedQuantity);
    const approvedQuantity = parseFloat(raw);
    if (isNaN(approvedQuantity) || approvedQuantity <= 0) {
      toast.error(t("barman_toast_invalid_qty"));
      return;
    }
    if (approvedQuantity > assignment.assignedQuantity) {
      toast.error(
        fill(t("barman_toast_qty_exceeds"), {
          count: assignment.assignedQuantity,
        })
      );
      return;
    }

    try {
      await approveAssignment({
        id: assignment.id,
        approvedQuantity,
      }).unwrap();
      toast.success(t("barman_toast_approved"));
      refetchDaily();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string }; message?: string };
      toast.error(
        error?.data?.message ||
          error?.message ||
          t("barman_toast_approve_failed")
      );
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectAssignment(id).unwrap();
      toast.success(t("barman_toast_rejected"));
      refetchDaily();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string }; message?: string };
      toast.error(
        error?.data?.message ||
          error?.message ||
          t("barman_toast_reject_failed")
      );
    }
  };

  const handlePrevDate = () => {
    setSelectedDate((prev) => shiftCivilDate(prev, -1));
  };

  const handleNextDate = () => {
    setSelectedDate((prev) => {
      const next = shiftCivilDate(prev, 1);
      const today = getAddisToday();
      return next > today ? today : next;
    });
  };

  if (auth.isChecking || !auth.hydrated) {
    return <Loading fullScreen text="Loading..." size="lg" />;
  }

  if (!auth.isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("barman_title")}
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetchAssignments();
            refetchDaily();
          }}
        >
          {t("barman_refresh")}
        </Button>
      </div>

      {/* Approved history — tap to expand full table */}
      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => setHistoryOpen((open) => !open)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold">{t("barman_approvals_by_date")}</span>
            <Badge variant="secondary" className="tabular-nums">
              {approvalHistory.length}
            </Badge>
          </div>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
            {historyOpen ? t("barman_approvals_hide") : t("barman_approvals_show")}
            {historyOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </span>
        </button>

        {historyOpen && (
          <div className="border-t border-border">
            {isDailyLoading ? (
              <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("barman_loading")}
              </div>
            ) : approvalHistory.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                {t("barman_approvals_empty")}
              </p>
            ) : (
              <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/70 backdrop-blur-sm">
                    <tr className="border-b border-border">
                      <th className="px-4 py-2.5 text-left font-medium">
                        {t("barman_approvals_date")}
                      </th>
                      <th className="px-4 py-2.5 text-left font-medium">
                        {t("barman_approvals_from")}
                      </th>
                      {canFilterBarman && (
                        <th className="px-4 py-2.5 text-left font-medium">
                          {t("barman_label_barman")}
                        </th>
                      )}
                      <th className="px-4 py-2.5 text-left font-medium">
                        {t("barman_daily_item")}
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium">
                        {t("barman_approvals_qty")}
                      </th>
                      <th className="px-4 py-2.5 text-left font-medium">
                        {t("barman_daily_unit")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvalHistory.map((row: BarmanApprovalHistoryRow) => {
                      const active = row.date === selectedDate;
                      return (
                        <tr
                          key={row.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedDate(row.date)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedDate(row.date);
                            }
                          }}
                          className={cn(
                            "border-b border-border last:border-0 cursor-pointer transition-colors",
                            active ? "bg-primary/10" : "hover:bg-muted/40"
                          )}
                        >
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            {formatDate(row.date, { short: true })}
                          </td>
                          <td className="px-4 py-2.5 font-medium">
                            {row.assignedByName}
                          </td>
                          {canFilterBarman && (
                            <td className="px-4 py-2.5">{row.barmanName}</td>
                          )}
                          <td className="px-4 py-2.5 font-medium">
                            {row.inventoryName}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                            {row.approved}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">
                            {row.unit || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Summary + filters */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {t("barman_total_remaining")}
            </p>
            <p className="text-2xl font-semibold tabular-nums leading-none mt-1">
              {isDailyLoading ? "—" : totalCurrent}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-card p-1 rounded-lg border border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevDate}
              aria-label={t("reports_prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 px-3 min-w-[140px] justify-center font-semibold text-sm">
              <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
              <span className="whitespace-nowrap">
                {formatDate(selectedDate, { short: true })}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextDate}
              disabled={selectedDate >= getAddisToday()}
              aria-label={t("reports_next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {canFilterBarman && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                {t("barman_daily_filter_barman")}
              </label>
              <Select
                value={selectedBarmanId}
                onValueChange={setSelectedBarmanId}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder={t("barman_daily_all_barmen")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("barman_daily_all_barmen")}
                  </SelectItem>
                  {(barmenData?.staff || []).map((barman: Staff) => {
                    const barmanId = barman.id || barman._id;
                    return (
                      <SelectItem key={barmanId} value={barmanId}>
                        {barman.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Pending */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{t("barman_section_pending")}</h2>
          {pending.length > 0 && (
            <Badge variant="outline">{pending.length}</Badge>
          )}
        </div>

        {isAssignmentsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("barman_loading")}
          </div>
        ) : pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("barman_no_pending")}</p>
        ) : (
          pending.map((assignment: InventoryAssignment) => {
            const itemName = getInventoryName(
              assignment,
              t("barman_unknown_item")
            );
            const barmanName = getPersonName(
              assignment.barmanId,
              t("barman_unknown_person")
            );
            const cashierName = getPersonName(
              assignment.assignedBy,
              t("barman_unknown_person")
            );

            return (
              <div
                key={assignment.id}
                className="rounded-2xl border border-border bg-card p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">{itemName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("barman_label_barman")}:{" "}
                      <span className="font-medium text-foreground">
                        {isBarman ? user?.name || barmanName : barmanName}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {assignment.assignedQuantity}{" "}
                      {getInventoryUnit(assignment)} · {cashierName}
                    </p>
                  </div>
                  <Badge variant="outline">{t("barman_needs_approval")}</Badge>
                </div>

                {isBarman && (
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground">
                        {t("barman_confirm_qty")}
                      </label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        className="mt-1"
                        value={
                          approveQtyById[assignment.id] ??
                          String(assignment.assignedQuantity)
                        }
                        onChange={(e) =>
                          setApproveQtyById((prev) => ({
                            ...prev,
                            [assignment.id]: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <Button
                      onClick={() => handleApprove(assignment)}
                      disabled={isApproving}
                    >
                      {t("barman_approve")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleReject(assignment.id)}
                      disabled={isRejecting}
                    >
                      {t("barman_reject")}
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      {/* Stock: Sold + Current */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-lg font-semibold">{t("barman_section_stock")}</h2>
          <span className="text-sm text-muted-foreground tabular-nums">
            {formatDate(selectedDate, { short: true })}
          </span>
        </div>

        {isDailyLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("barman_daily_loading")}
          </div>
        ) : summaryRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {t("barman_daily_empty")}
            </p>
          </div>
        ) : (
          <>
            <div className="sm:hidden space-y-3">
              {summaryRows.map((row: BarmanDailySummaryRow) => {
                const low = (row.remaining || 0) <= 0;
                return (
                  <div
                    key={`${row.barmanId}-${row.inventoryId}`}
                    className={cn(
                      "rounded-2xl border bg-card p-4 space-y-3",
                      low
                        ? "border-red-200 dark:border-red-900/50"
                        : "border-border"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {row.inventoryName}
                        </h3>
                        {canFilterBarman && (
                          <p className="text-sm text-muted-foreground">
                            {row.barmanName}
                          </p>
                        )}
                      </div>
                      <Badge
                        className={cn(
                          low
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        )}
                      >
                        {low
                          ? t("barman_status_empty")
                          : t("barman_status_in_stock")}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-muted/40 px-3 py-3">
                        <p className="text-[11px] text-muted-foreground">
                          {t("barman_daily_sold")}
                        </p>
                        <p className="mt-1 text-xl font-semibold tabular-nums">
                          {row.sold}
                        </p>
                      </div>
                      <div className="rounded-xl bg-primary/10 px-3 py-3">
                        <p className="text-[11px] text-muted-foreground">
                          {t("barman_daily_remaining")}
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-xl font-semibold tabular-nums",
                            low && "text-red-600 dark:text-red-400"
                          )}
                        >
                          {row.remaining}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden sm:block rounded-2xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {canFilterBarman && (
                        <th className="px-4 py-3 text-left font-medium">
                          {t("barman_label_barman")}
                        </th>
                      )}
                      <th className="px-4 py-3 text-left font-medium">
                        {t("barman_daily_item")}
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        {t("barman_daily_sold")}
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        {t("barman_daily_remaining")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        {t("barman_daily_unit")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.map((row: BarmanDailySummaryRow) => {
                      const low = (row.remaining || 0) <= 0;
                      return (
                        <tr
                          key={`${row.barmanId}-${row.inventoryId}`}
                          className="border-b border-border last:border-0"
                        >
                          {canFilterBarman && (
                            <td className="px-4 py-3">{row.barmanName}</td>
                          )}
                          <td className="px-4 py-3 font-medium">
                            {row.inventoryName}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {row.sold}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-3 text-right tabular-nums font-semibold",
                              low && "text-red-600 dark:text-red-400"
                            )}
                          >
                            {row.remaining}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {row.unit || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
