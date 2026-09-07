"use client";

import { useState } from "react";
import { KeyRound, Loader2, Settings2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useLanguage } from "@/hooks/useLanguage";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { cn } from "@/lib/utils";
import {
  CashierHistoryDefaultTab,
  CashierSettingsUpdate,
  useGetSettingsQuery,
  useUpdateCashierPermissionsMutation,
  useUpdateSecurityPinsMutation,
} from "@/stores/features/settings/settingsApi";

function PermissionToggle({
  label,
  checked,
  disabled,
  onLabel,
  offLabel,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onLabel: string;
  offLabel: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
      <span className="text-sm font-medium">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-8 w-[72px] shrink-0 items-center rounded-full border transition-colors",
          checked
            ? "border-emerald-600 bg-emerald-600"
            : "border-muted-foreground/30 bg-muted",
          disabled && "opacity-60 cursor-not-allowed"
        )}
      >
        <span
          className={cn(
            "absolute text-[10px] font-semibold uppercase tracking-wide text-white transition-all",
            checked ? "left-2" : "right-2 text-muted-foreground"
          )}
        >
          {checked ? onLabel : offLabel}
        </span>
        <span
          className={cn(
            "absolute h-6 w-6 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[42px]" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

export default function ConfigPage() {
  const { t } = useLanguage();
  useRequireAuth({ allowedRoles: ["owner"] });

  const { data, isLoading, error, refetch } = useGetSettingsQuery();
  const [updatePins, { isLoading: isSavingPins }] =
    useUpdateSecurityPinsMutation();
  const [updatePerms, { isLoading: isSavingPerms }] =
    useUpdateCashierPermissionsMutation();

  const [voidPin, setVoidPin] = useState("");
  const [expensePin, setExpensePin] = useState("");

  const handleSavePins = async () => {
    const payload: { voidPin?: string; expensePin?: string } = {};

    if (voidPin) {
      if (!/^\d{4}$/.test(voidPin)) {
        toast.error(t("pin_config_invalid"));
        return;
      }
      payload.voidPin = voidPin;
    }

    if (expensePin) {
      if (!/^\d{4}$/.test(expensePin)) {
        toast.error(t("pin_config_invalid"));
        return;
      }
      payload.expensePin = expensePin;
    }

    if (!payload.voidPin && !payload.expensePin) {
      toast.error(t("pin_config_hint"));
      return;
    }

    try {
      await updatePins(payload).unwrap();
      toast.success(t("pin_config_both_saved"));
      setVoidPin("");
      setExpensePin("");
    } catch (err: unknown) {
      const error = err as { data?: { message?: string }; message?: string };
      toast.error(
        error?.data?.message || error?.message || "Failed to update PINs"
      );
    }
  };

  const handleToggle = async (key: keyof CashierSettingsUpdate, next: boolean) => {
    const createPathKeys = new Set([
      "cashierShowOpen",
      "cashierShowPaidToWaiter",
      "cashierShowPaidToCashier",
    ]);

    if (!next && createPathKeys.has(key) && data) {
      const nextOpen =
        key === "cashierShowOpen" ? false : data.cashierShowOpen !== false;
      const nextWaiter =
        key === "cashierShowPaidToWaiter"
          ? false
          : data.cashierShowPaidToWaiter !== false;
      const nextCashier =
        key === "cashierShowPaidToCashier"
          ? false
          : data.cashierShowPaidToCashier !== false;

      if (!nextOpen && !nextWaiter && !nextCashier) {
        toast.error(t("pin_config_status_need_one"));
        return;
      }
    }

    try {
      await updatePerms({ [key]: next }).unwrap();
      toast.success(
        createPathKeys.has(key) ||
          key === "cashierShowWithoutPrint" ||
          key === "cashierShowVoided" ||
          key === "cashierShowDisputed" ||
          key === "cashierShowConfirmed"
          ? t("pin_config_status_saved")
          : t("pin_config_perms_saved")
      );
    } catch (err: unknown) {
      const error = err as { data?: { message?: string }; message?: string };
      toast.error(
        error?.data?.message ||
          error?.message ||
          "Failed to update settings"
      );
    }
  };

  const handleHistoryTabChange = async (tab: CashierHistoryDefaultTab) => {
    if ((data?.cashierHistoryDefaultTab || "waiter") === tab) return;
    try {
      await updatePerms({ cashierHistoryDefaultTab: tab }).unwrap();
      toast.success(t("pin_config_history_tab_saved"));
    } catch (err: unknown) {
      const error = err as { data?: { message?: string }; message?: string };
      toast.error(
        error?.data?.message ||
          error?.message ||
          "Failed to update history default tab"
      );
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <ErrorState
        message="Failed to load config settings"
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-border bg-card p-2">
          <Settings2 className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("pin_config_title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("pin_config_desc")}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="h-4 w-4" />
            {t("pin_config_pins_section")}
          </CardTitle>
          <CardDescription>{t("pin_config_hint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="void-pin">{t("pin_config_void_label")}</Label>
              {data?.voidPinConfigured && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t("pin_config_configured")}
                </span>
              )}
            </div>
            <Input
              id="void-pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder={t("pin_config_placeholder")}
              value={voidPin}
              onChange={(e) =>
                setVoidPin(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              className="max-w-[200px]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="expense-pin">
                {t("pin_config_expense_label")}
              </Label>
              {data?.expensePinConfigured && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t("pin_config_configured")}
                </span>
              )}
            </div>
            <Input
              id="expense-pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder={t("pin_config_placeholder")}
              value={expensePin}
              onChange={(e) =>
                setExpensePin(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              className="max-w-[200px]"
            />
          </div>

          <Button onClick={handleSavePins} disabled={isSavingPins}>
            {isSavingPins ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("pin_config_saving")}
              </>
            ) : (
              t("pin_config_save")
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t("pin_config_cashier_section")}
          </CardTitle>
          <CardDescription>{t("pin_config_cashier_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <PermissionToggle
            label={t("pin_config_cashier_menus")}
            checked={data?.cashierCanEditMenus !== false}
            disabled={isSavingPerms}
            onLabel={t("pin_config_on")}
            offLabel={t("pin_config_off")}
            onChange={(next) => handleToggle("cashierCanEditMenus", next)}
          />
          <PermissionToggle
            label={t("pin_config_cashier_categories")}
            checked={data?.cashierCanEditCategories !== false}
            disabled={isSavingPerms}
            onLabel={t("pin_config_on")}
            offLabel={t("pin_config_off")}
            onChange={(next) => handleToggle("cashierCanEditCategories", next)}
          />
          <PermissionToggle
            label={t("pin_config_cashier_inventory")}
            checked={data?.cashierCanEditInventory !== false}
            disabled={isSavingPerms}
            onLabel={t("pin_config_on")}
            offLabel={t("pin_config_off")}
            onChange={(next) => handleToggle("cashierCanEditInventory", next)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t("pin_config_status_section")}
          </CardTitle>
          <CardDescription>{t("pin_config_status_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <PermissionToggle
            label={t("pin_config_status_open")}
            checked={data?.cashierShowOpen !== false}
            disabled={isSavingPerms}
            onLabel={t("pin_config_on")}
            offLabel={t("pin_config_off")}
            onChange={(next) => handleToggle("cashierShowOpen", next)}
          />
          <PermissionToggle
            label={t("pin_config_status_paid_waiter")}
            checked={data?.cashierShowPaidToWaiter !== false}
            disabled={isSavingPerms}
            onLabel={t("pin_config_on")}
            offLabel={t("pin_config_off")}
            onChange={(next) => handleToggle("cashierShowPaidToWaiter", next)}
          />
          <PermissionToggle
            label={t("pin_config_status_paid_cashier")}
            checked={data?.cashierShowPaidToCashier !== false}
            disabled={isSavingPerms}
            onLabel={t("pin_config_on")}
            offLabel={t("pin_config_off")}
            onChange={(next) => handleToggle("cashierShowPaidToCashier", next)}
          />
          <PermissionToggle
            label={t("pin_config_status_without_print")}
            checked={data?.cashierShowWithoutPrint !== false}
            disabled={isSavingPerms}
            onLabel={t("pin_config_on")}
            offLabel={t("pin_config_off")}
            onChange={(next) => handleToggle("cashierShowWithoutPrint", next)}
          />
          <PermissionToggle
            label={t("pin_config_status_voided")}
            checked={data?.cashierShowVoided !== false}
            disabled={isSavingPerms}
            onLabel={t("pin_config_on")}
            offLabel={t("pin_config_off")}
            onChange={(next) => handleToggle("cashierShowVoided", next)}
          />
          <PermissionToggle
            label={t("pin_config_status_disputed")}
            checked={data?.cashierShowDisputed !== false}
            disabled={isSavingPerms}
            onLabel={t("pin_config_on")}
            offLabel={t("pin_config_off")}
            onChange={(next) => handleToggle("cashierShowDisputed", next)}
          />
          <PermissionToggle
            label={t("pin_config_status_confirmed")}
            checked={data?.cashierShowConfirmed !== false}
            disabled={isSavingPerms}
            onLabel={t("pin_config_on")}
            offLabel={t("pin_config_off")}
            onChange={(next) => handleToggle("cashierShowConfirmed", next)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t("pin_config_history_tab_section")}
          </CardTitle>
          <CardDescription>{t("pin_config_history_tab_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="inline-flex rounded-full border border-border bg-muted p-1">
            <button
              type="button"
              disabled={isSavingPerms}
              onClick={() => handleHistoryTabChange("waiter")}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                (data?.cashierHistoryDefaultTab || "waiter") === "waiter"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t("pin_config_history_tab_waiter")}
            </button>
            <button
              type="button"
              disabled={isSavingPerms}
              onClick={() => handleHistoryTabChange("owner")}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                data?.cashierHistoryDefaultTab === "owner"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t("pin_config_history_tab_owner")}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
