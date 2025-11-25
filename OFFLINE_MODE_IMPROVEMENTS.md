# Offline Mode Implementation - Enhanced Plan

## High-Level Summary of Improvements (TL;DR)

1. **Harden the sync queue**: Prioritization, batching, retries with jitter, dead-letter queue
2. **Financial-safe conflict resolution**: Append-only ledger for cash transfers, no LWW for money
3. **Workbox + service worker best practices**: Background Sync, Periodic Sync, proper caching strategies
4. **Improved RTK Query integration**: `offlineBaseQuery` wrapper + consistent idempotency (`clientId` mapping)
5. **Enhanced UX**: Sync state, pending count, per-item status, manual conflict resolution UI
6. **Observability + tests**: Flakey networks and conflict scenarios

## Detailed Improvements & Fixes

### 1. Local DB (Dexie) Schema - Explicit & Minimal

**Fixes:**
- Ensure every table has `clientId` (UUID v4)
- Explicit schema definition with minimal required fields
- All tables: `id`, `clientId`, `createdAt`, `updatedAt`, `syncedAt`, `syncStatus`
- Add `cashLedger` table for financial operations
- Add `deadLetterQueue` table for failed operations

**Schema Structure:**
```typescript
- orders: id, clientId, orderNumber, items, totalAmount, status, createdAt, updatedAt, syncedAt, syncStatus
- items: id, clientId, name, price, categoryId, createdAt, updatedAt, syncedAt, syncStatus
- inventory: id, clientId, name, quantity, unit, price, createdAt, updatedAt, syncedAt, syncStatus
- categories: id, clientId, name, createdAt, updatedAt, syncedAt, syncStatus
- staff: id, clientId, name, role, createdAt, updatedAt, syncedAt, syncStatus
- tables: id, clientId, tableNumber, createdAt, updatedAt, syncedAt, syncStatus
- syncQueue: id, clientId, type, data, timestamp, method, priority, retries, status, error, createdAt, lastRetryAt
- deadLetterQueue: id, clientId, type, data, timestamp, method, error, retries, createdAt, lastRetryAt
- cashLedger: id, clientId, orderId, amount, type, from, to, timestamp, createdAt, syncedAt, syncStatus
- auth: userId, role, sessionExpiry, encryptedToken, lastOnline
```

### 2. Sync Queue Manager - Robust, Prioritized, Batched

**Fixes & Improvements:**

**Prioritization:**
1. `cashLedger` (money) - highest priority
2. `orders` - high priority
3. `inventory` - medium priority
4. `items` - medium priority
5. `staff` - low priority
6. `categories` - low priority

**Batching:**
- Financial entries: batches of 10 (smaller failure domain)
- Orders: batches of 50
- Other entities: batches of 50
- Max 100 per backend request (backend limit)

**Retries:**
- Exponential backoff with jitter
- Base: 1s, Max: 60s
- Jitter: ±20% random variation
- Track retries per operation
- Move to dead-letter queue after 5 failed attempts

**Dead-letter queue:**
- Store failed operations with full context
- Include error messages, timestamps, operation data
- Surface in UI for manual resolution
- Allow manual retry or deletion

**Idempotency:**
- Always include `clientId` in sync payload
- Backend already supports it - critical for idempotency

### 3. Conflict Resolution - Special-Case Finances

**Fixes & Cautions:**

**DO NOT use blind Last-Write-Wins for cash:**
- Use append-only ledger for money
- Reconcile using ledger entries
- Map ledger entries to order status transitions
- Treat payment state as atomic
- Server wins on tie (ok), but log all conflicts

**Conflict Policy:**

**Financial:**
- Always append, never overwrite
- Use ledger entries for reconciliation
- No LWW for payment amounts

**Inventory count:**
- Perform server-side merge using operation deltas
- Formula: `serverQuantity ± delta`
- Never overwrite, always apply delta

**Orders meta:**
- LWW for notes/description
- State machine validation for order status (server-side)
- Payment fields: atomic, no merge

**General:**
- Automatic merge for simple fields (description, notes)
- Present conflicts for critical fields (payment amounts, timestamps)
- Log all conflicts with full context
- Surface conflicts in UI for manual resolution

### 4. RTK Query / baseQuery Offline Wrapper

**Improvements:**

Create `offlineBaseQuery` that:
- Checks online via `navigator.onLine` and `offlineDetector`
- **For GETs**: Serve from Dexie cache when offline
- **For MUTATIONS**: 
  - Write to Dexie immediately
  - Push to syncQueue with `clientId` (UUID v4)
  - Return optimistic response with meta: `{ pending: true, clientId: string, synced: false }`
- Supply meta on optimistic responses so UI can show pending state
- Track `clientId` for all operations

**Periodic background sync:**
- Supported only in Chromium-based browsers
- Fallback to in-app sync when user opens app (use visibility + focus events)

**Large file uploads:**
- Store locally as file blobs in IndexedDB
- Upload on reconnect
- Provide upload-progress UI

### 5. Service Worker Strategy

**Strategy:**
- Service worker caches shell & assets
- SW handles fetch for assets and images (stale-while-revalidate or network-first for images)
- SW listens for sync events and calls client to run `syncQueue.process()` for authenticated sessions
- Use Workbox for precaching, routing, strategies, and background sync

**Workbox Modules:**
- `workbox-precaching`: Precache shell & assets
- `workbox-routing`: Route requests
- `workbox-strategies`: Cache strategies (stale-while-revalidate, network-first)
- `workbox-background-sync`: Background sync API
- `workbox-window`: Client-side integration

### 6. Offline Auth & Token Handling (Security)

**Fixes & Cautions:**

**DO NOT store raw refresh tokens in localStorage/unencrypted IndexedDB:**
- Use Web Crypto API to encrypt before writing to IndexedDB
- Prefer HTTP-only secure cookies for auth when possible
- Store only non-sensitive session metadata: `userId`, `role`, `sessionExpiry`

**Offline login policy:**
- Allow only if cached session token exists
- Token must be within allowed offline window (24 hours for security)
- Require owner approval for longer offline periods
- Validate token expiry before allowing offline access

**Encryption:**
- Use Web Crypto API (AES-GCM)
- Encrypt sensitive data before storing
- Decrypt on app start for offline validation

### 7. Enhanced UX Components

**Sync Status Component:**
- Overall sync status (syncing, synced, error, offline)
- Pending count (total operations waiting)
- Per-item status (pending, syncing, synced, error)
- Progress bar for current batch
- Pending operations list (grouped by priority)
- Error handling with dead-letter queue link
- Manual retry button per operation

**Conflict Resolution UI:**
- Display conflicts with full context
- Show local vs server values
- Allow manual resolution for critical fields
- Automatic merge for simple fields

**Dead-letter Queue UI:**
- List failed operations after max retries
- Show full error context
- Allow manual retry or deletion
- Export for manual review

### 8. Observability & Testing

**Observability:**
- Log all sync operations with timestamps
- Track sync success/failure rates
- Monitor conflict frequency
- Log financial operations separately
- Metrics: sync latency, retry counts, dead-letter queue size

**Testing Scenarios:**
- Flakey network (intermittent connectivity)
- Conflict scenarios (especially financial)
- Large batch syncs
- Dead-letter queue handling
- Offline login validation
- Token expiry during offline
- Service worker updates

## Implementation Priority

1. **Phase 1: Foundation & Security**
   - Install dependencies (Dexie, Workbox, uuid, Web Crypto)
   - Setup explicit IndexedDB schema with `clientId` everywhere
   - Implement secure auth cache with encryption
   - Create offline detection service

2. **Phase 2: Hardened Sync Queue**
   - Build prioritized sync queue manager
   - Implement batching (10 for financial, 50 for others)
   - Add retry logic with exponential backoff + jitter
   - Create dead-letter queue

3. **Phase 3: Financial-Safe Conflict Resolution**
   - Implement append-only ledger for cash transfers
   - Special-case financial operations (no LWW for money)
   - Handle inventory deltas (server-side merge)
   - Create conflict resolution UI

4. **Phase 4: RTK Query Integration**
   - Implement `offlineBaseQuery` wrapper
   - Cache all read operations in Dexie
   - Generate `clientId` (UUID v4) for all mutations
   - Return optimistic responses with meta

5. **Phase 5: Service Worker & Background Sync**
   - Setup Workbox service worker
   - Cache shell & assets
   - Implement Background Sync API
   - Handle large file uploads

6. **Phase 6: Enhanced UX**
   - Build comprehensive sync status UI
   - Add per-item status tracking
   - Create dead-letter queue UI
   - Implement conflict resolution interface

7. **Phase 7: Testing & Hardening**
   - Test flakey network scenarios
   - Test conflict scenarios (especially financial)
   - Add observability (logging, metrics)
   - Security audit

## Dependencies

```json
{
  "dexie": "^3.2.4",
  "dexie-react-hooks": "^1.1.7",
  "workbox-window": "^7.0.0",
  "workbox-precaching": "^7.0.0",
  "workbox-routing": "^7.0.0",
  "workbox-strategies": "^7.0.0",
  "workbox-background-sync": "^7.0.0",
  "uuid": "^9.0.1",
  "@types/uuid": "^9.0.8"
}
```

## Key Principles

1. **Financial Safety First**: Never use LWW for money, always append-only ledger
2. **Idempotency**: Always use `clientId` (UUID v4) for all operations
3. **Security**: Encrypt sensitive data, use HTTP-only cookies when possible
4. **Resilience**: Retry with jitter, dead-letter queue for failures
5. **UX**: Show sync state, pending count, per-item status, conflict resolution
6. **Observability**: Log everything, track metrics, test edge cases

