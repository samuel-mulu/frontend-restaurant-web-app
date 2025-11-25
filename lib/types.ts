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

export interface Inventory {
  id: string;
  name: string;
  category: string; // categoryId as string
  quantity: number;
  unit: string;
  price: number;
  description?: string;
  isLowStock?: boolean;
  updatedAt: string;
}

// Deprecated: Use Inventory instead
export interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  price: number; // Legacy field - inventory doesn't have price
  updatedAt: string;
}

export interface Order {
  id: string;
  orderNumber?: string; // Order number from backend
  orderCode?: string; // Order code from backend
  tableNumber?: string; // Table number
  customer?: string; // Legacy field - can be derived from tableNumber
  totalPrice: number; // Total amount
  status:
    | "Completed"
    | "Pending"
    | "Cancelled"
    | "placed"
    | "served"
    | "completed"
    | "cancelled"; // Support both formats
  date: string; // Formatted date string
  // Waiter and Cashier information
  waiterId?: string;
  waiterName?: string; // From populated waiterId
  cashierId?: string;
  cashierName?: string; // From populated cashierId
  // Additional fields
  items?: any[]; // Order items
  note?: string;
  createdAt?: string;
  updatedAt?: string;
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

// POS Printer Service Types
export interface POSPrinterHealth {
  status: "ok" | "error";
  printerConnected: boolean;
  queue: {
    length: number;
    processing: boolean;
  };
  timestamp: string;
  interface?: "usb" | "serial" | "mock";
  printerName?: string;
  serialPort?: string;
}

export interface POSPrinterConfig {
  interface: "usb" | "serial" | "mock";
  printerName?: string;
  serialPort?: string;
  printKey?: string; // Masked
  maxRetries: number;
  retryDelayMs: number;
}

export interface TestPrintResult {
  success: boolean;
  message: string;
  error?: string;
}

// Printer Configuration Types
export interface PrinterConfiguration {
  interface: "usb" | "serial" | "mock";
  usbName?: string | null;
  serialPort?: string | null;
  maxRetries: number;
  retryDelayMs: number;
}

export interface AvailableDevices {
  success: boolean;
  usbPrinters: string[];
  serialPorts: string[];
  error?: string;
}

export interface TestConnectionResult {
  success: boolean;
  connected: boolean;
  message?: string;
  error?: string;
}

export interface ConfigResponse {
  success: boolean;
  config: PrinterConfiguration;
  error?: string;
}