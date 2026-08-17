"use client";

import {
  CALENDAR_STORAGE_KEY,
  CalendarSystem,
  FormatDateOptions,
  formatDateWithSystem,
} from "@/lib/calendar";
import React, { createContext, useContext, useEffect, useState } from "react";

export type { CalendarSystem };

interface CalendarSystemContextValue {
  calSystem: CalendarSystem;
  setCalSystem: (cal: CalendarSystem) => void;
  formattedDate: string;
  formatDate: (date: Date | string, options?: FormatDateOptions) => string;
}

const CalendarSystemContext =
  createContext<CalendarSystemContextValue | null>(null);

export { formatDateWithSystem };

export function CalendarSystemProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [calSystem, setCalSystemState] = useState<CalendarSystem>("gc");
  const [formattedDate, setFormattedDate] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CALENDAR_STORAGE_KEY) as CalendarSystem | null;
    const initial: CalendarSystem =
      stored === "gc" || stored === "ec" ? stored : "gc";
    setCalSystemState(initial);
    setFormattedDate(formatDateWithSystem(initial, new Date()));
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      setFormattedDate(formatDateWithSystem(calSystem, new Date()));
    }
  }, [calSystem, mounted]);

  const setCalSystem = (cal: CalendarSystem) => {
    setCalSystemState(cal);
    localStorage.setItem(CALENDAR_STORAGE_KEY, cal);
  };

  const formatDate = (date: Date | string, options?: FormatDateOptions) =>
    formatDateWithSystem(calSystem, date, options);

  return (
    <CalendarSystemContext.Provider
      value={{ calSystem, setCalSystem, formattedDate, formatDate }}
    >
      {children}
    </CalendarSystemContext.Provider>
  );
}

export function useCalendarSystem(): CalendarSystemContextValue {
  const ctx = useContext(CalendarSystemContext);
  if (!ctx) {
    throw new Error(
      "useCalendarSystem must be used within CalendarSystemProvider",
    );
  }
  return ctx;
}
