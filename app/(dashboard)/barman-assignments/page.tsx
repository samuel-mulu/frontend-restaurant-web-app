"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/ui/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/useLanguage";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { cn } from "@/lib/utils";
import { selectUser } from "@/stores/features/auth/authSlice";
import {
  InventoryAssignment,
  useApproveInventoryAssignmentMutation,
  useListInventoryAssignmentsQuery,
  useRejectInventoryAssignmentMutation,
} from "@/stores/features/inventory/inventoryAssignmentsApi";
import { Loader2, Package } from "lucide-react";
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

export default function BarmanAssignmentsPage() {
  const auth = useRequireAuth({
    allowedRoles: ["barman", "owner", "cashier"],
    redirectTo: "/login",
  });
  const { t } = useLanguage();
  const user = useSelector(selectUser);
  const isBarman = user?.role === "barman";

  const {
    data: assignments = [],
    isLoading,
    refetch,
  } = useListInventoryAssignmentsQuery(undefined, {
    skip: !auth.isAuthenticated,
  });

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
  const approved = useMemo(
    () =>
      assignments.filter((a: InventoryAssignment) => a.status === "approved"),
    [assignments]
  );

  const totalRemaining = useMemo(
    () =>
      approved.reduce(
        (sum: number, a: InventoryAssignment) =>
          sum + (a.remainingQuantity || 0),
        0
      ),
    [approved]
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
    } catch (err: unknown) {
      const error = err as { data?: { message?: string }; message?: string };
      toast.error(
        error?.data?.message ||
          error?.message ||
          t("barman_toast_reject_failed")
      );
    }
  };

  if (auth.isChecking || !auth.hydrated) {
    return <Loading fullScreen text="Loading..." size="lg" />;
  }

  if (!auth.isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("barman_title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isBarman ? t("barman_subtitle_self") : t("barman_subtitle_other")}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          {t("barman_refresh")}
        </Button>
      </div>

      {!isLoading && approved.length > 0 && (
        <div className="rounded-2xl border border-border bg-card px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t("barman_total_remaining")}
              </p>
              <p className="text-2xl font-semibold tabular-nums leading-none mt-1">
                {totalRemaining}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {fill(
              approved.length === 1
                ? t("barman_across_item")
                : t("barman_across_items"),
              { count: approved.length }
            )}
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("barman_loading")}
        </div>
      ) : (
        <Tabs defaultValue="approved">
          <TabsList>
            <TabsTrigger value="approved">
              {t("barman_tab_remaining")} ({approved.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              {t("barman_tab_pending")} ({pending.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="approved" className="space-y-3 mt-4">
            {approved.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("barman_no_approved")}
                </p>
                {isBarman && pending.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {fill(
                      pending.length === 1
                        ? t("barman_pending_review_one")
                        : t("barman_pending_review"),
                      { count: pending.length }
                    )}
                  </p>
                )}
              </div>
            ) : (
              approved.map((assignment: InventoryAssignment) => {
                const unit = getInventoryUnit(assignment);
                const remaining = assignment.remainingQuantity || 0;
                const approvedQty = assignment.approvedQuantity ?? 0;
                const used = Math.max(0, approvedQty - remaining);
                const low = remaining <= 0;
                const itemName = getInventoryName(
                  assignment,
                  t("barman_unknown_item")
                );
                const barmanName = getPersonName(
                  assignment.barmanId,
                  t("barman_unknown_person")
                );

                return (
                  <div
                    key={assignment.id}
                    className={cn(
                      "rounded-2xl border bg-card p-4 sm:p-5",
                      low
                        ? "border-red-200 dark:border-red-900/50"
                        : "border-border"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {t("barman_label_inventory")}
                        </p>
                        <h3 className="text-xl font-semibold truncate">
                          {itemName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {t("barman_label_barman")}:{" "}
                          <span className="font-medium text-foreground">
                            {isBarman
                              ? user?.name || barmanName
                              : barmanName}
                          </span>
                        </p>
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

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl bg-primary/10 px-4 py-4">
                        <p className="text-xs text-muted-foreground">
                          {t("barman_label_left")}
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-3xl font-semibold tabular-nums",
                            low && "text-red-600 dark:text-red-400"
                          )}
                        >
                          {remaining}
                          {unit ? (
                            <span className="ml-2 text-base font-normal text-muted-foreground">
                              {unit}
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <div className="rounded-xl bg-muted/40 px-4 py-4">
                        <p className="text-xs text-muted-foreground">
                          {t("barman_label_used")}
                        </p>
                        <p className="mt-1 text-2xl font-semibold tabular-nums">
                          {used}
                          {unit ? (
                            <span className="ml-2 text-base font-normal text-muted-foreground">
                              {unit}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-3 mt-4">
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("barman_no_pending")}
              </p>
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
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {t("barman_label_inventory")}
                        </p>
                        <h3 className="font-semibold text-xl">{itemName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t("barman_label_barman")}:{" "}
                          <span className="font-medium text-foreground">
                            {isBarman
                              ? user?.name || barmanName
                              : barmanName}
                          </span>
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t("barman_cashier_sent")}{" "}
                          <span className="font-medium text-foreground">
                            {assignment.assignedQuantity}{" "}
                            {getInventoryUnit(assignment)}
                          </span>{" "}
                          {t("barman_from")} {cashierName}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {t("barman_needs_approval")}
                      </Badge>
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
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
