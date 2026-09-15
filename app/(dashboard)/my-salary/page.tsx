"use client";

import { CountdownProgress } from "@/components/features/CountdownProgress";
import { PaymentHistory } from "@/components/features/PaymentHistory";
import { WithdrawalHistory } from "@/components/features/WithdrawalHistory";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { RoleGuard } from "@/components/shared/RoleGuard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatDateWithSystem,
  useCalendarSystem,
} from "@/hooks/useCalendarSystem";
import { useLanguage } from "@/hooks/useLanguage";
import {
  useGetWaiterCountdownQuery,
  useGetWaiterPaymentsQuery,
  useGetWaiterSalaryQuery,
  useGetWaiterWithdrawalsQuery,
} from "@/stores/features/waiter/waiterApi";
import { addMonths, subMonths } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import { useState } from "react";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
  }).format(amount);

function WaiterSalaryContent() {
  const { t } = useLanguage();
  const { calSystem } = useCalendarSystem();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const month = selectedDate.getMonth() + 1;
  const year = selectedDate.getFullYear();

  const {
    data,
    isFetching,
    error,
    refetch,
  } = useGetWaiterSalaryQuery({ month, year });

  const salary = data?.salary ?? null;
  const salaryId = salary?._id || salary?.id || "";

  const { data: countdown } = useGetWaiterCountdownQuery(salaryId, {
    skip: !salaryId,
  });
  const { data: withdrawals = [] } = useGetWaiterWithdrawalsQuery(salaryId, {
    skip: !salaryId,
  });
  const { data: payments = [] } = useGetWaiterPaymentsQuery(salaryId, {
    skip: !salaryId,
  });

  const gross = salary?.amount ?? 0;
  const totalWithdrawals = salary?.totalWithdrawals ?? 0;
  const net = salary?.netAmount ?? gross - totalWithdrawals;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <header>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
            {t("waiter_salary_title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("waiter_salary_subtitle")}
          </p>
        </header>

        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-1 rounded-lg border shadow-sm w-fit">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedDate((prev) => subMonths(prev, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-4 font-semibold text-sm min-w-[160px] justify-center">
            <CalendarIcon className="h-4 w-4 text-primary" />
            {formatDateWithSystem(calSystem, selectedDate, { monthYear: true })}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedDate((prev) => addMonths(prev, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error ? (
        <ErrorState message={t("waiter_load_error")} onRetry={() => refetch()} />
      ) : null}

      {isFetching && !salary ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : !salary ? (
        <EmptyState
          icon={<Wallet className="h-10 w-10 text-muted-foreground" />}
          message={t("waiter_salary_empty")}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">
                  {t("waiter_salary_gross")}
                </p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(gross)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">
                  {t("waiter_salary_withdrawals")}
                </p>
                <p className="text-2xl font-bold mt-1 text-rose-600">
                  {formatCurrency(totalWithdrawals)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">
                  {t("waiter_salary_net")}
                </p>
                <p className="text-2xl font-bold mt-1 text-emerald-600">
                  {formatCurrency(net)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">
                  {t("waiter_salary_status")}
                </p>
                <Badge
                  className="mt-2 capitalize"
                  variant={salary.status === "paid" ? "default" : "outline"}
                >
                  {salary.status}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {countdown ? (
            <Card>
              <CardContent className="p-5">
                <CountdownProgress
                  daysUntil={countdown.daysUntil}
                  totalDays={countdown.totalDays || 30}
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardContent className="p-5">
              <WithdrawalHistory withdrawals={withdrawals} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <PaymentHistory payments={payments} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function WaiterSalaryPage() {
  return (
    <RoleGuard allowedRoles={["waiter"]}>
      <WaiterSalaryContent />
    </RoleGuard>
  );
}
