/**
 * Production lounge name — change this one value to rebrand the app.
 */
export const LOUNGE_NAME = "Tekeze Hidat Lounge";

export const branding = {
  name: LOUNGE_NAME,
  logo: "/logo1.png",
  loginBackground: "/background.jpg",
} as const;

/** Legacy / old names replaced with the production name on receipts. */
const LEGACY_RECEIPT_NAMES = [
  "3T JUICE",
  "3T Juice",
  "kandino's kitchen",
  "Kandino's Kitchen",
  "Restaurant & Lounge",
  "TEKEZE HIDAT MANAGEMENT SYSTEM",
  "Tekeze Hidat Management System",
  "TEKEZE HIDAT",
  "Tekeze Hidat",
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function brandReceiptText(text: string): string {
  let result = text;
  for (const legacy of LEGACY_RECEIPT_NAMES) {
    result = result.replace(
      new RegExp(escapeRegExp(legacy), "gi"),
      LOUNGE_NAME,
    );
  }
  return result;
}

export function reportExportFilename(dateLabel: string): string {
  const slug = LOUNGE_NAME.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug}-${dateLabel}-report`;
}
