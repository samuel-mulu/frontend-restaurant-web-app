"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import Kenat from "kenat";

export type CalendarSystem = "gc" | "ec";

const STORAGE_KEY = "calendar_system";

interface CalendarSystemContextValue {
  calSystem: CalendarSystem;
  setCalSystem: (cal: CalendarSystem) => void;
  formattedDate: string;
  formatDate: (date: Date | string, options?: { monthYear?: boolean; short?: boolean }) => string;
}

const CalendarSystemContext =
  createContext<CalendarSystemContextValue | null>(null);

function getFormattedDate(calSystem: CalendarSystem): string {
  try {
    const today = new Kenat();
    if (calSystem === "ec") {
      return today.format({ lang: "amharic", showWeekday: true });
    }
    const gc = today.getGregorian();
    const date = new Date(gc.year, gc.month - 1, gc.day);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
}

/**
 * Convert a Gregorian Date to an Ethiopian calendar {year, month, day}.
 * Standard algorithm: Ethiopian epoch = Julian Day 1724220.
 */
function gcToEc(gcDate: Date): { year: number; month: number; day: number } {
  const y = gcDate.getFullYear();
  const m = gcDate.getMonth() + 1;
  const d = gcDate.getDate();

  // Julian Day Number for the GC date
  const a = Math.floor((14 - m) / 12);
  const gcY = y + 4800 - a;
  const gcM = m + 12 * a - 3;
  const jdn =
    d +
    Math.floor((153 * gcM + 2) / 5) +
    365 * gcY +
    Math.floor(gcY / 4) -
    Math.floor(gcY / 100) +
    Math.floor(gcY / 400) -
    32045;

  // Ethiopian epoch offset
  const r = (jdn - 1724221) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const ecYear = 4 * Math.floor((jdn - 1724221) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  const ecMonth = Math.floor(n / 30) + 1;
  const ecDay = (n % 30) + 1;

  return { year: ecYear, month: ecMonth, day: ecDay };
}

export function formatDateWithSystem(
  calSystem: CalendarSystem,
  date: Date | string,
  options?: { monthYear?: boolean; short?: boolean },
): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return String(date);

    if (calSystem === "ec") {
      const ec = gcToEc(d);
      const ecStr = `${ec.year}/${String(ec.month).padStart(2, "0")}/${String(ec.day).padStart(2, "0")}`;
      const kenat = new Kenat(ecStr);
      if (options?.short) {
        return kenat.format({ lang: "amharic", showWeekday: false });
      }
      if (options?.monthYear) {
        return kenat.format({ lang: "amharic", showWeekday: false });
      }
      return kenat.format({ lang: "amharic", showWeekday: true });
    }

    if (options?.short) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
    if (options?.monthYear) {
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    const d2 = typeof date === "string" ? new Date(date) : date;
    return isNaN(d2.getTime()) ? String(date) : d2.toLocaleDateString();
  }
}

export function CalendarSystemProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [calSystem, setCalSystemState] = useState<CalendarSystem>("gc");
  const [formattedDate, setFormattedDate] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as CalendarSystem | null;
    const initial: CalendarSystem =
      stored === "gc" || stored === "ec" ? stored : "gc";
    setCalSystemState(initial);
    setFormattedDate(getFormattedDate(initial));
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      setFormattedDate(getFormattedDate(calSystem));
    }
  }, [calSystem, mounted]);

  const setCalSystem = (cal: CalendarSystem) => {
    setCalSystemState(cal);
    localStorage.setItem(STORAGE_KEY, cal);
  };

  const formatDate = (
    date: Date | string,
    options?: { monthYear?: boolean; short?: boolean },
  ) => formatDateWithSystem(calSystem, date, options);

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
      "useCalendarSystem must be used within CalendarSystemProvider"
    );
  }
  return ctx;
}
