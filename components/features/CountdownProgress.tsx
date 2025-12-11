"use client";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface CountdownProgressProps {
  daysUntil: number;
  totalDays: number;
  className?: string;
}

export function CountdownProgress({
  daysUntil,
  totalDays,
  className,
}: CountdownProgressProps) {
  const percentage = Math.max(0, Math.min(100, (daysUntil / totalDays) * 100));
  const daysRemaining = Math.max(0, daysUntil);
  const isOverdue = daysRemaining === 0;
  const isUrgent = daysRemaining <= 7;
  const isWarning = daysRemaining <= 15;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span
          className={cn(
            "font-medium",
            isOverdue && "text-red-600 dark:text-red-400",
            isUrgent && !isOverdue && "text-orange-600 dark:text-orange-400",
            isWarning && !isUrgent && "text-yellow-600 dark:text-yellow-400",
            !isWarning && "text-green-600 dark:text-green-400"
          )}
        >
          {isOverdue
            ? "Payment Due Now"
            : `${daysRemaining} ${
                daysRemaining === 1 ? "day" : "days"
              } remaining`}
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          {totalDays - daysRemaining}/{totalDays} days
        </span>
      </div>
      <Progress
        value={percentage}
        className={cn(
          "h-2",
          isOverdue && "[&>div]:bg-red-500",
          isUrgent && !isOverdue && "[&>div]:bg-orange-500",
          isWarning && !isUrgent && "[&>div]:bg-yellow-500",
          !isWarning && "[&>div]:bg-green-500"
        )}
      />
    </div>
  );
}
