/**
 * Single calendar authority for the app.
 *
 * - Storage and API dates stay Gregorian.
 * - Display converts with ICU (`ethiopic`) in Africa/Addis_Ababa.
 * - Structured GC↔EC math uses Julian Day epoch 1723856 (Unicode/ICU),
 *   verified against Intl — never a ±1 day fudge.
 */

export type CalendarSystem = "gc" | "ec";

export interface CivilDate {
  year: number;
  month: number;
  day: number;
}

export type EthiopianDate = CivilDate;
export type GregorianDate = CivilDate;

export const ADDIS_TIMEZONE = "Africa/Addis_Ababa";
export const CALENDAR_STORAGE_KEY = "calendar_system";

/** Unicode/ICU Ethiopic epoch (Meskerem 1, 1 E.C.). Do not use 1724220/1724221. */
const ETHIOPIC_EPOCH = 1723856;

const ETHIOPIAN_MONTH_NAMES = [
  "",
  "Meskerem",
  "Tikimt",
  "Hidar",
  "Tahsas",
  "Tir",
  "Yekatit",
  "Megabit",
  "Miazia",
  "Genbot",
  "Sene",
  "Hamle",
  "Nehase",
  "Pagume",
];

export interface FormatDateOptions {
  monthYear?: boolean;
  short?: boolean;
  dateTime?: boolean;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Noon in Addis Ababa (UTC+3, no DST) for a civil Y-M-D.
 * Avoids midnight/UTC shifting the calendar day.
 */
export function addisNoon(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 9, 0, 0));
}

function civilPartsFromInstant(
  date: Date,
  timeZone: string = ADDIS_TIMEZONE,
): CivilDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  const get = (type: string) => {
    const part = parts.find((p) => p.type === type);
    return part ? Number(part.value) : NaN;
  };

  return { year: get("year"), month: get("month"), day: get("day") };
}

/**
 * Civil Y-M-D in Africa/Addis_Ababa.
 * Date-only strings (`YYYY-MM-DD`) are treated as Addis civil dates, not UTC midnight.
 */
export function civilParts(
  input: Date | string,
  timeZone: string = ADDIS_TIMEZONE,
): CivilDate {
  if (typeof input === "string") {
    const dateOnly = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) {
      return {
        year: Number(dateOnly[1]),
        month: Number(dateOnly[2]),
        day: Number(dateOnly[3]),
      };
    }
    const parsed = new Date(input);
    if (!isValidDate(parsed)) {
      throw new Error(`Invalid date: ${input}`);
    }
    return civilPartsFromInstant(parsed, timeZone);
  }

  if (!isValidDate(input)) {
    throw new Error("Invalid Date");
  }
  return civilPartsFromInstant(input, timeZone);
}

/** Gregorian YYYY-MM-DD in Addis — for inputs and API filters, not display. */
export function formatCivilYmd(input: Date | string): string {
  const { year, month, day } = civilParts(input);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function getStoredCalendarSystem(): CalendarSystem {
  if (typeof window === "undefined") return "gc";
  try {
    const stored = window.localStorage.getItem(CALENDAR_STORAGE_KEY);
    return stored === "ec" || stored === "gc" ? stored : "gc";
  } catch {
    return "gc";
  }
}

export function gregorianToJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

export function jdnToGregorian(jdn: number): GregorianDate {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    day: e - Math.floor((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * Math.floor(m / 10),
    year: 100 * b + d - 4800 + Math.floor(m / 10),
  };
}

export function jdnToEthiopic(jdn: number): EthiopianDate {
  const r = ((jdn - ETHIOPIC_EPOCH) % 1461 + 1461) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  return {
    year:
      4 * Math.floor((jdn - ETHIOPIC_EPOCH) / 1461) +
      Math.floor(r / 365) -
      Math.floor(r / 1460),
    month: Math.floor(n / 30) + 1,
    day: (n % 30) + 1,
  };
}

export function ethiopicToJdn(year: number, month: number, day: number): number {
  return (
    ETHIOPIC_EPOCH + 365 * year + Math.floor(year / 4) + 30 * (month - 1) + day - 1
  );
}

export function gregorianToEthiopian(input: Date | string): EthiopianDate {
  const { year, month, day } = civilParts(input);
  return jdnToEthiopic(gregorianToJdn(year, month, day));
}

export function ethiopianToGregorian(ethiopianDate: EthiopianDate): Date {
  const { year, month, day } = ethiopianDate;
  const g = jdnToGregorian(ethiopicToJdn(year, month, day));
  return addisNoon(g.year, g.month, g.day);
}

export function isEthiopianLeapYear(year: number): boolean {
  return year % 4 === 3;
}

export function getEthiopianMonthDays(month: number, year: number): number {
  if (month >= 1 && month <= 12) return 30;
  if (month === 13) return isEthiopianLeapYear(year) ? 6 : 5;
  return 0;
}

export function formatEthiopianDate(date: EthiopianDate): string {
  return `${date.year}-${pad2(date.month)}-${pad2(date.day)}`;
}

export function parseEthiopianDate(dateString: string): EthiopianDate {
  if (typeof dateString !== "string") {
    throw new Error(
      `Invalid Ethiopian date: expected string, got ${typeof dateString}`,
    );
  }
  const parts = dateString.split("-");
  if (parts.length !== 3) {
    throw new Error("Invalid Ethiopian date format. Expected YYYY-MM-DD");
  }
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error("Invalid Ethiopian date values");
  }
  if (month < 1 || month > 13) {
    throw new Error("Ethiopian month must be between 1 and 13");
  }
  const maxDays = getEthiopianMonthDays(month, year);
  if (day < 1 || day > maxDays) {
    throw new Error(`Day must be between 1 and ${maxDays} for month ${month}`);
  }
  return { year, month, day };
}

export function getCurrentEthiopianDate(): EthiopianDate {
  return gregorianToEthiopian(new Date());
}

export function addEthiopianMonths(
  date: EthiopianDate,
  months: number,
): EthiopianDate {
  let newYear = date.year;
  let newMonth = date.month + months;
  let newDay = date.day;

  while (newMonth > 13) {
    newMonth -= 13;
    newYear++;
  }
  while (newMonth < 1) {
    newMonth += 13;
    newYear--;
  }

  const maxDays = getEthiopianMonthDays(newMonth, newYear);
  if (newDay > maxDays) newDay = maxDays;

  return { year: newYear, month: newMonth, day: newDay };
}

export function daysBetweenEthiopianDates(
  startDate: EthiopianDate,
  endDate: EthiopianDate,
): number {
  return (
    ethiopicToJdn(endDate.year, endDate.month, endDate.day) -
    ethiopicToJdn(startDate.year, startDate.month, startDate.day)
  );
}

export function getEthiopianMonthName(month: number): string {
  return ETHIOPIAN_MONTH_NAMES[month] || "";
}

export function formatEthiopianDateReadable(date: EthiopianDate): string {
  return `${date.day} ${getEthiopianMonthName(date.month)} ${date.year}`;
}

function weekdayName(
  date: Date,
  calendar: "gregory" | "ethiopic",
  locale: string,
): string {
  return new Intl.DateTimeFormat(`${locale}-u-ca-${calendar}`, {
    weekday: "long",
    timeZone: ADDIS_TIMEZONE,
  }).format(date);
}

function toAddisInstant(input: Date | string): Date {
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const { year, month, day } = civilParts(input);
    return addisNoon(year, month, day);
  }
  const date = typeof input === "string" ? new Date(input) : input;
  if (!isValidDate(date)) {
    throw new Error("Invalid date");
  }
  return date;
}

/**
 * Display formatter. Weekday is taken from the same instant as the date
 * (ICU), so Monday cannot become Sunday.
 */
export function formatDateWithSystem(
  calSystem: CalendarSystem,
  date: Date | string | null | undefined,
  options?: FormatDateOptions,
): string {
  if (date == null || date === "") {
    return "—";
  }
  try {
    const instant = toAddisInstant(date);

    if (calSystem === "ec") {
      if (options?.short) {
        return new Intl.DateTimeFormat("am-ET-u-ca-ethiopic", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          timeZone: ADDIS_TIMEZONE,
        }).format(instant);
      }
      if (options?.monthYear) {
        return new Intl.DateTimeFormat("am-ET-u-ca-ethiopic", {
          month: "long",
          year: "numeric",
          timeZone: ADDIS_TIMEZONE,
        }).format(instant);
      }
      const formatted = new Intl.DateTimeFormat("am-ET-u-ca-ethiopic", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: ADDIS_TIMEZONE,
      }).format(instant);
      if (options?.dateTime) {
        const time = new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: ADDIS_TIMEZONE,
        }).format(instant);
        return `${formatted} ${time}`;
      }
      return formatted;
    }

    if (options?.short) {
      return formatCivilYmd(instant);
    }
    if (options?.monthYear) {
      return new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
        timeZone: ADDIS_TIMEZONE,
      }).format(instant);
    }
    if (options?.dateTime) {
      return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: ADDIS_TIMEZONE,
      }).format(instant);
    }
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: ADDIS_TIMEZONE,
    }).format(instant);
  } catch {
    return typeof date === "string" ? date : "—";
  }
}

/** Same-instant weekday names (for tests). */
export function weekdayPair(input: Date | string): { gc: string; ec: string } {
  const instant = toAddisInstant(input);
  return {
    gc: weekdayName(instant, "gregory", "en-US"),
    ec: weekdayName(instant, "ethiopic", "en-US"),
  };
}
