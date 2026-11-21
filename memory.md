# Project Memory

## Project Identity

**Project:** Offline-First, Event-Driven Inventory Reconciliation System for Distributed Retail Stores.

The project is a serverless, event-driven inventory system designed for retail environments where stores may temporarily lose internet connectivity but must continue recording sales.

The central idea is:

```text
Internet Down
      ↓
Sales Continue Offline
      ↓
Transactions Stored Locally
      ↓
Internet Restored
      ↓
Sync Batch Uploaded
      ↓
S3
      ↓
Ingestion Lambda
      ↓
SQS FIFO
      ↓
Ordered Processing
      ↓
Transaction Replay
      ↓
Inventory Reconciliation
      ↓
Conflict / Suspicious-Activity Checks
      ↓
Persist Final State
      ↓
SNS / SES
      ↓
Real-Time Dashboard
```

---

# Core Problem

Traditional centralized inventory systems assume continuous connectivity. In a distributed retail environment, a temporary outage should not prevent a store from completing sales.

The system therefore separates:

- **local transaction recording**, which must work offline,
- from **central inventory reconciliation**, which occurs after synchronization.

The system does not simply upload a final stock number. It preserves and replays individual transactions so that the cloud can determine how inventory should have changed and identify conflicts.

---

# Architectural Principles

1. Offline operation must not depend on cloud connectivity.
2. A transaction must not be considered synchronized merely because an upload was started.
3. S3 upload confirmation is required before the local transaction state becomes `SYNCING`.
4. Failed/interrupted uploads remain recoverable.
5. S3 event delivery is an ingestion trigger, not an ordering guarantee.
6. SQS FIFO provides deterministic per-store batch serialization.
7. `store_id` is used as the SQS FIFO `MessageGroupId`.
8. Different stores may process concurrently.
9. Local sequence numbers are scoped to individual devices.
10. `transaction_id` must be globally unique and must not rely only on store + local sequence.
11. DynamoDB conditional/versioned writes provide defense-in-depth against stale concurrent updates.
12. Exact physical ordering between independently offline devices must not be guessed when it materially affects correctness.
13. Unresolvable ordering ambiguity becomes an explicit conflict.
14. Offline overselling must not silently create negative authoritative inventory.
15. Reprocessing must be idempotent.
16. Repeated processing failures must eventually reach the DLQ and become visible to an administrator.
17. DLQ batches must have a defined requeue/reprocessing path.
18. DynamoDB is the authoritative persisted business state.
19. DynamoDB Streams observes committed state changes.
20. WebSocket messages are dashboard update notifications, not the authoritative source of state.
21. Step Functions orchestrates multi-stage reconciliation rather than placing all orchestration logic in one Lambda.
22. Rule-based suspicious-activity detection is deterministic and is not machine learning.

---

# Technology Stack

## Frontend

- React.js
- Vite
- TypeScript
- Tailwind CSS
- IndexedDB for offline persistence

## AWS

- Amazon S3 — sync-batch storage
- AWS Lambda — serverless compute
- Amazon SQS FIFO — ordered per-store processing
- Amazon SQS DLQ — failed-message recovery
- Amazon DynamoDB — authoritative application state
- DynamoDB Streams — committed-state change events
- Amazon API Gateway HTTP API — request/response APIs
- Amazon API Gateway WebSocket API — live dashboard push updates
- AWS Step Functions — workflow orchestration
- Amazon SNS — immediate operational alerts
- Amazon SES — formal/detailed email
- Amazon Cognito — authentication
- Amazon CloudWatch — logs, metrics, alarms, and monitoring
- AWS SAM — infrastructure as code

## Development

- Node.js
- TypeScript
- JSON
- Git
- GitHub

---

# Core Identifiers

Every transaction/batch flow must preserve these identifiers:

### `store_id`

Identifies the retail store.

Used as the SQS FIFO `MessageGroupId` so that batches from the same store are serialized.

### `device_id`

Identifies the POS device that created a transaction.

A local sequence number is meaningful only within that device.

### `transaction_id`

Globally unique identifier for an individual transaction.

Do not construct it only as:

```text
store_id + local_sequence
```

because multiple devices can generate the same local sequence.

### `batch_id`

Identifies a synchronization batch.

The same `batch_id` should be reused when an ambiguous or failed upload is retried.

This enables cloud-side idempotency and traceability.

---

# Transaction Lifecycle

The canonical transaction lifecycle is:

```text
CREATED
   ↓
PENDING
   ↓
SYNCING
   ↓
PROCESSING
   ↓
RECONCILED
   ↓
COMPLETED
```

Exception paths include:

```text
PROCESSING → CONFLICT
PROCESSING → FLAGGED
PROCESSING → REJECTED
```

Synchronization failure returns the transaction to a recoverable pending state.

```text
PROCESSING
      ↓
Repeated processing failure
      ↓
SQS DLQ
      ↓
ADMIN_INVESTIGATION
      ↓
Correct / requeue
      ↓
SQS FIFO
      ↓
Reprocess
```

```text
PROCESSING / RECONCILIATION
      ↓
Business conflict
      ↓
CONFLICT / MANUAL_REVIEW
```

```text
PROCESSING
      ↓
Suspicious rule triggered
      ↓
FLAGGED / REVIEW
```

---

# Offline POS Rules

While offline:

- POS must remain usable.
- Sales are recorded locally.
- Transactions are persisted in IndexedDB.
- Each transaction receives a globally unique transaction ID.
- Each device maintains its own local sequence.
- Connectivity state is visible to the user.
- Pending transactions remain available after application restart.

The local POS must not pretend that the central inventory has been updated while the device is offline.

---

# Synchronization Rules

When connectivity returns:

```text
Detect pending transactions
        ↓
Create sync batch
        ↓
Attempt S3 upload
        ↓
Upload confirmed?
   ┌────┴────┐
  Yes       No
   ↓         ↓
SYNCING    PENDING /
           UPLOAD_FAILED
              ↓
            Retry
```

Important distinction:

**Upload started ≠ upload confirmed.**

Only confirmed receipt in S3 should allow the local state to progress to `SYNCING`.

If an upload result is ambiguous, retry using the same batch and transaction identifiers.

---

# SQS FIFO Rules

SQS FIFO is the per-store serialization mechanism.

```text
MessageGroupId = store_id
```

Therefore:

```text
Store A
Batch A1 → Batch A2 → Batch A3

Store B
Batch B1 → Batch B2

Store C
Batch C1 → Batch C2
```

Same-store batches are serialized.

Different stores may process concurrently.

The SQS message should contain a reference to the S3 batch rather than the entire transaction data:

```text
{
  batch_id,
  store_id,
  s3_bucket,
  s3_key
}
```

This avoids depending on the 256 KB SQS message-size limit.

---

# Ordering Model

There are two different ordering concepts.

## Device-Local Ordering

Each POS device has its own local sequence:

```text
Device A:
1 → 2 → 3 → 4

Device B:
1 → 2 → 3
```

Device A sequence 4 has no inherent relationship to Device B sequence 1.

## Cloud Processing Ordering

SQS FIFO serializes batches for the same store.

This provides deterministic processing order at the store-message-group level.

## Unknown Physical Ordering

If two devices were independently offline, the system may not know which transaction physically happened first.

Timestamps can provide supporting metadata, but they must not be treated as a guaranteed reconstruction of physical event order.

If the difference affects correctness and cannot be resolved safely, create a conflict instead of guessing.

---

# Inventory Reconciliation

DynamoDB contains the authoritative persisted inventory state.

The processing logic:

```text
Read authoritative state
        ↓
Replay transaction
        ↓
Calculate expected state
        ↓
Validate business constraints
        ↓
Conditional/versioned write
```

If the conditional write succeeds, processing continues.

If it fails:

```text
Conditional write failed
        ↓
Re-read current state
        ↓
Recalculate
        ↓
Retry safely
```

The system must never silently overwrite a newer inventory state.

---

# Oversell Policy

Offline devices can independently sell the final unit.

Example:

```text
Central stock = 1

Device A offline → sells 1
Device B offline → sells 1
```

When both synchronize, both cannot safely consume the same final unit.

The system must:

- preserve both transactions,
- prevent silent negative authoritative stock,
- identify the oversell,
- create an explicit conflict,
- notify an authorized reviewer,
- allow human resolution.

---

# Conflict Types

Examples include:

- `OVERSOLD`
- invalid product
- invalid store
- invalid quantity
- stale inventory version
- unresolved ordering ambiguity
- other explicitly defined business-rule violations

Not every duplicate delivery is a business conflict.

If the same batch is received again and idempotency confirms that its outcome has already been recorded, it should not apply the inventory effect again.

---

# Suspicious-Activity Rules

Suspicious activity is detected using deterministic rules.

Examples:

- unusually high quantity,
- unusually high transaction frequency,
- repeated invalid attempts,
- unusual refund/void patterns,
- other configured thresholds.

This is **rule-based detection**, not machine learning.

A flagged transaction is suspicious, not automatically proven fraudulent.

Human review is required for high-impact decisions.

---

# Step Functions

AWS Step Functions coordinates the reconciliation workflow.

Conceptually:

```text
Validate / Replay
       ↓
Reconcile
       ↓
Parallel Checks
  ↙          ↘
Conflict   Suspicious
Checks     Rules
  ↘          ↙
 Consolidate
       ↓
Persist Outcome
       ↓
Notify / Publish Dashboard Event
```

Step Functions is responsible for workflow-level:

- sequencing,
- parallel execution,
- retries,
- timeouts,
- failure transitions.

Individual Lambda functions should remain focused on specific responsibilities.

---

# Real-Time Dashboard

The dashboard has two communication mechanisms.

## HTTP API

Used for:

- initial page loading,
- explicit queries,
- historical data,
- user actions,
- authoritative state retrieval.

## WebSocket

Used for:

- inventory changes,
- reconciliation completion,
- conflict events,
- suspicious-activity events,
- other important committed-state updates.

Flow:

```text
DynamoDB
    ↓
DynamoDB Streams
    ↓
Stream Consumer Lambda
    ↓
API Gateway WebSocket
    ↓
Dashboard
```

DynamoDB remains the source of truth.

If a client disconnects, it should reconnect and fetch current state through the HTTP API.

---

# Notifications

## SNS

For immediate operational alerts:

- low stock,
- suspicious activity,
- store offline/sync failure,
- conflict,
- processing failure,
- DLQ event.

## SES

For detailed communication:

- reconciliation report,
- conflict report,
- inventory report,
- supplier restocking request.

SNS and SES have intentionally different responsibilities.

---

# Failure and Recovery

## Upload Failure

```text
Upload attempt
      ↓
Failure/interruption
      ↓
Remain PENDING / UPLOAD_FAILED
      ↓
Retry
```

## Processing Failure

```text
Processing failure
      ↓
SQS retry with backoff
      ↓
Retry limit reached
      ↓
DLQ
      ↓
SNS alert
      ↓
Admin investigation
      ↓
Correct issue
      ↓
Requeue original batch
      ↓
SQS FIFO
      ↓
Reprocess
```

Reprocessing must use the original identifiers so that idempotency prevents duplicate inventory effects.

---

# Security

Authentication is handled through Amazon Cognito.

Role-based authorization should distinguish responsibilities such as:

- POS/store user,
- store manager,
- administrator.

High-impact operations such as conflict resolution and DLQ requeue must require appropriate authorization.

IAM policies should follow least privilege.

---

# Auditability

Important operations should retain:

- transaction ID,
- batch ID,
- store ID,
- device ID,
- timestamps,
- processing state,
- reconciliation result,
- conflict reason,
- suspicious rule triggered,
- retry count,
- failure reason,
- resolution information,
- administrative action where applicable.

The system should make it possible to trace a transaction from local creation through synchronization, processing, reconciliation, and final outcome.

---

# Serverless Definition

The project is serverless because it uses fully managed AWS services and does not require the team to provision or maintain traditional application servers.

Core serverless services include:

- Lambda,
- S3,
- DynamoDB,
- API Gateway,
- SQS,
- SNS,
- SES,
- Step Functions,
- CloudWatch.

AWS manages the underlying infrastructure, scaling, and service availability.

---

# What Is Novel

The novelty should not be claimed as "using AWS."

The meaningful project contribution is the combination of:

1. offline-first transaction recording,
2. durable synchronization after reconnection,
3. transaction-level replay,
4. per-store ordered event processing,
5. deterministic inventory reconciliation,
6. explicit handling of offline overselling and other conflicts,
7. rule-based suspicious-activity detection,
8. automated operational notifications,
9. real-time reconciliation monitoring.

The project is best described as an **offline-first, event-driven inventory reconciliation system for distributed retail stores**.

---

# Project Scope Boundaries

The system does not attempt to:

- predict fraud using machine learning,
- reconstruct unknowable physical event order with certainty,
- silently resolve material inventory conflicts by guessing,
- treat suspicious activity as proven fraud,
- use a traditional always-running backend server,
- put full transaction batches into SQS messages.

The system instead favors deterministic processing, explicit conflicts, recoverability, and human review where necessary.

---

# Specification Hierarchy

The project uses four complementary documents:

### `main.md`

Defines:

- project concept,
- problem,
- objectives,
- users,
- major features,
- novelty,
- high-level explanation.

### `projectrequirements.md`

Defines:

- functional requirements,
- non-functional requirements,
- user journeys,
- priorities,
- definition of done.

### `architecture.md`

Defines:

- AWS architecture,
- service responsibilities,
- data flow,
- ordering,
- concurrency,
- synchronization,
- reconciliation,
- failure recovery,
- live updates,
- orchestration.

### `rules.md`

Defines:

- deterministic business rules,
- transaction rules,
- synchronization rules,
- ordering rules,
- inventory rules,
- conflict rules,
- suspicious-activity rules,
- security/audit rules.

Implementation status and next-work tracking are maintained in this `memory.md`.

No implementation work should contradict the other four specification documents.

---

# Project Progress & Implementation Continuity

## Current Overall Status

**Stage: Design/specification completed → implementation in Google Antigravity is next.**

The project is currently **implementation-ready**, but the application itself is not yet considered fully implemented or deployed.

### Completed

- Project concept and problem definition.
- Functional and non-functional requirements.
- Detailed serverless AWS architecture.
- Deterministic business/system rules.
- Offline-first transaction model.
- Device-scoped local sequencing.
- Globally unique transaction identity.
- S3-based synchronization model.
- SQS FIFO per-store serialization.
- DynamoDB authoritative-state model.
- DynamoDB conditional/versioned write strategy.
- Idempotent transaction replay.
- Explicit offline oversell handling.
- Explicit conflict/manual-review handling.
- Rule-based suspicious-activity detection.
- Step Functions reconciliation orchestration.
- DynamoDB Streams committed-state event model.
- WebSocket live dashboard update model.
- HTTP API initial-load/history/action/resync model.
- SNS operational-alert responsibilities.
- SES detailed-report responsibilities.
- DLQ investigation and requeue/reprocessing path.
- Cognito/RBAC and audit requirements.
- CloudWatch observability requirements.
- Serverless scope and architectural boundaries.
- The main specification documents: `main.md`, `projectrequirements.md`, `architecture.md`, `rules.md`, and `memory.md`.
- **Live AWS Core Services Provisioned & Connected (Account `319426459693`, `us-east-1`):**
  - **Amazon DynamoDB:** All 10 authoritative tables created (`Stores`, `Users`, `Products`, `Inventory`, `Transactions`, `SyncBatches`, `Conflicts`, `SuspiciousActivity`, `Notifications`, `AuditRecords`) with On-Demand billing, Streams `NEW_AND_OLD_IMAGES`, and `store_id-created_at-index` GSI.
  - **Amazon S3:** S3 batch ingestion bucket `reconcilo-sync-batches-319426459693` with AES256 default encryption.
  - **Amazon SQS FIFO + DLQ:** `reconcilo-sync-queue.fifo` with content-based deduplication and redrive policy to `reconcilo-sync-dlq.fifo`.
  - **Amazon SNS:** Topic `reconcilo-operational-alerts` for real-time notifications.
  - **AWS Lambda & Event Source Mapping:** Function `reconcilo-inventory-reconciliation` with IAM role `reconcilo-lambda-execution-role`, directly triggered by the SQS FIFO queue.
- **Frontend & Offline POS:** All 13 screens built and tested, IndexedDB offline persistence, custom branding, and interactive notifications verified with 19/19 passing Vitest tests.


## What Is Currently Being Worked On

The active work is transitioning from **design into implementation in Google Antigravity**. Implementation should begin from the existing specification rather than redesigning already-settled architecture.

Immediate focus:
1. Repository/project foundation and AWS SAM structure.
2. Shared TypeScript types and schemas.
3. DynamoDB table/data-model implementation.
4. Offline POS transaction persistence using IndexedDB.
5. Reliable synchronization and S3 batch upload.
6. S3 ingestion Lambda and SQS FIFO processing.
7. Idempotent transaction replay and conditional/versioned inventory updates.
8. Reconciliation, conflicts, and Step Functions workflow.
9. Rule-based suspicious-activity checks.
10. DynamoDB Streams → WebSocket live dashboard updates.
11. SNS/SES notifications.
12. Cognito/RBAC, audit, CloudWatch, DLQ recovery.
13. End-to-end integration testing and deployment.

## What To Work On Next

Unless a newer explicit decision changes the order, work next in this order:

### 1. Foundation
- Establish repository structure.
- Establish AWS SAM infrastructure.
- Establish environment/configuration handling.
- Define DynamoDB tables, keys, indexes, and version fields.
- Define shared schemas/types for stores, devices, batches, transactions, inventory, conflicts, suspicious activity, and audit records.

### 2. Offline POS
- Implement local transaction creation and IndexedDB persistence.
- Generate globally unique `transaction_id` values.
- Maintain device-scoped local sequence numbers.
- Persist pending transactions across restarts.
- Implement visible connectivity/sync state.

### 3. Synchronization & Ordered Processing
- Detect pending transactions and build sync batches.
- Upload batches to S3 and mark `SYNCING` only after confirmation.
- Implement S3 event ingestion.
- Publish S3 object references to SQS FIFO with `MessageGroupId = store_id`.
- Retrieve and validate batches in the processing Lambda.
- Enforce idempotency and start the Step Functions workflow.

### 4. Inventory & Reconciliation
- Replay transactions deterministically.
- Validate business constraints.
- Use conditional/versioned DynamoDB writes and safe retries.
- Detect overselling and create explicit conflicts.
- Persist reconciliation outcomes.

### 5. Dashboard, Notifications & Reliability
- Implement Step Functions retries/timeouts/failure transitions.
- Implement rule-based suspicious-activity detection.
- Implement DynamoDB Streams → WebSocket updates and HTTP resync.
- Implement SNS operational alerts and SES detailed reports.
- Implement DLQ investigation and authorized requeue.

### 6. Security, Testing & Deployment
- Implement Cognito/RBAC and audit records.
- Add CloudWatch logs, metrics, and alarms.
- Test duplicates, retries, multi-device concurrency, overselling, ordering ambiguity, partial failures, reconnects, and DLQ recovery.
- Deploy and perform end-to-end validation.

## Implementation Status Checklist

| Area | Status |
|---|---|
| Project concept | ✅ Completed |
| Requirements | ✅ Completed |
| Architecture | ✅ Completed |
| Rules | ✅ Completed |
| Project memory | ✅ Maintained |
| Repository implementation | ✅ Completed (Monorepo with shared, backend, frontend, infrastructure) |
| Offline POS | ✅ Completed (IndexedDB persistence, UUID transaction_id, sequence counter) |
| Synchronization | ✅ Completed (SyncService with Guarantees 1, 2, 3) |
| S3 ingestion | ✅ Completed (Ingestion Lambda handler + S3 adapter) |
| SQS FIFO processing | ✅ Completed (Processing Lambda handler + SQS FIFO/DLQ adapter) |
| Inventory reconciliation | ✅ Completed (InventoryReconciliationService with versioned writes & oversell check) |
| Step Functions workflow | ✅ Completed (Live AWS State Machine `reconcilo-reconciliation-workflow` verified & execution tested) |
| Conflict handling | ✅ Completed (ConflictDetectionService + ConflictResolution UI) |
| Suspicious-activity rules | ✅ Completed (SuspiciousActivityService for excessive qty & reversals + UI) |
| Live WebSocket dashboard | ✅ Completed (DynamoDB Streams consumer + WebSocket handler + React hook) |
| SNS/SES notifications | ✅ Completed (NotificationService + live SES verified identity `garvitaahuja196@gmail.com` + live SNS topic subscription) |
| Cognito/RBAC | ✅ Completed (Live Cognito User Pool `us-east-1_mE0tTLTP4` + Client `275ghkpn1v68cieuvl1kdjr11g` + 4 RBAC groups + 4 seeded accounts + Frontend direct browser auth) |
| Audit/CloudWatch | ✅ Completed (Live CloudWatch Alarms: Lambda errors + SQS DLQ + live MetricData logging) |
| DLQ recovery | ✅ Completed (AdminHandler requeue endpoint + DLQ triage UI page) |
| Integration testing | ✅ Completed (25/25 Vitest unit & concurrency stress tests passing) |
| API Gateway | ✅ Completed (Live HTTP API `krhvqkmo51` with CORS + Lambda proxy integration & tested) |
| End-of-Day (EOD) Rollup | ✅ Completed (Automated midnight EventBridge cron + EODRollupService + register discrepancy audit + manager signoff UI) |
| Multi-Station Stress Testing | ✅ Completed (Vitest concurrency suite + 300-tx 15-station CLI benchmark script testing SQS FIFO store partitioning & versioned locks) |
| Barcode Input | ✅ Completed (Software/virtual browser-native barcode simulation; physical USB/serial hardware scanners omitted by user scope) |
| AWS deployment setup guide | ✅ Completed (AWS_SETUP_GUIDE.md inline & sequential reference guide) |
| Comprehensive Project Report | ✅ Completed (PROJECT_REPORT.md executive & technical review document) |

## Mandatory Antigravity Memory Update Rule

**`memory.md` is the living source of project progress and continuity.**

Whenever the Antigravity agent makes a **meaningful project change**, it must update `memory.md` as part of the same work session/change.

A meaningful change includes creating/deleting/renaming or materially modifying files; implementing features/components; changing AWS configuration, schemas, APIs, event payloads, synchronization, replay, ordering, concurrency, idempotency, inventory/reconciliation/conflict logic, suspicious-activity rules, Step Functions, WebSocket/dashboard, SNS/SES, authentication/authorization/audit/security, infrastructure, dependencies; fixing important bugs; discovering important edge cases; completing milestones; or changing current/next work.

### Required Update Content
After a meaningful change, `memory.md` must record:
1. **What changed**
2. **Why it changed**
3. **Files/components affected**
4. **Current implementation status**
5. **New constraints or architectural decisions**
6. **Known issues or remaining work**
7. **What should be worked on next**

### Before Starting Work
The Antigravity agent must:
1. Read `memory.md`.
2. Check current implementation status, current work, and next work.
3. Follow established architecture/rules unless an explicit new decision overrides them.
4. If `memory.md` conflicts with `architecture.md`, `rules.md`, or `projectrequirements.md`, resolve the specification conflict first rather than silently choosing one.

### After Finishing Work
The Antigravity agent must:
1. Update `memory.md`.
2. Update completed/current/next status.
3. Record important implementation decisions and discoveries.
4. Record affected files/components.
5. Record remaining issues.
6. If architecture/business rules changed, update the appropriate detailed specification file and then update `memory.md` to reflect the new source of truth.

### Continuity Principle
**Never leave `memory.md` describing an older project state after making a meaningful implementation change.** A new Antigravity session must be able to understand what has been built, what decisions were made, what is currently being built, what remains, what changed recently, and exactly what should be done next.
