"use client";

import { useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { selectUser } from "@/stores/features/auth/authSlice";
import {
  AppSettings,
  useGetSettingsQuery,
} from "@/stores/features/settings/settingsApi";

export type OrderStatusKey =
  | "OPEN"
  | "PAID_TO_CASHIER"
  | "TRANSFERRED_TO_OWNER"
  | "VOIDED"
  | "DISPUTED"
  | "OWNER_CONFIRMED"
  | "PAID_WITHOUT_PRINT"
  | "TRANSFERRED_WITHOUT_PRINT";

const DEFAULT_VISIBILITY = {
  cashierShowOpen: true,
  cashierShowPaidToWaiter: true,
  cashierShowPaidToCashier: true,
  cashierShowWithoutPrint: true,
  cashierShowVoided: true,
  cashierShowDisputed: true,
  cashierShowConfirmed: true,
};

function flag(value: boolean | undefined): boolean {
  return value !== false;
}

export function getStatusVisibility(settings?: AppSettings | null) {
  if (!settings) return DEFAULT_VISIBILITY;
  return {
    cashierShowOpen: flag(settings.cashierShowOpen),
    cashierShowPaidToWaiter: flag(settings.cashierShowPaidToWaiter),
    cashierShowPaidToCashier: flag(settings.cashierShowPaidToCashier),
    cashierShowWithoutPrint: flag(settings.cashierShowWithoutPrint),
    cashierShowVoided: flag(settings.cashierShowVoided),
    cashierShowDisputed: flag(settings.cashierShowDisputed),
    cashierShowConfirmed: flag(settings.cashierShowConfirmed),
  };
}

/** Default create-order checkboxes from owner config */
export function getCreateOrderDefaults(settings?: AppSettings | null) {
  const v = getStatusVisibility(settings);
  if (v.cashierShowOpen) {
    return {
      markAsPaidToCashier: false,
      markAsTransferredToOwner: false,
    };
  }
  if (v.cashierShowPaidToWaiter) {
    return {
      markAsPaidToCashier: true,
      markAsTransferredToOwner: false,
    };
  }
  return {
    markAsPaidToCashier: false,
    markAsTransferredToOwner: true,
  };
}

export function isStatusVisibleForCashier(
  status: OrderStatusKey | string,
  settings?: AppSettings | null
): boolean {
  const v = getStatusVisibility(settings);
  switch (status) {
    case "OPEN":
      return v.cashierShowOpen;
    case "PAID_TO_CASHIER":
      return v.cashierShowPaidToWaiter;
    case "PAID_WITHOUT_PRINT":
      return v.cashierShowPaidToWaiter && v.cashierShowWithoutPrint;
    case "TRANSFERRED_TO_OWNER":
      return v.cashierShowPaidToCashier;
    case "TRANSFERRED_WITHOUT_PRINT":
      return v.cashierShowPaidToCashier && v.cashierShowWithoutPrint;
    case "VOIDED":
      return v.cashierShowVoided;
    case "DISPUTED":
      return v.cashierShowDisputed;
    case "OWNER_CONFIRMED":
      return v.cashierShowConfirmed;
    default:
      return true;
  }
}

/**
 * Cashier status visibility from owner Config.
 * Owners always see everything (returns all true).
 */
export function useCashierStatusVisibility() {
  const user = useSelector(selectUser);
  const role = user?.role;

  const { data: settings, isLoading } = useGetSettingsQuery(undefined, {
    skip: role !== "owner" && role !== "cashier",
  });

  const visibility = useMemo(() => {
    if (role === "owner") return DEFAULT_VISIBILITY;
    return getStatusVisibility(settings);
  }, [role, settings]);

  const createDefaults = useMemo(
    () =>
      role === "cashier"
        ? getCreateOrderDefaults(settings)
        : {
            markAsPaidToCashier: false,
            markAsTransferredToOwner: false,
          },
    [role, settings]
  );

  const isStatusVisible = useCallback(
    (status: OrderStatusKey | string) => {
      if (role === "owner") return true;
      return isStatusVisibleForCashier(status, settings);
    },
    [role, settings]
  );

  return {
    visibility,
    createDefaults,
    isStatusVisible,
    settings,
    isLoading: (role === "cashier" || role === "owner") && isLoading,
    role,
  };
}
