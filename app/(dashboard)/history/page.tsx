"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { selectUser } from "@/stores/features/auth/authSlice";
import { OrderHistory } from "@/components/features/OrderHistory";
import { CashierHistory } from "@/components/features/CashierHistory";
import { OwnerHistory } from "@/components/features/OwnerHistory";
import { Loading } from "@/components/ui/loading";

export default function HistoryPage() {
  const router = useRouter();
  const user = useSelector(selectUser);
  const userRole = user?.role || "";

  useEffect(() => {
    if (userRole === "waiter") {
      router.replace("/my-report");
    }
  }, [router, userRole]);

  if (userRole === "waiter") {
    return <Loading text="Opening your report..." size="lg" className="py-24" />;
  }

  if (userRole === "cashier") {
    return <CashierHistory />;
  }

  if (userRole === "owner") {
    return <OwnerHistory />;
  }

  return <OrderHistory />;
}
