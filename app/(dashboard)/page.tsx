"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { selectUser } from "@/stores/features/auth/authSlice";
import { Loading } from "@/components/ui/loading";

export default function DashboardLandingPage() {
  const router = useRouter();
  const user = useSelector(selectUser);
  const userRole = user?.role || "";

  useEffect(() => {
    if (userRole === "cashier") {
      router.replace("/create-order");
    }
    if (userRole === "waiter") {
      router.replace("/my-report");
    }
    if (userRole === "owner") {
      router.replace("/reports");
    }
  }, [router, userRole]);

  if (userRole === "cashier") {
    return (
      <Loading text="Opening create order..." size="lg" className="py-24" />
    );
  }

  if (userRole === "waiter") {
    return (
      <Loading text="Opening your report..." size="lg" className="py-24" />
    );
  }

  if (userRole === "owner") {
    return <Loading text="Opening reports..." size="lg" className="py-24" />;
  }

  return <Loading text="Loading..." size="lg" className="py-24" />;
}
