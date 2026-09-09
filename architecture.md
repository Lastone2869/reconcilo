# Offline-First Event-Driven Inventory Reconciliation System
## System Architecture and Workflow Specification

## 1. Purpose

This document defines the technical architecture, component responsibilities, data flow, processing workflow, failure handling, and integration boundaries for the Offline-First Event-Driven Inventory Reconciliation System.

The architecture is designed around five principles:

1. Stores must continue recording sales during temporary internet outages.
2. Offline transactions must be synchronized reliably after connectivity returns.
3. Cloud processing must replay transactions in a deterministic sequence.
4. Concurrent batches for the same store must be serialized or safely coordinated so inventory updates cannot be lost.
5. High-impact exceptions should be surfaced to human users rather than silently resolved.

The system uses a serverless AWS architecture and an event-driven processing model.

---

## 2. High-Level Architecture

```text
                    ┌─────────────────────────────┐
                    │        Store User           │
                    │   Staff / Store Manager     │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │      Store Web Application   │
                    │  POS / Inventory Interface   │
                    └──────────────┬──────────────┘
                                   │
                         ┌─────────┴─────────┐
                         │                   │
                  Internet Available   Internet Unavailable
                         │                   │
                         ▼                   ▼
                Cloud API Request      Local Transaction
                         │                Storage/Queue
                         │                   │
                         │             Connection Restored
                         │                   │
                         └─────────┬─────────┘
                                   ▼
                         ┌───────────────────┐
                         │    Amazon S3      │
                         │ Transaction Logs  │
                         └─────────┬─────────┘
                                   │ S3 Event
                                   ▼
                         ┌───────────────────┐
                         │  Ingestion Lambda │
                         │ Validate / Enqueue│
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │ SQS FIFO Queue    │
                         │ Message Group =   │
                         │ Store ID           │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │ Processing Lambda  │
                         │ Replay/Reconcile   │
                         └─────────┬─────────┘
                                   │
                                   ▼
            ┌───────────────────┐
            │  AWS Step         │
            │  Functions        │
            └─────────┬─────────┘
                      │
             ┌────────┴────────┐
             ▼                 ▼
      Conflict /           Rule-Based
      Consistency          Suspicious
      Checks               Activity Rules
             │                 │
             └────────┬────────┘
                      ▼
            ┌───────────────────┐
            │    DynamoDB       │
            │ Centralized State │
            └─────────┬─────────┘
                      │
             DynamoDB Streams
                      │
                      ▼
            WebSocket Dashboard

            SNS Alerts / SES Reports
```

---

## 3. Architectural Layers

### 3.1 Presentation Layer

The store-facing web application provides:

- User login
- Role-based access
- Store identification
- Sale recording
- Current inventory viewing
- Online/offline status
- Pending transaction count
- Synchronization status
- Transaction history
- Conflict review for authorized users
- Alerts and notifications
- Reports/dashboard access

The interface should remain usable when the network is unavailable for the operations that are explicitly designed to work offline.

---

### 3.2 Local Offline Layer

The local layer is responsible for temporarily storing transactions when the store cannot reach the cloud.

It should maintain:

- Transaction ID
- Store ID
- User ID
- Timestamp
- Product ID
- Quantity
- Transaction type
- Local sequence number
- Synchronization status
- Retry information

Example local transaction state:

```text
PENDING
   ↓
SYNCING
   ↓
SYNCED
```

If synchronization fails:

```text
SYNCING
   ↓
SYNC_FAILED
   ↓
RETRY
   ↓
SYNCING
```

The local layer must not delete a pending transaction merely because one synchronization attempt failed.

---

### 3.3 Technology Stack

The system uses a deliberately AWS-native, serverless stack. Each technology has a defined responsibility; components should not be substituted without an architectural reason.

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend / POS & Dashboard | React.js + Vite | Offline-capable POS interface and central inventory/reconciliation dashboard |
| Frontend Styling | Tailwind CSS | UI styling and responsive dashboard/POS layouts |
| Local Offline Storage | IndexedDB | Durable browser-side storage for transactions while a POS device is offline |
| Frontend Language | TypeScript | Type-safe frontend implementation |
| Authentication | Amazon Cognito | User authentication and role-aware access |
| API Layer | Amazon API Gateway (HTTP API) | Request/response APIs for POS sync, dashboard queries, administration, and configuration |
| Real-time Dashboard Updates | **Amazon API Gateway WebSocket API** | Persistent dashboard connections for server-pushed inventory, reconciliation, conflict, and alert updates |
| Backend Runtime | AWS Lambda + Node.js + TypeScript | Ingestion, processing, reconciliation, conflict handling, rule evaluation, and notification orchestration |
| Object Storage | Amazon S3 | Durable storage for uploaded offline sync batches |
| Event Ingestion | Amazon S3 Events | Triggers ingestion after a batch is successfully uploaded to S3 |
| Message Queue | Amazon SQS FIFO | Per-store ordered processing; `MessageGroupId = store_id` |
| Dead Letter Queue | Amazon SQS DLQ | Captures repeatedly failing messages for investigation and recovery |
| Primary Database | Amazon DynamoDB | Transaction, inventory, store, device, reconciliation, conflict, and audit state |
| Database Change Events | **DynamoDB Streams** | Emits committed DynamoDB changes for real-time update fan-out and event-driven checks |
| Workflow Orchestration | **AWS Step Functions** | Coordinates reconciliation → conflict detection → rule evaluation → notification workflow with explicit retry/failure paths |
| Immediate Notifications | Amazon SNS | Operational alerts such as low stock, suspicious activity, conflicts, offline stores, and processing failures |
| Formal Email | Amazon SES | Detailed reconciliation/conflict reports and supplier/restocking emails |
| Monitoring & Logs | Amazon CloudWatch | Lambda/SQS/Step Functions/API monitoring, logs, metrics, alarms, and failure visibility |
| Infrastructure as Code | AWS SAM | Repeatable deployment and definition of serverless AWS resources |
| Data Format | JSON | POS batches, API payloads, queue messages, and event payloads |
| Version Control | Git + GitHub | Source-code and infrastructure version control |

#### Technology Selection Rationale

- **React + Vite + TypeScript:** provides a practical web application stack for the POS simulator and central dashboard.
- **IndexedDB:** gives each POS device persistent local storage so transactions can continue during outages.
- **S3:** acts as the durable handoff point for completed sync batches; an S3 event is an ingestion trigger, not an ordering mechanism.
- **SQS FIFO:** serializes batches within a store while allowing different stores to process concurrently.
- **DynamoDB conditional/versioned writes:** provides a second layer of protection against stale concurrent writes and prevents silent inventory overwrites.
- **DynamoDB Streams:** provides a database-native source of committed state changes. A dedicated Lambda consumes relevant changes and publishes dashboard update events through the WebSocket API. It can also trigger event-driven checks such as low-stock evaluation.
- **API Gateway WebSocket API:** keeps authorized dashboard clients connected so important state changes can be pushed without constant polling.
- **AWS Step Functions:** makes the processing workflow explicit: validate/replay → reconcile → run conflict checks and deterministic suspicious-activity rules → consolidate outcomes → notify/update downstream systems. Retries, timeouts, and failure branches are represented in the state machine rather than being hidden inside one large Lambda.
- **SNS + SES:** separates immediate operational alerts from detailed/formal email communication.
- **CloudWatch:** provides operational observability across asynchronous components.
- **AWS SAM:** keeps the infrastructure reproducible and suitable for a student team.

## 4. AWS Components

### 4.1 Amazon API Gateway

API Gateway acts as the entry point for requests from the web application when cloud connectivity is available.

Typical responsibilities:

- Receive authenticated API requests
- Route requests to Lambda functions
- Expose sale, inventory, transaction, dashboard, and administration APIs
- Return processing results to the client

#### 4.1.1 HTTP API and WebSocket API

API Gateway provides two communication paths:

- **HTTP API:** request/response operations such as authentication-adjacent API calls, POS synchronization, inventory queries, dashboard data retrieval, and administrative actions.
- **WebSocket API:** persistent connections used to push important committed state changes to connected dashboard clients.

The dashboard should not depend on continuous polling for real-time operational updates. If a client disconnects, it reconnects and retrieves the authoritative current state through the HTTP API.

---

### 4.2 Amazon SQS FIFO

Amazon SQS FIFO is the coordination layer between S3 ingestion and cloud transaction processing.

This component is critical to the deterministic-processing guarantee.

Responsibilities:

- Receive synchronization batches after S3 ingestion.
- Use the `Store ID` as the SQS `MessageGroupId`.
- Ensure batches belonging to the same store are processed sequentially.
- Allow batches belonging to different stores to be processed concurrently.
- Provide controlled retry behavior.
- Prevent the architecture from relying on S3 event delivery order.

Example:

```text
Store A Batch 001 ─┐
Store A Batch 002 ─┼─→ MessageGroupId = Store A → sequential
Store A Batch 003 ─┘

Store B Batch 001 ─┐
Store B Batch 002 ─┴─→ MessageGroupId = Store B → can run independently
```

S3 event order must therefore **not** be treated as the ordering mechanism.

#### SQS Message Payload Contract

The SQS FIFO message must contain a **reference to the uploaded S3 batch**, rather than the complete transaction batch. This keeps queue messages small and avoids coupling queue-message size to the number of transactions in a batch.

Minimum message contents:

```json
{
  "batch_id": "batch-...",
  "store_id": "store-...",
  "s3_bucket": "...",
  "s3_key": "transactions/store-.../batch-....json"
}
```

The Processing Lambda retrieves the batch from S3 using this pointer. The S3 object remains the durable source for the uploaded batch.

### 4.3 SQS Dead-Letter Queue (DLQ)

The FIFO processing queue must have a Dead-Letter Queue configured for batches that repeatedly fail processing.

Recommended flow:

```text
Processing Lambda
        ↓
Processing failure
        ↓
Retry with controlled backoff
        ↓
Retry limit exceeded
        ↓
Move message to DLQ
        ↓
Create/record operational failure
        ↓
SNS alert to authorized administrator
        ↓
Human investigation / recovery
```

The DLQ prevents a permanently failing batch from being retried indefinitely while remaining invisible to operators.

A failed batch must remain traceable through its:

- Batch ID
- Store ID
- S3 object reference
- Failure reason
- Retry count
- Last processing timestamp

A DLQ item must not be treated as a successfully reconciled batch.

#### DLQ Recovery Path

After investigation, an authorized administrator can choose one of the following outcomes:

```text
DLQ
 ↓
Admin Investigation
 ↓
┌───────────────────────────────┐
│ Fix underlying issue           │
│ or correct configuration/data  │
└───────────────┬───────────────┘
                ↓
        Requeue original batch
                ↓
             SQS FIFO
                ↓
          Process again
```

Reprocessing must reuse the original `batch_id` and transaction IDs so idempotency prevents duplicate inventory effects. If the issue cannot be safely corrected, the administrator records the final disposition and the batch remains traceable as failed/reviewed rather than being silently discarded.

### 4.4 AWS Lambda

Lambda provides the serverless compute layer.

There are two important logical Lambda responsibilities:

1. **Ingestion Lambda**
   - Receives the S3 event.
   - Identifies the uploaded synchronization batch.
   - Performs basic validation.
   - Publishes a message to the SQS FIFO queue.
   - Does not perform the final inventory reconciliation.

2. **Processing Lambda**
   - Is invoked from the SQS FIFO queue.
   - Processes batches in the order guaranteed for each store message group.
   - Performs transaction replay and inventory reconciliation.
   - Uses DynamoDB conditional writes/version checks as a second layer of protection.

Separate logical functions can be used for:

- Authentication-related operations
- Sale processing
- Offline synchronization
- Transaction ingestion
- Transaction replay
- Inventory reconciliation
- Conflict detection
- Suspicious activity rule evaluation
- Low-stock checking
- Dashboard aggregation
- Notification generation
- Report generation

Functions should remain focused on one responsibility wherever practical.

---

### 4.5 Amazon S3

S3 acts as durable storage for uploaded transaction logs and related event payloads.

Example structure:

```text
transactions/
    store-{storeId}/
        {date}/
            batch-{batchId}.json
```

A synchronization batch should contain enough information to identify the store, batch, transactions, and synchronization attempt.

S3 upload completion can trigger downstream Lambda processing.

---

### 4.6 Amazon DynamoDB

DynamoDB stores the application's centralized operational state.

Logical data areas include:

```text
Users
Stores
Products
Inventory
Transactions
Conflicts
Alerts
SyncBatches
AuditRecords
```

The exact physical table design may be optimized during implementation.

DynamoDB should support:

- Fast transaction lookup
- Inventory state
- Store state
- Transaction status
- Conflict status
- Alert status
- Dashboard queries
- Idempotency tracking
- Audit information

---

### 4.7 DynamoDB Streams

DynamoDB Streams provides an event source for committed changes to relevant DynamoDB records.

A stream-consumer Lambda can:

- Detect committed inventory/reconciliation/conflict state changes.
- Publish dashboard update events through the API Gateway WebSocket API.
- Trigger event-driven checks such as low-stock evaluation where appropriate.

DynamoDB remains the source of truth; the stream is only the change-event mechanism.

Only committed state changes should be presented to connected dashboards as authoritative state.

---

### 4.8 AWS Step Functions

AWS Step Functions orchestrates the multi-stage reconciliation workflow. It is used to avoid turning the processing Lambda into a monolithic coordinator.

The workflow coordinates:

1. Transaction validation and replay.
2. Inventory reconciliation.
3. Conflict and consistency checks.
4. Rule-based suspicious-activity checks.
5. Outcome consolidation and persistence.
6. SNS/SES notification actions where required.

Independent deterministic checks can run in parallel where their inputs permit it. Step Functions defines workflow-level retries, timeouts, and failure transitions.

A failed branch must not silently disappear. If the workflow cannot complete after its configured retry policy, the processing path remains recoverable through the SQS retry/DLQ mechanism and an SNS operational alert is generated.


#### 4.11.1 Reconciliation Workflow

```text
SQS FIFO
   ↓
Processing Lambda
   ↓
Validate + Replay
   ↓
Reconcile Inventory
   ↓
AWS Step Functions
   ↓
┌───────────────────────────────┐
│ Parallel deterministic checks │
│                               │
│ Conflict / consistency        │
│ Suspicious-activity rules     │
└───────────────┬───────────────┘
                ↓
        Consolidate Outcome
                ↓
      Persist Final State
                ↓
         SNS / SES if needed
```

---

### 4.9 Amazon SNS

SNS is used for immediate operational notifications.

Examples:

- Low-stock alert
- Suspicious activity detected
- Store offline for an abnormal duration
- Synchronization failure
- Reconciliation conflict requiring attention

SNS should be used when the primary requirement is timely operational awareness.

---

### 4.10 Amazon SES

SES is used for formal or detailed email communication.

Examples:

- Daily reconciliation report
- Conflict report
- Inventory summary
- Store synchronization report
- Supplier restocking request
- Administrative report

SNS and SES have different purposes and should not be treated as interchangeable.

---

### 4.11 Amazon CloudWatch

CloudWatch provides observability.

It should capture:

- Lambda execution logs
- Processing failures
- Synchronization failures
- Retry events
- Reconciliation errors
- Important system metrics
- Operational alerts

---

## 5. Core End-to-End Workflow

### Step 1: User Authentication

1. User opens the application.
2. User authenticates.
3. System identifies the user's role.
4. System associates the user with the appropriate store or administrative scope.
5. The application loads the permitted data.

---

### Step 2: Normal Online Sale

```text
User records sale
      ↓
Validate sale
      ↓
Send request to cloud
      ↓
Process transaction
      ↓
Update inventory
      ↓
Store transaction record
      ↓
Return success
```

The transaction receives a unique transaction ID.

---

### Step 3: Internet Failure

When the application cannot reach the cloud:

```text
User records sale
      ↓
Detect unavailable connection
      ↓
Validate locally
      ↓
Create transaction ID
      ↓
Store transaction locally
      ↓
Mark transaction PENDING
      ↓
Update local pending count
```

The user should receive confirmation that the transaction has been stored locally rather than being falsely told that cloud processing is complete.

---

### Step 4: Continued Offline Operation

Multiple sales can be recorded while the store remains offline.

```text
Sale 001 → PENDING
Sale 002 → PENDING
Sale 003 → PENDING
Sale 004 → PENDING
```

The local system maintains the transaction order using a sequence number or equivalent ordering mechanism.

---

### Step 5: Connectivity Restoration and Confirmed Upload

When connectivity returns:

```text
Connection restored
       ↓
Detect pending transactions
       ↓
Create synchronization batch
       ↓
Attempt upload to S3
       ↓
     ┌───────────────┴────────────────┐
     ▼                                ▼
Upload confirmed                 Upload failed/interrupted
     ↓                                ↓
Mark batch SYNCING                Keep transactions PENDING
     ↓                            Record sync failure
Wait for cloud processing          Retry later
```

**Important state rule:** the local system must not mark transactions/batches as `SYNCING` merely because an upload has started. `SYNCING` is entered only after the S3 upload has been successfully confirmed.

If an upload is interrupted, times out, or receives an unsuccessful response:

- Keep the affected transactions recoverable.
- Keep them in `PENDING` (or an explicit `UPLOAD_FAILED` state if implemented).
- Record the failure.
- Retry according to the synchronization retry policy.
- Do not create a second logical transaction merely because the first upload attempt may have partially completed.

If the client cannot determine whether an upload succeeded, it should retry using the same batch ID and transaction IDs. Cloud-side idempotency must make a repeated upload safe.

If multiple terminals from the same store synchronize independently, each terminal creates its own batch. The cloud system must **not** assume that local sequence numbers from different devices are globally comparable.

---

### Step 6: S3 Ingestion and Ordered Queueing

Only after the S3 upload has been successfully confirmed does the batch enter the cloud-processing path.

```text
Confirmed S3 upload
        ↓
S3 event generated
        ↓
Ingestion Lambda
        ↓
Validate batch reference
        ↓
Create FIFO message
        ↓
MessageGroupId = Store ID
        ↓
SQS FIFO Queue
```

The S3 event is **only an ingestion trigger**. It is not the mechanism that guarantees transaction-processing order.

This distinction is essential because S3 event notifications do not provide the per-store serialization guarantee required by the reconciliation engine.

The ingestion layer should also use the batch ID as an idempotency key so duplicate S3 notifications or repeated upload attempts do not create duplicate processing work.

---

### Step 6A: Per-Store Serialization

SQS FIFO provides the ordering boundary.

For the same store:

```text
Store A Batch 001
        ↓
Store A Batch 002
        ↓
Store A Batch 003
```

These messages share:

```text
MessageGroupId = Store A
```

Therefore the processing Lambda must finish the earlier message before the next message in that group is made available for processing.

For different stores:

```text
Store A → Message Group A
Store B → Message Group B
Store C → Message Group C
```

These groups can be processed independently, preserving scalability across stores.

---

### Step 6B: Defense-in-Depth Inventory Locking

Queue ordering is the primary coordination mechanism, but inventory updates must also use DynamoDB conditional/versioned writes.

Conceptually:

```text
Read inventory version = 17
        ↓
Calculate new inventory
        ↓
Write only if version is still 17
        ↓
Success → version becomes 18
Failure → retry/reconcile safely
```

This protects against unexpected concurrent writers, manual administrative changes, duplicate delivery, implementation errors, or other race conditions.

A failed conditional write must never silently overwrite the newer inventory state.

---

### Step 7: Transaction Validation

Lambda validates:

- Batch identity
- Transaction ID
- Store ID
- Product ID
- Quantity
- Timestamp
- Required fields
- Transaction structure
- Duplicate/idempotency state

Invalid records should be rejected or isolated without corrupting valid transactions.

---

### Step 7A: Processing Failure and Dead-Letter Handling

If the processing Lambda crashes, times out, or otherwise fails before the batch is safely completed:

```text
Processing failure
       ↓
SQS retry
       ↓
Processing Lambda
       ↓
Success? ── YES → complete message
       │
       NO
       ↓
Retry limit reached?
       │
       ├── NO → retry with backoff
       │
       └── YES
              ↓
             DLQ
              ↓
        SNS operational alert
              ↓
       Human investigation
```

A transient processing failure must therefore not be confused with a reconciliation conflict.

- **Processing failure:** the system could not complete the computation safely; retry first.
- **Reconciliation conflict:** processing completed far enough to determine that the business state needs review.

A batch should only be acknowledged/deleted from the processing queue after its processing outcome has been durably recorded.

### Step 8: Transaction Replay

Valid transactions are replayed in deterministic order.

```text
Transaction 001
      ↓
Transaction 002
      ↓
Transaction 003
      ↓
Transaction 004
```

The replay engine reconstructs the inventory impact of the transactions rather than treating the uploaded batch as an unordered collection.

This is a central part of the system.

---

### Step 9: Inventory Reconciliation

For each transaction:

```text
Authoritative inventory state
          +
Ordered transaction effect
          ↓
Calculate expected resulting state
          ↓
Validate business constraints
          ↓
Conditional/versioned inventory write
       ↙                         ↘
    Success                    Failure
       ↓                         ↓
Apply state                  Re-read state
       ↓                         ↓
Continue                     Recalculate
                                 ↓
                          Conflict if unresolved
```

Example:

```text
Initial stock = 50
Offline sale = 5
Expected stock = 45
```

A transaction is accepted when its inventory effect is valid under the current authoritative state and the DynamoDB conditional/version check succeeds.

A reconciliation conflict is created when the system cannot safely apply the transaction because of a business/state inconsistency, such as:

- Replay would create negative stock under the default no-negative-inventory policy.
- The expected inventory version no longer matches.
- The referenced product/store state is invalid.
- A competing transaction/state change makes the intended inventory effect ambiguous.
- A duplicate or ordering inconsistency cannot be resolved by idempotency rules.

There is **no arbitrary tolerance** for inventory quantity mismatches. Inventory is discrete business state: a mismatch that cannot be explained by the defined transaction effects and current version/state is treated as a conflict.

The system must not silently overwrite important inventory state.

---

### Step 10: Conflict Detection

Potential conflicts include:

- Oversell / negative inventory
- DynamoDB version/conditional-write failure that cannot be safely retried
- Invalid product
- Invalid store
- Impossible quantity
- Unexpected transaction ordering
- Synchronization inconsistency
- Duplicate transaction that conflicts with the existing transaction record
- Any inventory mismatch that cannot be explained by the defined transaction effects

A transaction that is simply already processed is **not automatically a conflict**. If the transaction ID and recorded outcome match, it is treated as an idempotent duplicate and must not be applied again.

A conflict should contain enough information for an authorized user to understand and resolve it.

---

### Step 11: Rule-Based Suspicious Activity Detection

After transaction processing, deterministic rules are evaluated.

Example:

```text
Transaction quantity > configured threshold
        ↓
Flag suspicious activity
```

Other rules may include:

- Excessive transaction quantity
- Repeated unusual transactions
- Multiple reversals within a configured period
- Repeated synchronization failures
- Unusual transaction frequency
- Other explicitly configured business rules

This is **rule-based detection**, not machine-learning fraud prediction.

---

### Step 12: Inventory and Dashboard Update

After successful reconciliation:

```text
Processed transactions
        ↓
Update DynamoDB
        ↓
Update inventory state
        ↓
Update transaction status
        ↓
Update dashboard metrics
```

The dashboard can display:

- Current inventory
- Low-stock products
- Pending synchronization
- Store connectivity status
- Reconciliation conflicts
- Suspicious activity
- Recent transactions
- Store-level summaries

---

### Step 13: Notifications

Operational conditions generate notifications.

```text
Low stock              → SNS
Suspicious activity    → SNS
Sync failure           → SNS
Conflict requiring     → SNS
attention

Detailed report        → SES
Inventory report       → SES
Reconciliation report  → SES
Supplier request       → SES
```

---

## 6. Transaction State Machine

A transaction follows this canonical lifecycle:

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

Upload attempts are synchronization activity and are **not** a transaction lifecycle state. `UPLOAD_ATTEMPT` is an internal sub-state of `PENDING` used by the synchronization protocol (see Upload Reliability Guarantees, §13) — it is never a value of the transaction's own lifecycle field.

Exception paths:

```text
PENDING → (sync) UPLOAD_FAILED → RETRY → PENDING

PROCESSING → transient failure → SQS RETRY → PROCESSING

PROCESSING → retry limit exceeded → DLQ → ADMIN_INVESTIGATION

PROCESSING → CONFLICT → MANUAL_REVIEW → RESOLVED

PROCESSING → SUSPICIOUS → FLAGGED → REVIEWED

PROCESSING → REJECTED
```

A failed synchronization attempt returns the transaction to a recoverable `PENDING` state; it never advances past `PENDING` until the upload is confirmed. `SYNCING` therefore means the cloud has confirmed receipt of the batch — it does not merely mean that an upload attempt has begun.

State names and transitions defined here are canonical and must remain deterministic and auditable during implementation.

---

## 7. Multi-Device Ordering and Global Transaction Identity

### 7.1 Device Identity

Every client/terminal must have a stable `device_id` or installation identity.

A local sequence number is scoped to that device only.

Example:

```text
Store A / Device 01 / Sequence 001
Store A / Device 02 / Sequence 001
```

These are two different transactions and must never collide.

---

### 7.2 Globally Unique Transaction ID

The transaction ID must not be generated solely from:

```text
Store ID + Local Sequence
```

because a device reinstall, cache reset, or another counter reset could reuse a sequence number.

Instead, the transaction ID should contain or be derived from a globally unique identifier, such as a UUID, generated when the transaction is created.

The transaction record should retain:

- `transaction_id` — globally unique
- `store_id`
- `device_id`
- `device_sequence`
- `created_at`
- `batch_id`

This allows idempotency to distinguish two real transactions even if their local sequence numbers are identical.

---

### 7.3 Cross-Device Ordering

There is no assumption that:

```text
Device A sequence 3 < Device B sequence 3
```

means Device A's transaction happened first.

The authoritative processing order should therefore be based on a cloud-defined ordering policy.

Recommended policy:

1. Preserve each device's local sequence order.
2. Assign/record a cloud ingestion or processing sequence for batches.
3. Serialize batches per store through SQS FIFO.
4. Use transaction timestamps only as supporting information, not as the sole correctness mechanism.
5. If two transactions create an inventory conflict, invoke the reconciliation rules rather than guessing their real-world order.

This gives the system a deterministic **processing order** without falsely claiming that it can reconstruct an unknowable physical event order between independently offline devices.

---

### 7.4 Deterministic Conflict Policy

When independently offline terminals create competing inventory effects, the system must use the configured reconciliation policy.

For example:

```text
Expected stock after replay < 0
        ↓
Oversell conflict
        ↓
Do not silently create negative stock
        ↓
Create conflict record
        ↓
Manager/Admin review
```

The system must preserve the original transactions and their metadata so the reviewer can determine the appropriate business resolution.

---

## 8. Idempotency and Duplicate Prevention

The system must assume that synchronization can be retried.

Example:

```text
Batch uploaded
      ↓
Lambda starts
      ↓
Processing fails
      ↓
Batch retried
```

The retry must not create duplicate sales or subtract inventory twice.

The system should use:

- Unique transaction IDs
- Unique synchronization batch IDs
- Processed-status tracking
- Idempotency checks
- Safe retry logic

Conceptually:

```text
IF transaction_id already processed
    → do not apply inventory effect again
ELSE
    → process transaction
    → record transaction_id as processed
```

---

## 9. Failure Handling

### Network Failure

```text
Cloud unavailable
      ↓
Continue locally
      ↓
Queue transactions
      ↓
Retry synchronization
```

### Synchronization Failure

```text
Upload/process fails
      ↓
Keep local transaction
      ↓
Record failure
      ↓
Retry
      ↓
Escalate after configured failures
```

### Invalid Transaction

```text
Invalid record
      ↓
Do not apply inventory effect
      ↓
Record error
      ↓
Mark transaction rejected/exception
      ↓
Notify authorized user if required
```

### Reconciliation Conflict

```text
Conflict detected
      ↓
Do not silently overwrite
      ↓
Create conflict record
      ↓
Notify manager/admin
      ↓
Human review
      ↓
Resolution
      ↓
Apply approved state
```

---

## 10. Store Connectivity Monitoring

The system maintains a logical connectivity state for each store. The canonical connectivity states are the same ones defined in `projectrequirements.md` (FR-06/FR-22) and `rules.md` (RULE-039):

```text
ONLINE
OFFLINE
SYNCING
SYNC_FAILED
```

A store transitions between these states based on its most recent synchronization activity:

```text
ONLINE
   ↓ (no successful sync within the configured threshold)
SYNC_FAILED
   ↓ (no communication at all within the configured threshold)
OFFLINE
   ↓ (connectivity restored, batch upload begins)
SYNCING
   ↓ (upload/processing confirmed)
ONLINE
```

Operational health (`HEALTHY` / `ATTENTION_REQUIRED`) is a separate, derived dashboard concept and is not part of the connectivity state itself — it is computed from connectivity state plus open conflicts, suspicious activity, and low-stock conditions.

The dashboard can show:

- Current connectivity state
- Last successful synchronization
- Number of pending transactions
- Last synchronization attempt
- Synchronization failures

The exact threshold for abnormal offline duration should be configurable.

---

## 11. Human-in-the-Loop Architecture

Automation handles deterministic operations:

- Transaction validation
- Ordering
- Replay
- Inventory calculations
- Rule evaluation
- Low-stock detection
- Notification triggering
- Report generation

Human users handle high-impact exceptions:

- Reconciliation conflicts
- Suspicious activity review
- Manual resolution
- Administrative corrections
- Exceptional inventory decisions

This prevents the system from making irreversible business decisions based only on automated rules.

---

## 12. Security Architecture

Security requirements include:

- Authenticated access
- Role-based authorization
- Store-level data isolation
- Least-privilege AWS permissions
- Protected API endpoints
- Secure transmission when online
- Controlled access to administrative operations
- Audit records for important actions

Example role boundaries:

```text
Store Staff
    → Record sales
    → View permitted inventory
    → View own/store transactions

Store Manager
    → Store-level monitoring
    → Conflict review
    → Suspicious activity review

HQ / Inventory Administrator
    → Multi-store dashboard
    → Inventory management
    → Reports
    → Conflict administration

Supplier
    → Limited supplier-facing information only
```

---

## 13. Upload Reliability Guarantees

The local synchronization protocol must distinguish between **attempting an upload** and **successfully handing the batch to cloud storage**.

### Guarantee 1 — Confirm Before SYNCING

```text
Upload started ≠ Upload confirmed
```

The local state becomes `SYNCING` only after the S3 upload receives a successful confirmation.

### Guarantee 2 — Failed Uploads Stay Recoverable

If the upload fails or is interrupted, transactions remain pending/recoverable and are retried.

### Guarantee 3 — Ambiguous Uploads Are Safe to Retry

If the client cannot determine whether S3 received the batch, it retries using the same batch ID and transaction IDs.

### Guarantee 4 — Cloud Idempotency Handles Repeated Uploads

Repeated delivery of the same batch must not produce duplicate inventory effects.

### Guarantee 5 — Processing Has an Escape Hatch

Repeated processing failures eventually move the batch to the DLQ and generate an operational alert rather than retrying forever.

---

## 14. Concurrency and Consistency Guarantees

The system's deterministic-processing promise depends on **both** queue serialization and database-level protection.

### Guarantee 1 — S3 Does Not Define Order

S3 event arrival order must never be used as the authoritative processing order.

### Guarantee 2 — One Ordered Stream Per Store

All synchronization batches for the same store must use the same SQS FIFO `MessageGroupId`:

```text
MessageGroupId = store_id
```

This serializes processing for that store while allowing other stores to process concurrently.

### Guarantee 3 — Idempotent Processing

A transaction that has already been accepted/processed must not have its inventory effect applied again.

### Guarantee 4 — Conditional Inventory Writes

Inventory writes must verify the expected version/state before committing.

Conceptually:

```text
IF inventory.version == expected_version
    THEN update inventory and increment version
    ELSE retry / create conflict
```

### Guarantee 5 — Oversell Is Explicit

If a valid replay would drive stock below zero, the default outcome is an explicit oversell/reconciliation conflict, not a silent negative quantity.

### Guarantee 6 — Multi-Terminal Safety

Device-local sequence numbers are scoped to the device. Global transaction identity comes from a globally unique transaction ID.

### Guarantee 7 — Processing Order vs Real-World Event Order

The system guarantees deterministic **processing order**. It does not pretend that two independently offline terminals can always reveal the exact physical order in which two real-world sales occurred.

When the real-world order cannot be known and it affects inventory correctness, the system preserves the evidence and raises a conflict.

---

## 15. Data Flow Summary

```text
                     USER
                       │
                       ▼
                WEB APPLICATION
                       │
              ┌────────┴────────┐
              │                 │
           ONLINE             OFFLINE
              │                 │
              ▼                 ▼
          API Gateway       Local Queue
              │                 │
              ▼                 │
           Lambda                │
              │                 │
              ▼                 │
          DynamoDB              │
                                │
                         Connectivity returns
                                │
                                ▼
                               S3
                                │
                              Event
                                │
                                ▼
                       Ingestion Lambda
                                │
                                ▼
                           SQS FIFO
                       (Store ID group)
                                │
                                ▼
                       Processing Lambda
                                │
                                ▼
                       AWS Step Functions
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
        Reconciliation     Conflict checks   Suspicious-activity
                                                  rules
              └─────────────────┼─────────────────┘
                                ▼
                       Consolidate outcome
                                │
                                ▼
                            DynamoDB
                                │
                  ┌─────────────┴─────────────┐
                  ▼                           ▼
          DynamoDB Streams              SNS / SES
                  │
                  ▼
          Stream Consumer Lambda
                  │
                  ▼
       API Gateway WebSocket API
                  │
                  ▼
             Dashboard
```

---

## 16. Data Model and API Contract

This section defines the baseline DynamoDB table design and API surface referenced elsewhere in this document. It is the canonical starting point for implementation; individual attributes may be extended, but partition/sort keys and required fields should not be redefined without updating this section.

### 16.1 DynamoDB Tables

Single-table indexes are noted where they materially simplify access patterns; otherwise each logical entity has its own table for clarity in an MVP/student context.

| Table | Partition Key | Sort Key | Key Attributes | Notes |
|---|---|---|---|---|
| `Stores` | `store_id` | — | `name`, `connectivity_state`, `last_successful_sync`, `last_sync_attempt` | `connectivity_state` ∈ `ONLINE / OFFLINE / SYNCING / SYNC_FAILED` |
| `Users` | `user_id` | — | `role`, `store_id` (nullable for HQ/admin), `status`, `cognito_sub` | `role` ∈ `STORE_STAFF / STORE_MANAGER / ADMIN / SUPPLIER` |
| `Products` | `product_id` | — | `name`, `sku`, `low_stock_threshold` | Threshold may be overridden per store in `Inventory` |
| `Inventory` | `store_id` | `product_id` | `quantity`, `version`, `last_updated`, `status` | `version` is the conditional-write guard (Concurrency Guarantee 4, §14) |
| `Transactions` | `transaction_id` | — | `store_id`, `device_id`, `device_sequence`, `product_id`, `quantity`, `type`, `created_at`, `batch_id`, `lifecycle_state` | GSI: `store_id` + `created_at` for store-scoped history queries |
| `SyncBatches` | `batch_id` | — | `store_id`, `device_id`, `s3_bucket`, `s3_key`, `status`, `retry_count`, `last_attempt_at` | `status` mirrors the batch-level portion of the transaction lifecycle |
| `Conflicts` | `conflict_id` | — | `store_id`, `product_id`, `transaction_ids`, `expected_state`, `actual_state`, `difference`, `status`, `detected_at` | `status` ∈ `OPEN / UNDER_REVIEW / RESOLVED / ESCALATED` (FR-18) |
| `SuspiciousActivity` | `alert_id` | — | `store_id`, `transaction_ids`, `triggered_rule`, `status`, `detected_at` | `status` ∈ `FLAGGED / REVIEWED` |
| `Notifications` | `notification_id` | — | `type` (`SNS`/`SES`), `recipient`, `related_event_id`, `status`, `created_at` | Used for RULE-044 (avoid notification spam) lookups |
| `AuditRecords` | `audit_id` | `created_at` | `entity_type`, `entity_id`, `actor`, `action`, `previous_state`, `new_state` | Append-only (RULE-053) |

Idempotency for transaction processing is enforced by treating `transaction_id` as the primary key of `Transactions` — a conditional put (`attribute_not_exists(transaction_id)` or a status check) prevents a duplicate from being processed twice, independent of SQS-level deduplication.

### 16.2 HTTP API (Amazon API Gateway)

| Method & Path | Purpose | Primary Role(s) |
|---|---|---|
| `POST /auth/login` | Authenticate and obtain a session/token via Cognito | All |
| `GET /stores/{storeId}/inventory` | Retrieve current inventory for a store | Staff, Manager, Admin |
| `POST /stores/{storeId}/transactions` | Record an online sale | Staff |
| `GET /stores/{storeId}/transactions` | Transaction history with filters (FR-30) | Manager, Admin |
| `POST /stores/{storeId}/sync-batches` | Upload a synchronization batch reference after S3 confirmation | Staff (device) |
| `GET /stores/{storeId}/sync-status` | Current pending/sync status for a store | Staff, Manager |
| `GET /conflicts` | List conflicts, filterable by store/status | Manager, Admin |
| `POST /conflicts/{conflictId}/resolve` | Record a conflict resolution (RULE-031) | Manager, Admin |
| `GET /suspicious-activity` | List suspicious-activity records | Manager, Admin |
| `POST /suspicious-activity/{alertId}/review` | Mark an alert reviewed | Manager, Admin |
| `GET /dashboard/summary` | Aggregated dashboard metrics (FR-26) | Manager, Admin |
| `POST /admin/thresholds` | Update configurable thresholds (§21 config values) | Admin |
| `POST /admin/dlq/{batchId}/requeue` | Requeue a DLQ batch after investigation | Admin |

All endpoints require an authenticated Cognito session; role checks are enforced per RULE-048–051.

### 16.3 WebSocket API (Amazon API Gateway)

| Message Type | Trigger | Payload Summary |
|---|---|---|
| `inventory.updated` | DynamoDB Streams event on `Inventory` | `store_id`, `product_id`, `quantity`, `version` |
| `conflict.created` | DynamoDB Streams event on `Conflicts` | `conflict_id`, `store_id`, `product_id`, `status` |
| `suspicious_activity.flagged` | DynamoDB Streams event on `SuspiciousActivity` | `alert_id`, `store_id`, `triggered_rule` |
| `store.connectivity_changed` | DynamoDB Streams event on `Stores` | `store_id`, `connectivity_state` |
| `sync_batch.status_changed` | DynamoDB Streams event on `SyncBatches` | `batch_id`, `store_id`, `status` |

On reconnect, a client always re-fetches authoritative state through the HTTP API before trusting further WebSocket pushes (§4.1.1).

---

## 17. Architectural Design Principles

1. **Offline first** — temporary loss of connectivity must not stop essential sale recording.
2. **Event driven** — cloud processing begins from events rather than requiring a continuously running server.
3. **Ordered per store** — SQS FIFO message groups serialize synchronization batches for each store.
4. **Deterministic** — identical transaction inputs should produce consistent processing results.
5. **Idempotent** — retries must not duplicate business effects.
6. **Auditable** — important state changes must be traceable.
7. **Human controlled** — conflicts and suspicious activity requiring judgment are reviewed by authorized users.
8. **Serverless** — use managed AWS services instead of user-managed traditional servers.
9. **Fault tolerant** — temporary failures should result in queued work and retry rather than data loss.
10. **Concurrency safe** — queue serialization and conditional database writes protect inventory from lost updates.
11. **Modular** — processing responsibilities should be separated into logical components.
12. **Security by role** — users should only access operations appropriate to their role.

---

## 18. MVP Architecture

The first implementation should prioritize:

```text
Authentication
      ↓
Store identification
      ↓
Sale recording
      ↓
Offline local queue
      ↓
Connectivity detection
      ↓
Automatic synchronization
      ↓
S3 upload
      ↓
Ingestion Lambda
      ↓
SQS FIFO (Store ID message group)
      ↓
Processing Lambda
      ↓
Transaction replay
      ↓
Inventory reconciliation
      ↓
DynamoDB update
      ↓
Dashboard
```

Then add:

```text
Conflict detection
      ↓
Rule-based suspicious activity
      ↓
SNS alerts
      ↓
SES reports
      ↓
CloudWatch monitoring
```

---

## 19. Architecture Success Criteria

The implementation is successful when it also satisfies these architectural criteria:

- SQS FIFO serializes batches within each store message group.
- SQS messages contain S3 batch references rather than whole transaction payloads.
- DynamoDB Streams drives committed-state dashboard update events.
- API Gateway WebSocket API provides push-based dashboard updates.
- Step Functions explicitly orchestrates reconciliation, deterministic checks, outcome consolidation, and notification steps.
- DLQ items have an authorized requeue/reprocessing path after investigation.


The architecture is considered successfully implemented when:

- A store can record sales while offline.
- Offline transactions survive temporary connectivity loss.
- Pending transactions synchronize after connectivity returns.
- Transactions are not duplicated during retries.
- Cloud processing is triggered by uploaded transaction data.
- Synchronization batches for the same store are serialized through SQS FIFO.
- Transactions enter `SYNCING` only after confirmed S3 upload.
- Repeated processing failures are moved to a DLQ and alerted through SNS.
- Transactions are replayed in deterministic processing order.
- Inventory updates use conditional/versioned writes.
- Inventory is reconciled after replay.
- Conflicts are detected and surfaced.
- Suspicious activity rules can flag configured scenarios.
- Dashboard state reflects processed transactions.
- SNS notifications work for operational alerts.
- SES can deliver detailed reports.
- Important failures are observable through logs/monitoring.
