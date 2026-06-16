"use client";

import { useCalendarSystem } from "@/hooks/useCalendarSystem";
import { CalendarDays } from "lucide-react";

export function DateDisplay() {
  const { formattedDate } = useCalendarSystem();

  if (!formattedDate) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground px-2 py-1 rounded-md bg-muted/50 border border-border/60">
      <CalendarDays className="h-4 w-4 shrink-0" />
      <span className="font-medium leading-tight">{formattedDate}</span>
    </div>
  );
}
