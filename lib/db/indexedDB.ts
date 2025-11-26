import Dexie, { Table } from "dexie";

// Types for IndexedDB tables
export interface OrderRecord {
  id?: number;
  _id?: string;
  clientId: string;
  orderNumber: string;
  tableNumber?: string;
  items: any[];
  totalAmount: number;
  status: string;
  waiterId?: string;
  cashierId?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  syncStatus: "pending" | "syncing" | "synced" | "error";
}

export interface ItemRecord {
  id?: number;
  _id?: string;
  clientId: string;
  name: string;
  price: number;
  categoryId: string;
  description?: string;
  image?: { url?: string; publicId?: string };
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  syncStatus: "pending" | "syncing" | "synced" | "error";
}

export interface InventoryRecord {
  id?: number;
  _id?: string;
  clientId: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  description?: string;
  categoryId?: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  syncStatus: "pending" | "syncing" | "synced" | "error";
}

export interface CategoryRecord {
  id?: number;
  _id?: string;
  clientId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  syncStatus: "pending" | "syncing" | "synced" | "error";
}

export interface StaffRecord {
  id?: number;
  _id?: string;
  clientId: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  syncStatus: "pending" | "syncing" | "synced" | "error";
}

export interface TableRecord {
  id?: number;
  _id?: string;
  clientId: string;
  tableNumber: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  syncStatus: "pending" | "syncing" | "synced" | "error";
}

export type SyncOperationType =
  | "order"
  | "inventory"
  | "item"
  | "category"
  | "staff"
  | "table"
  | "cashLedger";

export interface SyncQueueRecord {
  id?: number;
  clientId: string;
  type: SyncOperationType;
  data: any;
  timestamp: number;
  method: "create" | "update" | "delete";
  priority: number; // 1 = highest (cashLedger), 6 = lowest
  retries: number;
  status: "pending" | "syncing" | "synced" | "error";
  error?: string;
  createdAt: string;
  lastRetryAt?: string;
}

export interface DeadLetterQueueRecord {
  id?: number;
  clientId: string;
  type: SyncOperationType;
  data: any;
  timestamp: number;
  method: "create" | "update" | "delete";
  error: string;
  retries: number;
  createdAt: string;
  lastRetryAt?: string;
}

export interface CashLedgerRecord {
  id?: number;
  _id?: string;
  clientId: string;
  orderId?: string;
  amount: number;
  type: "payment" | "transfer" | "refund";
  from?: string;
  to?: string;
  timestamp: string;
  createdAt: string;
  syncedAt?: string;
  syncStatus: "pending" | "syncing" | "synced" | "error";
}

export interface AuthRecord {
  userId: string;
  role: string;
  sessionExpiry: string;
  encryptedToken: string; // Encrypted token using Web Crypto
  lastOnline: string;
}

// Dexie database class
export class RestaurantDB extends Dexie {
  orders!: Table<OrderRecord, number>;
  items!: Table<ItemRecord, number>;
  inventory!: Table<InventoryRecord, number>;
  categories!: Table<CategoryRecord, number>;
  staff!: Table<StaffRecord, number>;
  restaurantTables!: Table<TableRecord, number>;
  syncQueue!: Table<SyncQueueRecord, number>;
  deadLetterQueue!: Table<DeadLetterQueueRecord, number>;
  cashLedger!: Table<CashLedgerRecord, number>;
  auth!: Table<AuthRecord, string>;

  constructor() {
    super("RestaurantDB");

    this.version(1).stores({
      orders: "++id, clientId, _id, orderNumber, status, syncStatus, createdAt",
      items: "++id, clientId, _id, categoryId, syncStatus, createdAt",
      inventory: "++id, clientId, _id, categoryId, syncStatus, createdAt",
      categories: "++id, clientId, _id, syncStatus, createdAt",
      staff: "++id, clientId, _id, role, syncStatus, createdAt",
      restaurantTables: "++id, clientId, _id, syncStatus, createdAt",
      syncQueue:
        "++id, clientId, type, priority, status, createdAt, [type+priority]",
      deadLetterQueue: "++id, clientId, type, createdAt",
      cashLedger: "++id, clientId, _id, orderId, syncStatus, createdAt",
      auth: "userId",
    });
  }
}

// Export singleton instance
export const db = new RestaurantDB();
