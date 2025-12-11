"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  daysUntil: number;
  nextPaymentDate?: string;
  className?: string;
}

export function CountdownTimer({
  daysUntil,
  nextPaymentDate,
  className,
}: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState({
    days: daysUntil,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    if (daysUntil <= 0) {
      setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    // Calculate hours, minutes, seconds from days
    const totalSeconds = daysUntil * 24 * 60 * 60;
    const now = new Date();
    const nextDate = nextPaymentDate ? new Date(nextPaymentDate) : null;

    if (nextDate) {
      const diffMs = nextDate.getTime() - now.getTime();
      const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));

      const days = Math.floor(diffSeconds / (24 * 60 * 60));
      const hours = Math.floor((diffSeconds % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((diffSeconds % (60 * 60)) / 60);
      const seconds = diffSeconds % 60;

      setTimeRemaining({ days, hours, minutes, seconds });

      // Update every second
      const interval = setInterval(() => {
        const newDiffMs = nextDate.getTime() - new Date().getTime();
        const newDiffSeconds = Math.max(0, Math.floor(newDiffMs / 1000));

        const newDays = Math.floor(newDiffSeconds / (24 * 60 * 60));
        const newHours = Math.floor(
          (newDiffSeconds % (24 * 60 * 60)) / (60 * 60)
        );
        const newMinutes = Math.floor((newDiffSeconds % (60 * 60)) / 60);
        const newSeconds = newDiffSeconds % 60;

        setTimeRemaining({
          days: newDays,
          hours: newHours,
          minutes: newMinutes,
          seconds: newSeconds,
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      // Fallback to days only
      setTimeRemaining({ days: daysUntil, hours: 0, minutes: 0, seconds: 0 });
    }
  }, [daysUntil, nextPaymentDate]);

  const isUrgent = timeRemaining.days <= 3;
  const isVeryUrgent = timeRemaining.days <= 1;
  const isOverdue =
    timeRemaining.days === 0 &&
    timeRemaining.hours === 0 &&
    timeRemaining.minutes === 0;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border",
        isOverdue &&
          "bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-800",
        isVeryUrgent &&
          !isOverdue &&
          "bg-orange-100 dark:bg-orange-900/20 border-orange-300 dark:border-orange-800",
        isUrgent &&
          !isVeryUrgent &&
          "bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-800",
        !isUrgent &&
          "bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-800",
        className
      )}
    >
      <Clock
        className={cn(
          "h-4 w-4",
          isOverdue && "text-red-600 dark:text-red-400",
          isVeryUrgent && !isOverdue && "text-orange-600 dark:text-orange-400",
          isUrgent && !isVeryUrgent && "text-yellow-600 dark:text-yellow-400",
          !isUrgent && "text-green-600 dark:text-green-400"
        )}
      />
      <div className="flex items-center gap-1 text-sm font-medium">
        {isOverdue ? (
          <span className={cn("font-bold", "text-red-700 dark:text-red-300")}>
            Payment Due Now
          </span>
        ) : (
          <>
            <span
              className={cn(
                isVeryUrgent && "text-orange-700 dark:text-orange-300",
                isUrgent &&
                  !isVeryUrgent &&
                  "text-yellow-700 dark:text-yellow-300",
                !isUrgent && "text-green-700 dark:text-green-300"
              )}
            >
              {timeRemaining.days}d {timeRemaining.hours}h{" "}
              {timeRemaining.minutes}m
            </span>
            <span className="text-gray-600 dark:text-gray-400 ml-1">
              remaining
            </span>
          </>
        )}
      </div>
    </div>
  );
}
