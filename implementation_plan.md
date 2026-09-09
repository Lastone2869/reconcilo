# Reconcilo — Full Project Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the complete Reconcilo offline-first inventory reconciliation system end-to-end — React+Vite+Tailwind frontend, TypeScript Lambda backend, AWS SAM IaC, IndexedDB offline POS, stubbed AWS adapters, tests, and a beginner-friendly AWS setup guide.

**Architecture:** Offline POS (IndexedDB) → S3 batch upload → Ingestion Lambda → SQS FIFO (per-store serialization) → Processing Lambda → Step Functions orchestration (replay, reconcile, conflict check, suspicious-activity rules) → DynamoDB (conditional/versioned writes) → DynamoDB Streams → WebSocket dashboard push → SNS/SES notifications. All AWS calls abstracted behind adapter modules with stubs.

**Tech Stack:** React 18, Vite, Tailwind CSS, TypeScript, IndexedDB (via idb), AWS SAM, Vitest, Plus Jakarta Sans + Inter + JetBrains Mono.

**Spec:** `main.md`, `projectrequirements.md`, `architecture.md`, `design.md`, `rules.md`, `AGENTS.md`, `memory.md`

## Global Constraints

- **TypeScript only** — no `.js` files where `.ts`/`.tsx` is expected (AGENTS.md §4)
- **Canonical vocabulary** — transaction lifecycle: `CREATED → PENDING → SYNCING → PROCESSING → RECONCILED → COMPLETED`; exceptions: `CONFLICT`, `FLAGGED`, `REJECTED`; connectivity: `ONLINE / OFFLINE / SYNCING / SYNC_FAILED`; conflict status: `OPEN / UNDER_REVIEW / RESOLVED / ESCALATED`; suspicious: `FLAGGED / REVIEWED` (AGENTS.md §2)
- **No hardcoded thresholds** — all business thresholds configurable (rules.md §21, AGENTS.md §8)
- **No real AWS calls** — stub all AWS service interactions behind adapter interfaces with TODO markers
- **Idempotent everywhere** — conditional writes, not blind puts (AGENTS.md §6)
- **Offline-first invariants** — local writes succeed independently of cloud; client-generated `transaction_id` (AGENTS.md §5)
- **RBAC enforced** — `STORE_STAFF / STORE_MANAGER / ADMIN / SUPPLIER` on every endpoint (AGENTS.md §7)
- **DynamoDB schema matches architecture.md §16** — do not rename partition/sort keys
- **Design system from design.md** — icy mint/blush/lavender palette, Plus Jakarta Sans headings, Inter body, cool neutrals

---

## Phase 1: Project Foundation & Shared Types

### Task 1: Initialize Monorepo Structure

Create the project skeleton with frontend (React+Vite+Tailwind) and backend (TypeScript Lambda handlers) in a monorepo layout.

**Files to create:**
- `reconcilo/package.json` (workspace root)
- `reconcilo/tsconfig.base.json` (shared TS config)
- `reconcilo/frontend/` (Vite React app)
- `reconcilo/backend/` (Lambda handlers + adapters)
- `reconcilo/shared/` (shared types, enums, schemas)
- `reconcilo/infrastructure/` (AWS SAM template)

**Directory structure:**
```
reconcilo/
├── package.json                    # Workspace root
├── tsconfig.base.json
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css                # Tailwind + design tokens
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       ├── stores/                  # State management
│       ├── services/                # API + IndexedDB
│       ├── types/
│       └── utils/
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── handlers/                # Lambda entry points
│       ├── services/                # Business logic
│       ├── adapters/                # AWS service adapters (stubbed)
│       ├── types/
│       └── utils/
├── shared/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── types/                   # Canonical types & enums
│       ├── schemas/                 # Validation schemas
│       └── constants/               # Configurable defaults
├── infrastructure/
│   ├── template.yaml               # AWS SAM template
│   └── samconfig.toml
└── tests/
    ├── backend/
    └── shared/
```

### Task 2: Shared Types & Canonical Enums

Define all canonical types matching architecture.md §16 exactly.

**Files:**
- `shared/src/types/enums.ts` — All canonical enum values
- `shared/src/types/entities.ts` — Store, User, Product, Inventory, Transaction, SyncBatch, Conflict, SuspiciousActivity, Notification, AuditRecord
- `shared/src/types/api.ts` — API request/response types per §16.2
- `shared/src/types/websocket.ts` — WebSocket message types per §16.3
- `shared/src/types/config.ts` — Configurable threshold types
- `shared/src/schemas/validation.ts` — Transaction validation (RULE-005/006/007)
- `shared/src/constants/defaults.ts` — Default configurable values

**Key enums (AGENTS.md §2 canonical vocabulary):**
```typescript
// Transaction lifecycle (architecture.md §6)
enum TransactionLifecycleState {
  CREATED = 'CREATED',
  PENDING = 'PENDING',
  SYNCING = 'SYNCING',
  PROCESSING = 'PROCESSING',
  RECONCILED = 'RECONCILED',
  COMPLETED = 'COMPLETED',
  CONFLICT = 'CONFLICT',
  FLAGGED = 'FLAGGED',
  REJECTED = 'REJECTED',
}

// Store connectivity (architecture.md §10)
enum StoreConnectivityState {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  SYNCING = 'SYNCING',
  SYNC_FAILED = 'SYNC_FAILED',
}

// Conflict status (projectrequirements.md FR-18)
enum ConflictStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  ESCALATED = 'ESCALATED',
}

// Suspicious activity status
enum SuspiciousActivityStatus {
  FLAGGED = 'FLAGGED',
  REVIEWED = 'REVIEWED',
}

// User roles
enum UserRole {
  STORE_STAFF = 'STORE_STAFF',
  STORE_MANAGER = 'STORE_MANAGER',
  ADMIN = 'ADMIN',
  SUPPLIER = 'SUPPLIER',
}
```

**Entity types match §16.1 DynamoDB tables exactly:**
- `Stores` table: PK `store_id`, attrs: `name`, `connectivity_state`, `last_successful_sync`, `last_sync_attempt`
- `Users` table: PK `user_id`, attrs: `role`, `store_id` (nullable), `status`, `cognito_sub`
- `Products` table: PK `product_id`, attrs: `name`, `sku`, `low_stock_threshold`
- `Inventory` table: PK `store_id`, SK `product_id`, attrs: `quantity`, `version`, `last_updated`, `status`
- `Transactions` table: PK `transaction_id`, attrs: `store_id`, `device_id`, `device_sequence`, `product_id`, `quantity`, `type`, `created_at`, `batch_id`, `lifecycle_state`; GSI: `store_id` + `created_at`
- `SyncBatches` table: PK `batch_id`, attrs: `store_id`, `device_id`, `s3_bucket`, `s3_key`, `status`, `retry_count`, `last_attempt_at`
- `Conflicts` table: PK `conflict_id`, attrs: `store_id`, `product_id`, `transaction_ids`, `expected_state`, `actual_state`, `difference`, `status`, `detected_at`
- `SuspiciousActivity` table: PK `alert_id`, attrs: `store_id`, `transaction_ids`, `triggered_rule`, `status`, `detected_at`
- `Notifications` table: PK `notification_id`, attrs: `type`, `recipient`, `related_event_id`, `status`, `created_at`
- `AuditRecords` table: PK `audit_id`, SK `created_at`, attrs: `entity_type`, `entity_id`, `actor`, `action`, `previous_state`, `new_state`

### Task 3: AWS SAM Infrastructure Template

Define all resources from architecture.md §4 in `infrastructure/template.yaml`.

**Resources defined:**
- Cognito User Pool + App Client
- API Gateway HTTP API + WebSocket API
- 10 DynamoDB tables (per §16.1) with GSIs
- S3 bucket for sync batches
- SQS FIFO queue + DLQ
- 8+ Lambda functions (ingestion, processing, API handlers, stream consumer, notification)
- Step Functions state machine
- SNS topic
- CloudWatch log groups

All Lambda function code references point to the `backend/` handlers. No deployment commands — template is ready for future `sam deploy`.

---

## Phase 2: Backend — AWS Adapters (Stubbed)

### Task 4: DynamoDB Adapter

**File:** `backend/src/adapters/dynamodb.adapter.ts`

Provides typed CRUD operations for every table. Uses conditional writes with version checks for Inventory table (§14, Guarantee 4). All methods return typed results matching shared types. Contains clear `// TODO: Replace stub with real AWS SDK DynamoDB client` markers.

Key methods:
- `getItem<T>(table, key)` / `putItem<T>(table, item, condition?)` / `updateItem(table, key, updates, condition?)` / `queryByGSI(table, index, key)`
- `conditionalPut(table, item, conditionExpression)` — for idempotent transaction processing
- `versionedUpdate(table, key, updates, expectedVersion)` — for inventory writes

### Task 5: S3 Adapter

**File:** `backend/src/adapters/s3.adapter.ts`

- `uploadBatch(bucket, key, data)` — upload sync batch JSON
- `getBatch(bucket, key)` — retrieve batch for processing
- `generatePresignedUrl(bucket, key)` — for client uploads

### Task 6: SQS Adapter

**File:** `backend/src/adapters/sqs.adapter.ts`

- `sendMessage(queueUrl, body, messageGroupId, deduplicationId)` — FIFO message with `store_id` as group
- `deleteMessage(queueUrl, receiptHandle)`
- `requeueFromDLQ(dlqUrl, mainQueueUrl, messageId)`

### Task 7: SNS, SES, Cognito, Step Functions, CloudWatch Adapters

**Files:**
- `backend/src/adapters/sns.adapter.ts` — `publishAlert(topicArn, message, subject)`
- `backend/src/adapters/ses.adapter.ts` — `sendEmail(to, subject, htmlBody)`
- `backend/src/adapters/cognito.adapter.ts` — `verifyToken(token)`, `getUserRole(sub)`
- `backend/src/adapters/stepfunctions.adapter.ts` — `startExecution(stateMachineArn, input)`
- `backend/src/adapters/cloudwatch.adapter.ts` — `logMetric(namespace, metricName, value)`

Each adapter exports a clear interface and a stub implementation.

---

## Phase 3: Backend — Business Logic Services

### Task 8: Transaction Validation Service

**File:** `backend/src/services/transaction-validation.service.ts`

Implements RULE-005 through RULE-008:
- Validates required fields (transaction_id, store_id, user_id, product_id, quantity, timestamp, type)
- Validates quantity > 0 and numeric (RULE-006)
- Validates product exists (RULE-007)
- Validates store association (RULE-008)
- Returns typed validation result with per-field errors

### Task 9: Idempotency Service

**File:** `backend/src/services/idempotency.service.ts`

Implements RULE-014/015/019:
- `isTransactionProcessed(transactionId)` — checks DynamoDB `Transactions` table
- `isBatchProcessed(batchId)` — checks `SyncBatches` table
- `markTransactionProcessed(transactionId, state)` — conditional put with `attribute_not_exists`
- Uses the transaction_id as primary key idempotency mechanism per §16.1

### Task 10: Transaction Replay Service

**File:** `backend/src/services/transaction-replay.service.ts`

Implements RULE-017/018/019 and architecture.md §8:
- `replayBatch(batch)` — replays transactions in deterministic device-local order
- For each transaction: validate → check idempotency → calculate inventory effect → conditional write
- Sale effect: `Stock_after = Stock_before - Quantity_sold` (RULE-022)
- Returns per-transaction processing results (RULE-016)

### Task 11: Inventory Reconciliation Service

**File:** `backend/src/services/inventory-reconciliation.service.ts`

Implements architecture.md §9 and RULE-021/023/025-027:
- `reconcileTransaction(transaction, currentInventory)` — calculates expected state, validates
- Uses versioned DynamoDB writes: read version → calculate → write if version matches (§14, Guarantee 4)
- Oversell detection: if `expected_stock < 0`, create conflict (RULE-023)
- Version mismatch: re-read, recalculate, retry, or conflict
- Returns `ReconciliationResult` with success/conflict/rejected status

### Task 12: Conflict Detection Service

**File:** `backend/src/services/conflict-detection.service.ts`

Implements architecture.md §10 and RULE-028/029:
- `detectConflict(transaction, expected, actual)` — creates conflict record
- Conflict types: OVERSOLD, INVALID_PRODUCT, INVALID_STORE, STALE_VERSION, ORDERING_AMBIGUITY
- Creates `Conflicts` table entry with status `OPEN`
- Records: store_id, product_id, transaction_ids, expected_state, actual_state, difference

### Task 13: Suspicious Activity Service

**File:** `backend/src/services/suspicious-activity.service.ts`

Implements RULE-033 through RULE-038:
- `evaluateRules(transaction, config)` — runs all configured rules
- Rule: excessive quantity (RULE-034) — `quantity > suspicious_quantity_threshold`
- Rule: repeated unusual transactions (RULE-035) — count in time window
- Rule: repeated reversals (RULE-036) — reversal count in time window
- All thresholds from config, not hardcoded (RULE-033)
- Creates `SuspiciousActivity` record with status `FLAGGED`, not "fraud" (RULE-037)

### Task 14: Low Stock Detection Service

**File:** `backend/src/services/low-stock.service.ts`

Implements RULE-024 and FR-14:
- `checkLowStock(storeId, productId, currentQuantity, threshold)` — compares against configurable threshold
- Triggers SNS alert via adapter
- Threshold configurable per product/store (RULE-024)

### Task 15: Notification Service

**File:** `backend/src/services/notification.service.ts`

Implements RULE-042/043/044:
- `sendOperationalAlert(type, data)` — uses SNS adapter for low stock, suspicious activity, sync failure, conflicts
- `sendDetailedReport(type, data)` — uses SES adapter for reconciliation reports, inventory reports, supplier requests
- Anti-spam: checks `Notifications` table for recent identical notifications (RULE-044)
- Logs notification status separately (FR-25)

### Task 16: Audit Service

**File:** `backend/src/services/audit.service.ts`

Implements RULE-052/053:
- `recordAudit(entityType, entityId, actor, action, previousState, newState)` — append-only to `AuditRecords` table
- Records all important actions: transaction creation, sync, processing, conflict creation/resolution, suspicious flagging, manual changes, admin changes, notifications

---

## Phase 4: Backend — Lambda Handlers

### Task 17: Auth Handler

**File:** `backend/src/handlers/auth.handler.ts`

- `POST /auth/login` — validates credentials via Cognito adapter, returns session token
- Role extraction from Cognito user attributes

### Task 18: Inventory Handler

**File:** `backend/src/handlers/inventory.handler.ts`

- `GET /stores/{storeId}/inventory` — retrieves inventory from DynamoDB adapter
- RBAC: Staff, Manager, Admin (RULE-048/049/050)

### Task 19: Transaction Handler

**File:** `backend/src/handlers/transaction.handler.ts`

- `POST /stores/{storeId}/transactions` — record online sale (Staff)
- `GET /stores/{storeId}/transactions` — transaction history with filters (Manager, Admin) (FR-30)
- Validates per RULE-005-008, generates transaction_id, creates in DynamoDB

### Task 20: Sync Batch Handler

**File:** `backend/src/handlers/sync-batch.handler.ts`

- `POST /stores/{storeId}/sync-batches` — register a sync batch reference after S3 confirmation
- `GET /stores/{storeId}/sync-status` — current pending/sync status

### Task 21: Ingestion Lambda Handler

**File:** `backend/src/handlers/ingestion.handler.ts`

Implements architecture.md §6:
- Triggered by S3 event
- Validates batch reference
- Creates SQS FIFO message with `MessageGroupId = store_id`
- SQS message payload: `{ batch_id, store_id, s3_bucket, s3_key }` (§4.2)
- Uses batch_id as deduplication ID for idempotent ingestion

### Task 22: Processing Lambda Handler

**File:** `backend/src/handlers/processing.handler.ts`

Implements architecture.md §6-9:
- Triggered by SQS FIFO queue
- Retrieves batch from S3 via adapter
- Calls Transaction Replay Service
- Initiates Step Functions workflow via adapter

### Task 23: Step Functions Workflow Definition

**File:** `backend/src/handlers/step-functions/`

Defines the state machine (architecture.md §4.8):
1. Validate + Replay transactions
2. Reconcile inventory (conditional writes)
3. Parallel: Conflict checks + Suspicious activity rules
4. Consolidate outcome
5. Persist final state
6. SNS/SES if needed

Step handler files:
- `validate-replay.handler.ts`
- `reconcile.handler.ts`
- `conflict-check.handler.ts`
- `suspicious-activity-check.handler.ts`
- `consolidate-outcome.handler.ts`
- `notify.handler.ts`

### Task 24: Dashboard & Admin Handlers

**Files:**
- `backend/src/handlers/dashboard.handler.ts` — `GET /dashboard/summary` (FR-26)
- `backend/src/handlers/conflict.handler.ts` — `GET /conflicts`, `POST /conflicts/{conflictId}/resolve` (RULE-030/031)
- `backend/src/handlers/suspicious-activity.handler.ts` — `GET /suspicious-activity`, `POST /suspicious-activity/{alertId}/review`
- `backend/src/handlers/admin.handler.ts` — `POST /admin/thresholds`, `POST /admin/dlq/{batchId}/requeue`

### Task 25: DynamoDB Stream Consumer

**File:** `backend/src/handlers/stream-consumer.handler.ts`

Implements architecture.md §4.7:
- Consumes DynamoDB Streams events
- Publishes WebSocket messages per §16.3:
  - `inventory.updated`, `conflict.created`, `suspicious_activity.flagged`, `store.connectivity_changed`, `sync_batch.status_changed`
- Also triggers low-stock evaluation on inventory changes

### Task 26: WebSocket Connection Manager

**File:** `backend/src/handlers/websocket.handler.ts`

- `$connect` — authenticate and store connection ID
- `$disconnect` — remove connection ID
- `$default` — handle incoming messages
- Connection store in DynamoDB (simple connections table)

---

## Phase 5: Frontend — Design System & Layout

### Task 27: Tailwind Configuration & Design Tokens

**File:** `frontend/tailwind.config.ts`, `frontend/src/index.css`

Implements design.md §3-5 exactly:
- All color tokens from §3.2–3.8 (light + dark mode)
- Semantic sync-state colors from §3.9
- Typography scale with Plus Jakarta Sans, Inter, JetBrains Mono (§4)
- Border radius scale: `sm: 4px`, `DEFAULT: 8px`, `md: 12px`, `lg: 16px`, `xl: 24px`, `full: 9999px`
- Shadow tokens from §5.2
- Brand gradient from §3.8
- Spacing from §5.4

### Task 28: Shared UI Components

**Files:** `frontend/src/components/ui/`

Core components matching design.md §8:
- `Button.tsx` — primary (mint), secondary (pink), tertiary (lavender), outline, destructive variants
- `Card.tsx` — with optional gradient header wash
- `StatusPill.tsx` — sync-state colors from §3.9 with icon + label (accessibility)
- `DataTable.tsx` — dense tables per §8 spec
- `SearchInput.tsx` — 40/44px height, focus glow ring
- `MetricCard.tsx` — count-up animation, tabular-nums
- `GlassPanel.tsx` — glassmorphism for login, navbar, modals
- `Toast.tsx` — slide-in alerts with progress bar
- `Skeleton.tsx` — shimmer loading with brand gradient
- `SidebarItem.tsx` — active pill highlight

### Task 29: Layout Shell

**Files:**
- `frontend/src/components/layout/AppLayout.tsx` — sidebar + glass top bar + main content
- `frontend/src/components/layout/Sidebar.tsx` — solid `surface-container` background, role-based nav
- `frontend/src/components/layout/TopBar.tsx` — glass effect on scroll
- `frontend/src/components/layout/OfflineBanner.tsx` — height + fade transition (§6)

---

## Phase 6: Frontend — IndexedDB & Offline POS

### Task 30: IndexedDB Service

**File:** `frontend/src/services/indexeddb.service.ts`

Implements architecture.md §3.2 and AGENTS.md §5:
- Uses `idb` library for typed IndexedDB access
- Stores: `transactions`, `syncBatches`, `localInventory`, `deviceConfig`
- Transaction schema matches shared types with local sync state
- Persists across restarts (NFR-04)
- `addTransaction(tx)` — saves with device-local sequence
- `getPendingTransactions()` — returns unsynced transactions
- `markSyncing(batchId, txIds)` — only after S3 confirmation (Guarantee 1)
- `markSynced(batchId)` / `markSyncFailed(batchId)`
- Generates globally unique `transaction_id` using UUID (architecture.md §7.2)
- Maintains device-scoped `device_sequence` counter

### Task 31: Connectivity Detection Hook

**File:** `frontend/src/hooks/useConnectivity.ts`

- Monitors `navigator.onLine` + periodic health check
- Exposes store connectivity state: `ONLINE / OFFLINE / SYNCING / SYNC_FAILED`
- Triggers sync when connectivity restores (FR-08)
- Visible status to user (FR-06, RULE-004)

### Task 32: Sync Service

**File:** `frontend/src/services/sync.service.ts`

Implements architecture.md §5 (Steps 5-6) and Upload Reliability Guarantees (§13):
- `createSyncBatch(pendingTxs)` — groups pending transactions with unique batch_id
- `uploadBatch(batch)` — uploads to S3 via API, waits for confirmation
- **Guarantee 1:** marks `SYNCING` only after S3 upload confirmed
- **Guarantee 2:** failed uploads keep transactions `PENDING`
- **Guarantee 3:** ambiguous uploads retry with same batch_id and transaction_ids
- Retry with exponential backoff (RULE-012)
- Never creates duplicate transactions on retry (RULE-012)

### Task 33: POS Page

**File:** `frontend/src/pages/POS.tsx`

The primary offline-capable store interface (design.md §7.2, page 4):
- Product selection grid/search
- Quantity input with validation (RULE-006)
- Sale recording — works offline (RULE-003)
- Clear status: "Stored locally" vs "Cloud processed" (RULE-004)
- Pending transaction count badge
- Offline mode banner (component from design.md §7.2 page 8)
- Device-local sequence tracking

---

## Phase 7: Frontend — Dashboard & Pages

### Task 34: Auth Pages

**Files:**
- `frontend/src/pages/Login.tsx` — glass card over brand gradient with blurred orbs (design.md §5.1)
- `frontend/src/pages/SignUp.tsx` — invite acceptance flow
- `frontend/src/pages/Onboarding.tsx` — role/store node onboarding
- `frontend/src/services/auth.service.ts` — Cognito adapter stub with TODO

### Task 35: Store Dashboard

**File:** `frontend/src/pages/StoreDashboard.tsx`

Implements FR-26/27 and design.md §7.3 page 9:
- Stat cards with count-up animation (§6): total inventory, pending sync, conflicts, suspicious activity
- Reconciliation progress donut with brand gradient stroke
- Store connectivity status with live pulse dot
- Recent activity feed
- Low-stock alerts section
- Click-through drill-down (FR-27)

### Task 36: Transaction History

**File:** `frontend/src/pages/TransactionHistory.tsx`

Implements FR-30/31 and design.md §7.3 page 10:
- Filterable data table: store, product, date, status, sync status (FR-30)
- Transaction traceability: CREATED → PENDING → SYNCING → ... → COMPLETED (FR-31)
- Conflict rows with blush tint + slow pulse border (§6)
- Monospace for transaction/batch IDs (JetBrains Mono)

### Task 37: Conflict Resolution Page

**File:** `frontend/src/pages/ConflictResolution.tsx`

Implements FR-16/17/18 and design.md §7.3 page 11:
- Conflict list with status pills (OPEN/UNDER_REVIEW/RESOLVED/ESCALATED)
- Conflict detail: store, product, expected vs actual, difference, related transactions
- Resolution form with reason/comment (RULE-031)
- Only Manager/Admin can resolve (RULE-030)

### Task 38: Suspicious Activity Page

**File:** `frontend/src/pages/SuspiciousActivity.tsx`

Implements FR-19/20 and design.md §7.3 page 12:
- Suspicious activity list with FLAGGED/REVIEWED status
- Detail view: triggered rule, transactions, store, quantity
- Review action for Manager/Admin (RULE-038)
- Clear messaging: "requires attention", not "fraud" (RULE-037)

### Task 39: HQ Multi-Store Pages

**Files:**
- `frontend/src/pages/HQDashboard.tsx` — multi-store connectivity grid (design.md §7.4 page 15)
- `frontend/src/pages/GlobalInventory.tsx` — SKU directory (page 16)
- `frontend/src/pages/StockTransfer.tsx` — dispatch manifest (page 17)
- `frontend/src/pages/TeamAccess.tsx` — workstation governance (page 18)
- `frontend/src/pages/SystemSettings.tsx` — rule thresholds + dark mode (page 19, RULE-033)
- `frontend/src/pages/HQReports.tsx` — reports & compliance (page 20)
- `frontend/src/pages/DLQInvestigation.tsx` — failed batch investigation (page 21)

### Task 40: Remaining Pages

**Files:**
- `frontend/src/pages/PendingTransactions.tsx` — offline queue view (page 5)
- `frontend/src/pages/StoreReports.tsx` — shift reconciliation (page 13)
- `frontend/src/pages/ProductDetail.tsx` — batch traceability ledger (page 14)
- `frontend/src/pages/SupplierPortal.tsx` — restocking/ASN portal (page 22)
- `frontend/src/pages/NotificationsCenter.tsx` — alert slide-over drawer (page 23)
- `frontend/src/pages/SettingsProfile.tsx` — operator profile (page 24)
- `frontend/src/pages/SystemHealth.tsx` — empty states (page 25)
- `frontend/src/pages/ErrorPages.tsx` — 403, 404, sync error, generic error (page 27)

### Task 41: Routing & Role-Based Navigation

**File:** `frontend/src/router.tsx`

- React Router v6 with role-based route guards
- Staff → POS, Pending Queue, limited dashboard
- Manager → Store dashboard, transactions, conflicts, suspicious, reports
- Admin → All manager views + HQ pages, settings, DLQ
- Supplier → Supplier portal only
- Redirect unauthorized access to 403

### Task 42: WebSocket Hook for Live Updates

**File:** `frontend/src/hooks/useWebSocket.ts`

- Connects to API Gateway WebSocket API (stubbed URL)
- Handles message types from §16.3
- On `inventory.updated` → update local state
- On `conflict.created` → show toast notification
- On `suspicious_activity.flagged` → show toast
- Reconnect logic: on disconnect, re-fetch via HTTP API (§4.1.1)

---

## Phase 8: Tests

### Task 43: Transaction State Machine Tests

**File:** `tests/backend/transaction-lifecycle.test.ts`

Per AGENTS.md §9 — covers state machine exception paths:
- Happy path: `CREATED → PENDING → SYNCING → PROCESSING → RECONCILED → COMPLETED`
- Exception: `PROCESSING → CONFLICT → MANUAL_REVIEW → RESOLVED`
- Exception: `PROCESSING → FLAGGED → REVIEWED`
- Exception: `PROCESSING → REJECTED`
- Sync failure: `SYNCING → SYNC_FAILED → RETRY → PENDING`
- DLQ path: `PROCESSING → retry limit → DLQ → ADMIN_INVESTIGATION`

### Task 44: Idempotency Tests

**File:** `tests/backend/idempotency.test.ts`

Per AGENTS.md §9 — duplicate/replay cases:
- Same transaction_id processed twice → no duplicate inventory effect (RULE-015/019)
- Same batch_id submitted twice → no duplicate processing (RULE-014)
- Conditional write with stale version → conflict, not silent overwrite
- Retry after processing failure → picks up where left off, no duplication

### Task 45: Inventory Reconciliation Tests

**File:** `tests/backend/inventory-reconciliation.test.ts`

- Normal sale: `stock = 50, sale = 5 → stock = 45` (RULE-022)
- Oversell detection: `stock = 3, sale = 5 → CONFLICT`, not `-2` (RULE-023)
- Version mismatch: conditional write fails → re-read + retry or conflict
- Concurrent writes: two transactions on same product → second uses versioned write
- Multi-device scenario: two devices sell last unit → explicit conflict (memory.md "Oversell Policy")

### Task 46: Suspicious Activity Rule Tests

**File:** `tests/backend/suspicious-activity.test.ts`

- Excessive quantity: `quantity > threshold → FLAGGED` (RULE-034)
- Repeated unusual: `count >= threshold in window → FLAGGED` (RULE-035)
- Repeated reversals: `reversals >= threshold in window → FLAGGED` (RULE-036)
- Below threshold: no flag
- Configurable thresholds: changing config changes behavior

### Task 47: Validation Tests

**File:** `tests/backend/transaction-validation.test.ts`

- Missing required fields → rejection (RULE-005)
- Invalid quantity (0, negative, non-numeric) → rejection (RULE-006)
- Unknown product_id → exception (RULE-007)
- Unauthorized store → rejection (RULE-008)
- Valid transaction → passes all checks

---

## Phase 9: AWS Setup Guide & Documentation

### Task 48: AWS_SETUP_GUIDE.md

**File:** `reconcilo/AWS_SETUP_GUIDE.md`

A dedicated, beginner-friendly, step-by-step guide covering every AWS service in architecture.md §4 — in the order they need to come online:

1. **DynamoDB** — create all 10 tables with exact PK/SK from §16.1
2. **S3** — create the sync-batch bucket with event notifications
3. **Cognito** — user pool, app client, user groups for roles
4. **SQS** — FIFO queue + DLQ with configuration
5. **SNS** — topic for operational alerts
6. **SES** — verify email addresses for reports
7. **Lambda** — create functions, set environment variables, connect triggers
8. **API Gateway** — HTTP API + WebSocket API, routes to Lambda
9. **Step Functions** — state machine definition
10. **CloudWatch** — log groups, alarms, dashboard
11. **DynamoDB Streams** — enable on tables, connect stream consumer Lambda

Each service section includes:
- Plain-language explanation of what the service does
- Numbered click-by-click console steps
- Exact values to copy (ARNs, table names, URLs)
- Exact file + variable name where each value goes in the codebase
- "How do I know this worked?" verification check

### Task 49: Update memory.md

Update `memory.md` implementation status to reflect all completed work.

---

## Verification Plan

### Automated Tests
```bash
cd reconcilo
npm run test                    # Vitest — all backend + shared tests
npm run lint                    # TypeScript type checking
npm run build                   # Frontend builds successfully
```

### Manual Verification
- `npm run dev` starts the frontend dev server
- Navigate through all pages — login, POS, dashboard, transactions, conflicts, etc.
- Test offline mode: disconnect network, record sales, verify they persist in IndexedDB
- Reconnect: verify sync flow initiates (even if stub returns mock response)
- Verify dark mode toggle works with all design tokens
- Verify role-based navigation shows/hides correct pages

> [!IMPORTANT]
> **No conflicts detected** between the seven specification documents. All canonical vocabulary, state machines, schema definitions, and business rules are consistent across `architecture.md`, `projectrequirements.md`, `rules.md`, and `memory.md`. The design.md palette is a standalone visual spec with no domain-rule overlap.

> [!NOTE]
> **Skill applicability notes:** The `ui-styling` skill recommends shadcn/ui, but AGENTS.md §4 locks the stack to React + Vite + Tailwind CSS. Since design.md provides its own complete component spec (§8), I'll build custom components matching those specs rather than using shadcn/ui defaults — this avoids any style conflict. The `test-driven-development` skill requires failing tests first; given the scale of this build, I'll apply TDD to the critical business-logic services (reconciliation, idempotency, replay) and write integration tests for the rest.
