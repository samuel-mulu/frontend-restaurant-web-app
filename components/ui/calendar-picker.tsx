"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addEthiopianMonths,
  civilParts,
  ethiopianToGregorian,
  formatDateWithSystem,
  getEthiopianMonthDays,
  gregorianToEthiopian,
  type CalendarSystem,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

const GC_WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const EC_WEEKDAYS = ["እሑ", "ሰኞ", "ማክ", "ረቡ", "ሐሙ", "ዓር", "ቅዳ"];

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return startOfLocalDay(a).getTime() === startOfLocalDay(b).getTime();
}

function toLocalDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

function addDaysLocal(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfLocalDay(next);
}

function addMonthsLocal(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

type CalendarPickerProps = {
  value: Date;
  onChange: (date: Date) => void;
  calSystem: CalendarSystem;
  label?: string;
};

export function CalendarPicker({
  value,
  onChange,
  calSystem,
  label,
}: CalendarPickerProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value);

  const openDialog = () => {
    setViewDate(value);
    setOpen(true);
  };

  const selectDay = (date: Date) => {
    onChange(startOfLocalDay(date));
    setOpen(false);
  };

  return (
    <div className="space-y-1">
      {label ? (
        <span className="text-xs text-muted-foreground px-1">{label}</span>
      ) : null}
      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange(addDaysLocal(value, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button
          type="button"
          onClick={openDialog}
          className="flex items-center gap-2 px-3 py-1.5 font-semibold text-sm min-w-[160px] justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <CalendarIcon className="h-4 w-4 text-primary" />
          {formatDateWithSystem(calSystem, value)}
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange(addDaysLocal(value, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[360px] bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-base">
              {label || formatDateWithSystem(calSystem, value, { monthYear: true })}
            </DialogTitle>
          </DialogHeader>
          {calSystem === "ec" ? (
            <EthiopianMonthGrid
              value={value}
              viewDate={viewDate}
              onViewDateChange={setViewDate}
              onSelect={selectDay}
            />
          ) : (
            <GregorianMonthGrid
              value={value}
              viewDate={viewDate}
              onViewDateChange={setViewDate}
              onSelect={selectDay}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GregorianMonthGrid({
  value,
  viewDate,
  onViewDateChange,
  onSelect,
}: {
  value: Date;
  viewDate: Date;
  onViewDateChange: (date: Date) => void;
  onSelect: (date: Date) => void;
}) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = new Date(year, month, 1).getDay();
  const today = startOfLocalDay(new Date());

  const cells = useMemo(() => {
    const list: Array<{ date: Date; label: number } | null> = [];
    for (let i = 0; i < startWeekday; i++) list.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      list.push({ date: new Date(year, month, day), label: day });
    }
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [year, month, daysInMonth, startWeekday]);

  return (
    <div className="space-y-3">
      <MonthNav
        title={formatDateWithSystem("gc", new Date(year, month, 1), {
          monthYear: true,
        })}
        onPrev={() => onViewDateChange(addMonthsLocal(viewDate, -1))}
        onNext={() => onViewDateChange(addMonthsLocal(viewDate, 1))}
      />
      <DayGrid
        weekdays={GC_WEEKDAYS}
        cells={cells}
        value={value}
        today={today}
        onSelect={onSelect}
      />
    </div>
  );
}

function EthiopianMonthGrid({
  value,
  viewDate,
  onViewDateChange,
  onSelect,
}: {
  value: Date;
  viewDate: Date;
  onViewDateChange: (date: Date) => void;
  onSelect: (date: Date) => void;
}) {
  const viewEth = gregorianToEthiopian(viewDate);
  const daysInMonth = getEthiopianMonthDays(viewEth.month, viewEth.year);
  const firstGregorian = ethiopianToGregorian({
    year: viewEth.year,
    month: viewEth.month,
    day: 1,
  });
  const startWeekday = firstGregorian.getDay();
  const today = startOfLocalDay(new Date());

  const cells = useMemo(() => {
    const list: Array<{ date: Date; label: number } | null> = [];
    for (let i = 0; i < startWeekday; i++) list.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const instant = ethiopianToGregorian({
        year: viewEth.year,
        month: viewEth.month,
        day,
      });
      const civil = civilParts(instant);
      list.push({
        date: toLocalDate(civil.year, civil.month, civil.day),
        label: day,
      });
    }
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [viewEth.year, viewEth.month, daysInMonth, startWeekday]);

  const shiftMonth = (delta: number) => {
    const nextEth = addEthiopianMonths(viewEth, delta);
    const instant = ethiopianToGregorian({ ...nextEth, day: 1 });
    const civil = civilParts(instant);
    onViewDateChange(toLocalDate(civil.year, civil.month, civil.day));
  };

  return (
    <div className="space-y-3">
      <MonthNav
        title={formatDateWithSystem("ec", viewDate, { monthYear: true })}
        onPrev={() => shiftMonth(-1)}
        onNext={() => shiftMonth(1)}
      />
      <DayGrid
        weekdays={EC_WEEKDAYS}
        cells={cells}
        value={value}
        today={today}
        onSelect={onSelect}
      />
    </div>
  );
}

function MonthNav({
  title,
  onPrev,
  onNext,
}: {
  title: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Button variant="ghost" size="icon" onClick={onPrev}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="text-sm font-semibold">{title}</div>
      <Button variant="ghost" size="icon" onClick={onNext}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function DayGrid({
  weekdays,
  cells,
  value,
  today,
  onSelect,
}: {
  weekdays: string[];
  cells: Array<{ date: Date; label: number } | null>;
  value: Date;
  today: Date;
  onSelect: (date: Date) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {weekdays.map((day) => (
        <div
          key={day}
          className="h-8 text-center text-[11px] font-medium text-muted-foreground leading-8"
        >
          {day}
        </div>
      ))}
      {cells.map((cell, index) => {
        if (!cell) {
          return <div key={`empty-${index}`} className="h-9" />;
        }
        const selected = isSameDay(cell.date, value);
        const isToday = isSameDay(cell.date, today);
        return (
          <button
            key={`${cell.date.toISOString()}-${cell.label}`}
            type="button"
            onClick={() => onSelect(cell.date)}
            className={cn(
              "h-9 rounded-md text-sm hover:bg-slate-100 dark:hover:bg-slate-800",
              selected &&
                "bg-primary text-white hover:bg-primary dark:hover:bg-primary",
              !selected && isToday && "border border-primary text-primary",
            )}
          >
            {cell.label}
          </button>
        );
      })}
    </div>
  );
}
