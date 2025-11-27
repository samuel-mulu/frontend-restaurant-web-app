"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { selectUser } from "@/stores/features/auth/authSlice";
import { OrderHistory } from "@/components/features/OrderHistory";
import { OwnerHistory } from "@/components/features/OwnerHistory";
import { Loading } from "@/components/ui/loading";

export default function DashboardLandingPage() {
  const router = useRouter();
  const user = useSelector(selectUser);
  const userRole = user?.role || "";

  useEffect(() => {
    if (userRole === "cashier") {
      router.replace("/create-order");
    }
  }, [router, userRole]);

  if (userRole === "cashier") {
    return (
      <Loading text="Opening create order..." size="lg" className="py-24" />
    );
  }

  if (userRole === "owner") {
    return <OwnerHistory />;
  }

  return <OrderHistory />;
}
