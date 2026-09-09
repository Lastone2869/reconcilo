# rules.md

# Business Rules and System Processing Rules

## 1. Purpose

This document defines the deterministic rules that govern transaction handling, offline synchronization, inventory reconciliation, conflict detection, suspicious activity detection, notifications, permissions, and exception handling.

These rules are intended to be implementation constraints for the system.

The system must not invent business behavior that is not defined here. Where a threshold or policy is configurable, it should be stored as configuration rather than hard-coded.

---

## 2. Core Rules

### RULE-001 — Unique Transaction Identity

Every sale transaction must have a globally unique transaction ID.

A transaction ID must remain unchanged throughout:

```text
Local creation
    ↓
Offline storage
    ↓
Synchronization
    ↓
S3 ingestion
    ↓
Lambda processing
    ↓
DynamoDB storage
```

The transaction ID is the primary reference for tracking the transaction.

---

### RULE-002 — No Transaction Loss

A transaction must not be deleted from local storage until the system has received sufficient confirmation that it has been successfully synchronized and accepted for cloud processing.

A failed synchronization attempt must not cause the original transaction to disappear.

---

### RULE-003 — Offline Recording

If cloud connectivity is unavailable:

```text
Sale request
    ↓
Validate locally
    ↓
Create transaction
    ↓
Store locally
    ↓
Mark PENDING
```

The user must still be able to complete the sale-recording operation if the transaction satisfies local validation rules.

---

### RULE-004 — No False Cloud Confirmation

When offline, the application must not display a message implying that the transaction has already been processed by the cloud.

The UI should distinguish between:

- Stored locally
- Waiting for synchronization
- Synchronizing
- Cloud processed
- Conflict/error

---

## 3. Transaction Validation Rules

### RULE-005 — Required Transaction Fields

A valid transaction must contain, at minimum:

- Transaction ID
- Store ID
- User ID
- Product ID
- Quantity
- Timestamp
- Transaction type
- Local sequence information where required

---

### RULE-006 — Quantity Must Be Valid

Sale quantity must:

- Be present
- Be numeric
- Be greater than zero
- Not exceed configured business limits unless explicitly permitted

---

### RULE-007 — Product Must Exist

A transaction referencing a product that cannot be identified in the system must not silently modify inventory.

It should be marked as an exception for review.

---

### RULE-008 — Store Association

A store user may create transactions only for the store to which that user is authorized.

A transaction containing an unauthorized store association must be rejected or flagged.

---

## 4. Offline Queue Rules

### RULE-009 — FIFO Processing

Offline transactions must preserve their device-local creation order using a local sequence number or equivalent ordering mechanism. The local sequence is scoped to a `device_id`; it is not a global store-wide ordering key.

After upload, synchronization batches for the same store must be serialized through **Amazon SQS FIFO** using:

```text
MessageGroupId = store_id
```

S3 event arrival order must not be treated as an ordering guarantee. Different stores may process concurrently, while batches belonging to the same store are processed serially.

Cross-device transaction order must not be guessed from equal local sequence numbers. If the exact real-world order is unknowable and affects correctness, the reconciliation process must raise a conflict rather than silently choosing an order.

---

### RULE-010 — Pending State

Every locally stored transaction that has not yet completed synchronization must remain visibly associated with a pending state.

---

### RULE-011 — Failed Synchronization

If synchronization fails:

```text
SYNCING
   ↓
SYNC_FAILED
   ↓
RETRY
```

The transaction must remain recoverable.

---

### RULE-012 — Automatic Retry

The client or synchronization mechanism should retry failed synchronization attempts according to a controlled retry policy.

Retry behavior must not create duplicate transactions.

---

## 5. Synchronization Rules

### RULE-013 — Batch Identification

Each synchronization operation should have a unique batch ID.

The batch ID is used to identify:

- Store
- Synchronization attempt
- Transaction group
- Upload
- Processing status

---

### RULE-014 — Duplicate Batch

If a previously processed synchronization batch is received again, the system must not apply its transactions twice.

---

### RULE-015 — Duplicate Transaction

Before applying a transaction's inventory effect:

```text
IF transaction already processed
    → do not apply again
ELSE
    → process transaction
```

---

### RULE-016 — Partial Batch Failure

If some transactions in a batch are valid and others are invalid, the system must not silently treat the entire batch as successful.

Each transaction should have an identifiable processing outcome.

Example:

```text
Transaction 001 → COMPLETED
Transaction 002 → COMPLETED
Transaction 003 → CONFLICT
Transaction 004 → REJECTED
```

---

## 6. Transaction Replay Rules

### RULE-017 — Deterministic Replay

Transactions must be replayed in deterministic order based on the defined sequence/timestamp policy.

The implementation must not rely on arbitrary cloud arrival order.

---

### RULE-018 — Replay Uses Transaction Effects

Each transaction must produce a defined inventory effect.

For a sale:

```text
New Stock = Previous Stock - Sale Quantity
```

For other transaction types, the corresponding configured inventory effect must be used.

---

### RULE-019 — Replay Must Be Idempotent

Replaying the same transaction more than once must not apply its inventory effect more than once.

---

### RULE-020 — Processing Status

A transaction/batch should move through controlled processing states. The lifecycle must distinguish an upload attempt from confirmed cloud receipt.

Canonical transaction lifecycle:

```text
CREATED
→ PENDING
→ SYNCING
→ PROCESSING
→ RECONCILED
→ COMPLETED
```

Upload failure path:

```text
UPLOAD_ATTEMPT → PENDING / UPLOAD_FAILED → RETRY → UPLOAD_ATTEMPT
```

Processing failure path:

```text
PROCESSING → SQS RETRY → PROCESSING
PROCESSING → retry limit exceeded → DLQ → ADMIN_INVESTIGATION
```

Business exception paths include:

```text
PROCESSING → CONFLICT → MANUAL_REVIEW → RESOLVED
PROCESSING → FLAGGED → REVIEWED
PROCESSING → REJECTED
```

`SYNCING` means cloud receipt of the batch has been confirmed; an upload attempt alone must not set this state.

---

## 7. Inventory Rules

### RULE-021 — Inventory Cannot Be Silently Overwritten

When reconciliation identifies an unexpected inventory state, the system must not silently overwrite the existing state without applying the defined conflict policy.

---

### RULE-022 — Inventory Effect

For a normal sale:

```text
Stock_after = Stock_before - Quantity_sold
```

The inventory record must reflect the successfully processed transaction.

---

### RULE-023 — Negative Inventory

The system must not create negative inventory unless a future business configuration explicitly permits negative stock.

Default behavior:

```text
Expected stock < 0
        ↓
Conflict / exception
```

---

### RULE-024 — Low Stock

If:

```text
Current Stock <= Configured Low-Stock Threshold
```

then the product is considered low stock.

The threshold must be configurable per product/category/store where required.

---

## 8. Reconciliation Rules

### RULE-025 — Expected State

The reconciliation engine calculates the expected inventory state from the known inventory state and the ordered transaction effects.

---

### RULE-026 — Match

If:

```text
Expected State = Actual State
```

the reconciliation can be marked successful.

---

### RULE-027 — Mismatch

If:

```text
Expected State ≠ Actual State
```

the system must create a reconciliation conflict or exception according to the configured policy.

---

### RULE-028 — Conflict Must Be Traceable

Every conflict must reference the relevant:

- Store
- Product
- Transaction
- Expected state
- Observed/current state
- Detection time
- Processing batch
- Conflict status

---

### RULE-029 — Human Review

Conflicts that can affect inventory correctness must be available to an authorized human reviewer.

The system must not silently choose a business outcome where human judgment is required.

---

## 9. Conflict Resolution Rules

### RULE-030 — Authorized Resolution Only

Only users with the appropriate role may resolve inventory reconciliation conflicts.

---

### RULE-031 — Resolution Must Be Recorded

Every manual conflict resolution should record:

- Reviewer
- Time
- Previous state
- Resolution
- Reason/comment where applicable

---

### RULE-032 — No Silent Deletion

A conflict record must not be deleted simply to make the dashboard appear clean.

Resolved conflicts should remain traceable through their status/history.

---

## 10. Rule-Based Suspicious Activity

Suspicious activity detection is deterministic and rule based.

It is **not machine-learning fraud prediction**.

### RULE-033 — Configurable Rules

Suspicious activity thresholds should be configurable.

Example:

```text
IF quantity > suspicious_quantity_threshold
THEN flag transaction
```

---

### RULE-034 — Excessive Quantity

If a transaction quantity exceeds the configured suspicious quantity threshold:

```text
Transaction
    ↓
Flag as suspicious
    ↓
Create alert record
    ↓
Notify authorized user
```

---

### RULE-035 — Repeated Unusual Transactions

If a configured number of unusual transactions occurs within a configured period:

```text
Count unusual transactions
        ↓
Count >= configured threshold
        ↓
Flag store/user/activity
```

The exact threshold must be configuration-driven.

---

### RULE-036 — Repeated Reversals

If repeated reversals/corrections exceed the configured threshold within a configured time window:

```text
Flag suspicious activity
```

---

### RULE-037 — Suspicious Does Not Mean Fraud

A rule-based flag indicates that an activity requires attention.

It must not automatically label the user or transaction as fraudulent.

---

### RULE-038 — Human Review

Suspicious activity should be reviewed by an authorized manager/administrator before high-impact action is taken.

---

## 11. Store Connectivity Rules

### RULE-039 — Connectivity State

A store should have a logical connectivity state based on successful communication/synchronization.

Example:

```text
ONLINE
OFFLINE
SYNCING
SYNC_FAILED
```

Operational health such as `HEALTHY` or `ATTENTION_REQUIRED` is separate from connectivity state.

---

### RULE-040 — Last Successful Sync

The system should record the timestamp of the most recent successful synchronization for each store.

---

### RULE-041 — Abnormal Offline Duration

If:

```text
Current Time - Last Successful Sync
    >
Configured Offline Alert Threshold
```

the store may be considered abnormally offline and an operational alert may be generated.

---

## 12. Notification Rules

### RULE-042 — SNS for Immediate Operational Alerts

Use SNS for time-sensitive operational alerts such as:

- Low stock
- Suspicious activity
- Store synchronization failure
- Conflict requiring attention
- Abnormal store offline status

---

### RULE-043 — SES for Detailed Reports

Use SES for:

- Reconciliation reports
- Inventory reports
- Conflict summaries
- Administrative reports
- Supplier restocking requests

---

### RULE-044 — Avoid Notification Spam

The same condition should not repeatedly generate unlimited alerts without a meaningful state change or configured notification interval.

---

## 13. Dashboard Rules

### RULE-045 — Dashboard Reflects Central State

The dashboard should use the authoritative centralized state for cloud-processed information.

---

### RULE-046 — Pending Transactions

The dashboard should distinguish:

- Successfully processed transactions
- Pending transactions
- Failed synchronizations
- Conflicts
- Suspicious activity

---

### RULE-047 — Inventory Status

Inventory views should clearly identify:

```text
Normal
Low Stock
Conflict / Exception
```

where applicable.

---

## 14. Role-Based Access Rules

### RULE-048 — Store Staff

Store staff may:

- Record sales
- Record permitted transactions
- View permitted store inventory
- View relevant transaction status

They should not resolve administrative conflicts unless explicitly authorized.

---

### RULE-049 — Store Manager

Store managers may:

- Monitor their store
- Review conflicts
- Review suspicious activity
- View store reports
- Perform permitted managerial actions

---

### RULE-050 — HQ / Inventory Administrator

Administrators may:

- View multiple stores
- Manage inventory
- Review conflicts
- Review suspicious activity
- Access reports
- Manage configured thresholds where authorized

---

### RULE-051 — Supplier

Supplier access should be limited to explicitly permitted supplier-facing information.

Suppliers should not receive unrestricted access to internal inventory or transaction data.

---

## 15. Audit Rules

### RULE-052 — Important Actions Must Be Auditable

The system should record important actions including:

- Transaction creation
- Synchronization
- Processing
- Conflict creation
- Conflict resolution
- Suspicious activity flagging
- Manual inventory changes
- Administrative changes
- Notification events

---

### RULE-053 — Audit Records Are Append-Oriented

Historical audit information should not be silently overwritten.

---

## 16. Error Handling Rules

### RULE-054 — Validation Failure

Invalid input must be rejected before applying an invalid inventory effect.

---

### RULE-055 — Processing Failure

If cloud processing fails unexpectedly:

```text
Record failure
    ↓
Do not lose transaction
    ↓
Retry where safe
    ↓
Escalate if retry policy is exhausted
```


After investigation, an authorized administrator may correct the underlying issue and requeue the original batch for processing. Reprocessing must reuse the original batch and transaction IDs so idempotency prevents duplicate inventory effects. If it cannot be safely reprocessed, the final disposition must be recorded and the batch must remain traceable.

---

### RULE-056 — Unknown Error

An unexpected error must not result in an unverified successful transaction state.

The system should prefer an explicit exception state over falsely marking the transaction complete.

---

## 17. Data Integrity Rules

### RULE-057 — Immutable Transaction Identity

Transaction IDs must not change after creation.

---

### RULE-058 — Original Transaction Preservation

The original transaction information should remain available even after reconciliation or conflict resolution.

---

### RULE-059 — State Changes Are Explicit

Important state transitions must be recorded rather than inferred only from the latest UI state.

---

## 18. Serverless/Event Rules

### RULE-060 — Event-Driven Processing

Cloud reconciliation must follow the configured event-driven flow:

```text
S3 upload confirmed
      ↓
S3 event
      ↓
Ingestion Lambda
      ↓
SQS FIFO
      ↓
Processing Lambda
      ↓
Step Functions workflow
```

The S3 event is an ingestion trigger, not the mechanism that guarantees processing order. Per-store ordering is provided by SQS FIFO with `MessageGroupId = store_id`. The SQS message should contain an S3 object reference (`batch_id`, bucket, and key), not the complete batch payload.

---

### RULE-061 — No Always-On Application Server

The core cloud processing architecture should not depend on a continuously running user-managed server.

Managed AWS services should perform the required compute, storage, messaging, and monitoring functions.

---

## 19. Rule Priority

Rules should be treated with the following priority:

### P0 — Data Safety

- No transaction loss
- No duplicate inventory deduction
- Idempotency
- Deterministic replay
- Conflict preservation
- Authentication/authorization

### P1 — Core Business Correctness

- Inventory reconciliation
- Offline synchronization
- Transaction validation
- Low-stock detection
- Connectivity monitoring

### P2 — Operational Intelligence

- Suspicious activity rules
- SNS alerts
- SES reports
- Dashboard enhancements
- Advanced administrative workflows

---

## 20. Golden Rules for Implementation

The following rules must never be violated:

```text
1. Never lose a transaction.
2. Never process the same transaction's inventory effect twice.
3. Never claim an offline transaction is cloud-complete.
4. Never replay transactions in an undefined order.
5. Never silently overwrite a reconciliation conflict.
6. Never call a rule-based flag definitive proof of fraud.
7. Never allow unauthorized users to resolve high-impact exceptions.
8. Never delete important historical transaction/audit information merely to hide an error.
9. Never let a retry create a duplicate business effect.
10. Never sacrifice transaction integrity just to make the UI show a successful status.
```

---

## 21. Configuration vs Hard-Coded Rules

The following values should be configurable rather than permanently hard-coded:

- Low-stock threshold
- Suspicious quantity threshold
- Repeated unusual transaction threshold
- Reversal threshold
- Suspicious activity time window
- Store offline alert threshold
- Synchronization retry count
- Retry interval
- Notification suppression interval
- Permitted inventory policies

This allows the system to adapt to different stores and products without rewriting the processing engine.

---

## 22. Rule Evaluation Order

For a synchronized transaction, the recommended evaluation sequence is:

```text
1. Identify batch
        ↓
2. Validate transaction structure
        ↓
3. Check transaction identity
        ↓
4. Check idempotency
        ↓
5. Determine transaction order
        ↓
6. Replay transaction
        ↓
7. Calculate inventory effect
        ↓
8. Reconcile inventory
        ↓
9. Create conflict if required
        ↓
10. Evaluate suspicious activity rules
        ↓
11. Check low-stock condition
        ↓
12. Update transaction state
        ↓
13. Update centralized inventory state
        ↓
14. Generate required notifications
        ↓
15. Record audit information
```

---

## 23. Final Rule

The system exists to preserve trustworthy inventory state despite unreliable connectivity.

Therefore:

> **Data integrity takes priority over silent automation.**

When the system can determine the correct outcome safely, it should process automatically.

When the system cannot determine the correct outcome with sufficient confidence from deterministic rules, it should preserve the evidence, create an explicit exception, and request human review.
