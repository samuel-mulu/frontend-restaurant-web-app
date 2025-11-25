/**
 * Conflict Resolution
 * Handles conflicts between local and server data
 * Special-case financial operations (append-only ledger)
 */

export interface Conflict {
  clientId: string;
  type: string;
  localData: any;
  serverData: any;
  reason: string;
}

/**
 * Resolve conflict based on type and field
 * Financial operations: append-only (never overwrite)
 * Inventory: merge deltas
 * Orders: LWW for non-financial, atomic for payment
 */
export function resolveConflict(
  conflict: Conflict
): "local" | "server" | "merge" | "append" {
  const { type, reason } = conflict;

  // Financial operations: always append (never overwrite)
  if (type === "cashLedger" || reason.includes("payment") || reason.includes("cash")) {
    return "append";
  }

  // Inventory: merge deltas
  if (type === "inventory" && reason.includes("quantity")) {
    return "merge";
  }

  // Orders: check if payment-related
  if (type === "order") {
    if (
      reason.includes("payment") ||
      reason.includes("amount") ||
      reason.includes("status")
    ) {
      // Payment fields: server wins (atomic)
      return "server";
    }
    // Non-financial fields: LWW (last write wins)
    return "server"; // Server wins on tie
  }

  // Default: server wins
  return "server";
}

/**
 * Merge inventory quantities using deltas
 */
export function mergeInventoryQuantity(
  localQuantity: number,
  serverQuantity: number,
  localUpdatedAt: string,
  serverUpdatedAt: string
): number {
  // Calculate delta
  const localTime = new Date(localUpdatedAt).getTime();
  const serverTime = new Date(serverUpdatedAt).getTime();

  // If local is newer, apply local delta to server
  if (localTime > serverTime) {
    const delta = localQuantity - serverQuantity;
    return serverQuantity + delta;
  }

  // Server wins
  return serverQuantity;
}

/**
 * Check if field is financial/critical
 */
export function isFinancialField(field: string): boolean {
  const financialFields = [
    "amount",
    "totalAmount",
    "price",
    "payment",
    "cash",
    "transfer",
    "refund",
  ];
  return financialFields.some((f) => field.toLowerCase().includes(f));
}

/**
 * Check if field can be auto-merged
 */
export function canAutoMerge(field: string): boolean {
  const mergeableFields = ["note", "description", "name"];
  return mergeableFields.includes(field.toLowerCase());
}

