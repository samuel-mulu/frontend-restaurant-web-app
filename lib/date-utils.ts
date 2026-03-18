/**
 * Local date string YYYY-MM-DD (timezone-safe).
 * Use instead of toISOString().split("T")[0] which returns UTC date.
 */
export function formatDateLocal(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
