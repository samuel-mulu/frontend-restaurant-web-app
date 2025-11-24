"use client";

import { useSelector } from "react-redux";
import { selectUser } from "@/stores/features/auth/authSlice";
import { OrderHistory } from "@/components/features/OrderHistory";
import { CashierHistory } from "@/components/features/CashierHistory";
import { OwnerHistory } from "@/components/features/OwnerHistory";

export default function HistoryPage() {
  const user = useSelector(selectUser);
  const userRole = user?.role || "";

  // Show CashierHistory for cashiers, OwnerHistory for owners, OrderHistory for other roles
  if (userRole === "cashier") {
    return <CashierHistory />;
  }

  if (userRole === "owner") {
    return <OwnerHistory />;
  }

  return <OrderHistory />;
}

