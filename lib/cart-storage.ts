const CART_STORAGE_KEY = "create_order_cart";

export interface StoredCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: "menu" | "inventory";
}

function isValidCartItem(obj: unknown): obj is StoredCartItem {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.price === "number" &&
    typeof o.quantity === "number" &&
    (o.type === "menu" || o.type === "inventory")
  );
}

export function saveCart<T extends StoredCartItem>(cart: T[]): void {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Silently fail for storage errors
  }
}

export function loadCart(): StoredCartItem[] | null {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const valid = parsed.filter(isValidCartItem);
    return valid.length === parsed.length ? valid : null;
  } catch {
    return null;
  }
}

export function clearCart(): void {
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
  } catch {
    // Silently fail
  }
}
