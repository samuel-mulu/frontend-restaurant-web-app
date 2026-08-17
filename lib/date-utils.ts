import { formatCivilYmd } from "./calendar";

/**
 * Gregorian YYYY-MM-DD in Africa/Addis_Ababa (timezone-safe).
 * Use for date inputs and API filters — not for on-screen calendar labels.
 */
export function formatDateLocal(date: Date | string): string {
  return formatCivilYmd(date);
}
