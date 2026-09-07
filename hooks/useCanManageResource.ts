"use client";

import { useMemo } from "react";
import { useSelector } from "react-redux";
import { selectUser } from "@/stores/features/auth/authSlice";
import { useGetSettingsQuery } from "@/stores/features/settings/settingsApi";

export type CashierManageResource = "menus" | "categories" | "inventory";

/**
 * Owner always can manage. Cashier only when the matching owner setting is on.
 */
export function useCanManageResource(resource: CashierManageResource) {
  const user = useSelector(selectUser);
  const role = user?.role;

  const { data: settings, isLoading } = useGetSettingsQuery(undefined, {
    skip: role !== "owner" && role !== "cashier",
  });

  const canManage = useMemo(() => {
    if (role === "owner") return true;
    if (role !== "cashier") return false;
    if (!settings) return false;

    if (resource === "menus") return settings.cashierCanEditMenus !== false;
    if (resource === "categories")
      return settings.cashierCanEditCategories !== false;
    return settings.cashierCanEditInventory !== false;
  }, [role, resource, settings]);

  return {
    canManage,
    isLoading: role === "cashier" && isLoading,
    role,
  };
}
