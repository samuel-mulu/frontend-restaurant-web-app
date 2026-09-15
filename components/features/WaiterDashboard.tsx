"use client";

import { ErrorState } from "@/components/shared/ErrorState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/hooks/useLanguage";
import { formatDateLocal } from "@/lib/date-utils";
import { selectUser } from "@/stores/features/auth/authSlice";
import { useGetWaiterSummaryQuery } from "@/stores/features/waiter/waiterApi";
import { Banknote, CheckCircle2, ClipboardCheck, ShoppingBag, Wallet } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";
import { useSelector } from "react-redux";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
  }).format(amount);

export function WaiterDashboard() {
  const user = useSelector(selectUser);
  const { t } = useLanguage();
  const today = formatDateLocal(new Date());
  const { data, isLoading, isFetching, error, refetch } =
    useGetWaiterSummaryQuery({
      startDate: today,
      endDate: today,
    });

  const openCount = data?.byStatus?.OPEN?.count ?? 0;
  const confirmedCount = data?.byStatus?.OWNER_CONFIRMED?.count ?? 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          {t("waiter_dashboard_greeting")}
        </p>
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
          {user?.name || t("waiter_dashboard_title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("waiter_dashboard_subtitle")}
        </p>
      </header>

      {error ? (
        <ErrorState message={t("waiter_load_error")} onRetry={() => refetch()} />
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={t("waiter_kpi_orders")}
          value={isLoading || isFetching ? null : String(data?.totalOrders ?? 0)}
          icon={<ShoppingBag className="h-5 w-5 text-blue-600" />}
          accent="border-l-blue-500"
        />
        <KpiCard
          label={t("waiter_kpi_sales")}
          value={
            isLoading || isFetching
              ? null
              : formatCurrency(data?.totalAmount ?? 0)
          }
          icon={<Banknote className="h-5 w-5 text-emerald-600" />}
          accent="border-l-emerald-500"
        />
        <KpiCard
          label={t("waiter_kpi_open")}
          value={isLoading || isFetching ? null : String(openCount)}
          icon={<ClipboardCheck className="h-5 w-5 text-amber-600" />}
          accent="border-l-amber-500"
        />
        <KpiCard
          label={t("waiter_kpi_confirmed")}
          value={isLoading || isFetching ? null : String(confirmedCount)}
          icon={<CheckCircle2 className="h-5 w-5 text-teal-600" />}
          accent="border-l-teal-500"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/my-report">{t("waiter_view_report")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/my-salary">
            <Wallet className="h-4 w-4 mr-2" />
            {t("waiter_view_salary")}
          </Link>
        </Button>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | null;
  icon: ReactNode;
  accent: string;
}) {
  return (
    <Card className={`overflow-hidden border-l-4 ${accent}`}>
      <CardContent className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              {label}
            </p>
            {value === null ? (
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
