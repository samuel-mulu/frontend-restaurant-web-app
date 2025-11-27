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
  placedAt?: string;
  cancelledAt?: string;
  paymentReceivedAt?: string;
  paymentDeliveredAt?: string;
  completedAt?: string;
  cancelledBy?: string;
  transferredToOwnerBy?: string;
  confirmedBy?: string;
  disputedBy?: string;
  paymentMethod?: "cash" | "mobile_banking";
  paymentProofImage?: { url?: string; publicId?: string };
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  syncStatus: "pending" | "syncing" | "synced" | "error";
  _deleted?: boolean;
}

export interface ItemRecord {
  id?: number;
  _id?: string;
  clientId: string;
  name: string;
  price: number; // Stored in cents (backend format)
  categoryId: string;
  description?: string;
  image?: { url?: string; publicId?: string };
  isAvailable: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  syncStatus: "pending" | "syncing" | "synced" | "error";
  _deleted?: boolean;
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
  _deleted?: boolean;
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
  _deleted?: boolean;
}

export interface StaffRecord {
  id?: number;
  _id?: string;
  clientId: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  salary?: number;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  syncStatus: "pending" | "syncing" | "synced" | "error";
  _deleted?: boolean;
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
  _deleted?: boolean;
}

export type SyncOperationType =
  | "order"
  | "inventory"
  | "item"
  | "category"
  | "staff"
  | "table"
  | "salary"
  | "shift"
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

export interface SalaryRecord {
  id?: number;
  _id?: string;
  clientId: string;
  staffId: string;
  amount: number;
  month: string; // YYYY-MM format
  year: number;
  paymentDate: string;
  status: "pending" | "paid";
  remarks?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  syncStatus: "pending" | "syncing" | "synced" | "error";
  _deleted?: boolean;
}

export interface ShiftRecord {
  id?: number;
  _id?: string;
  clientId: string;
  staffId: string;
  startTime: string;
  endTime?: string;
  status: "active" | "completed";
  ordersHandled: string[]; // Array of order IDs
  revenue: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  syncStatus: "pending" | "syncing" | "synced" | "error";
  _deleted?: boolean;
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
  salary!: Table<SalaryRecord, number>;
  shifts!: Table<ShiftRecord, number>;
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

    // Version 2: Add salary and shift tables, update existing tables with new fields
    this.version(2)
      .stores({
        orders:
          "++id, clientId, _id, orderNumber, status, syncStatus, createdAt, placedAt",
        items:
          "++id, clientId, _id, categoryId, syncStatus, createdAt, isDeleted",
        staff: "++id, clientId, _id, role, syncStatus, createdAt, isDeleted",
        salary:
          "++id, clientId, _id, staffId, status, createdAt, [staffId+month+year]",
        shifts:
          "++id, clientId, _id, staffId, status, startTime, createdAt, [staffId+status]",
      })
      .upgrade(async (tx) => {
        // Migration logic: Add default values for new fields
        // Orders: Add missing timestamp fields
        await tx
          .table("orders")
          .toCollection()
          .modify((order) => {
            if (!order.placedAt && order.createdAt) {
              order.placedAt = order.createdAt;
            }
          });

        // Items: Add isDeleted and deletedAt fields
        await tx
          .table("items")
          .toCollection()
          .modify((item) => {
            if (item.isDeleted === undefined) {
              item.isDeleted = false;
            }
          });

        // Staff: Add isDeleted, deletedAt, and salary fields
        await tx
          .table("staff")
          .toCollection()
          .modify((staff) => {
            if (staff.isDeleted === undefined) {
              staff.isDeleted = false;
            }
          });
      });
  }
}

// Export singleton instance
export const db = new RestaurantDB();
