"use client";

import { useSelector } from "react-redux";
import { selectUser } from "@/stores/features/auth/authSlice";
import { OrderHistory } from "@/components/features/OrderHistory";
import { CashierHistory } from "@/components/features/CashierHistory";

export default function HistoryPage() {
  const user = useSelector(selectUser);
  const userRole = user?.role || "";

  // Show CashierHistory for cashiers, OrderHistory for other roles
  if (userRole === "cashier") {
    return <CashierHistory />;
  }

  return <OrderHistory />;
}

