/**
 * Database Migration System
 * Handles schema migrations and data transformations
 */

import { db } from "./indexedDB";

export interface Migration {
  version: number;
  name: string;
  up: () => Promise<void>;
  down?: () => Promise<void>;
}

const MIGRATIONS: Migration[] = [
  {
    version: 2,
    name: "Add salary and shift tables, extend existing tables",
    up: async () => {
      // This migration is handled by Dexie's version(2) in indexedDB.ts
      // Additional data transformations can be added here if needed
    },
  },
];

/**
 * Get current database version
 */
export async function getCurrentVersion(): Promise<number> {
  try {
    // Dexie stores version in indexedDB metadata
    // We can check by trying to access the salary table
    const hasSalary = await db.salary.count().catch(() => 0);
    const hasShifts = await db.shifts.count().catch(() => 0);
    
    if (hasSalary !== undefined && hasShifts !== undefined) {
      return 2;
    }
    return 1;
  } catch {
    return 1;
  }
}

/**
 * Run migrations
 */
export async function runMigrations(): Promise<void> {
  try {
    const currentVersion = await getCurrentVersion();
    const targetVersion = 2; // Latest version

    if (currentVersion >= targetVersion) {
      return;
    }

    // Run migrations in order
    for (const migration of MIGRATIONS) {
      if (migration.version > currentVersion && migration.version <= targetVersion) {
        await migration.up();
      }
    }
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

/**
 * Initialize database and run migrations
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Open database (this triggers Dexie migrations)
    await db.open();
    
    // Run any additional migrations
    await runMigrations();
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
}

