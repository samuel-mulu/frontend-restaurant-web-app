export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
}

export interface Category {
  id: string;
  name: string;
  products: number; // Note: Backend doesn't provide this, set to 0 by default
  updatedAt: string; // Formatted as YYYY-MM-DD for display
  // Optional fields from backend (not always needed in UI)
  createdAt?: string;
  clientId?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  updatedAt: string;
}

export interface Order {
  id: string;
  customer: string;
  totalPrice: number;
  status: "Completed" | "Pending" | "Cancelled";
  date: string;
}

/**
 * Backend Item interface
 * Matches the response from /api/v1/items
 */
export interface Item {
  id: string;
  name: string;
  category: {
    id: string;
    name: string;
  };
  description?: string;
  price: number; // In dollars (backend stores as cents but returns as dollars)
  image?: {
    url?: string;
    publicId?: string;
  };
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
  clientId?: string;
}
