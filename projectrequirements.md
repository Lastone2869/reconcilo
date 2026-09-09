# Project Requirements

## 1. Purpose

This document defines what the system must build and what the completed application must be capable of doing.

`main.md` describes the project idea and rationale. This file converts that idea into concrete functional and non-functional requirements that will guide design, development, testing, and integration.

The central requirement is:

> Enable distributed retail stores to continue recording sales during temporary network failures and reliably reconcile those transactions with central inventory after connectivity is restored.

Detailed implementation architecture belongs in `architecture.md`.

---

# 2. Product Scope

The system is an **offline-first inventory reconciliation platform for distributed retail stores**.

### Online Mode

```text
Sale
 ↓
Transaction Recorded
 ↓
Central System / Cloud
 ↓
Inventory Updated
```

### Offline Mode

```text
Sale
 ↓
Transaction Recorded Locally
 ↓
Marked as Pending
 ↓
Store Continues Operating
```

### After Reconnection

```text
Internet Restored
 ↓
Pending Transactions Detected
 ↓
Transaction Log Uploaded
 ↓
Cloud Processing
 ↓
Transactions Replayed
 ↓
Inventory Reconciled
 ↓
Conflicts / Suspicious Activity Checked
 ↓
Status Updated
```

---

# 3. System Users

## 3.1 Store Staff

Store staff perform day-to-day sales operations.

They must be able to:

- Log in.
- View their store.
- Record a sale.
- Continue recording sales while offline.
- View locally recorded/pending transactions.
- See online/offline state.
- See synchronization status.
- Know whether a transaction is pending, synchronized, failed, or processed.

They must not be able to:

- Arbitrarily modify central inventory.
- Resolve high-level reconciliation conflicts without authorization.
- Access other stores' data unless permitted.
- Change system-wide rules.

## 3.2 Store Manager

The store manager monitors store operations and inventory.

They must be able to:

- View inventory and stock levels.
- View transaction history.
- View synchronization history.
- View reconciliation results.
- Review conflicts.
- Review suspicious transactions.
- Receive low-stock alerts.
- Receive store-offline alerts.
- View reports.
- Perform authorized reconciliation actions.

## 3.3 Headquarters / Inventory Administrator

The administrator manages centralized inventory and multiple stores.

They must be able to:

- View authorized stores.
- View centralized inventory.
- Monitor connectivity.
- Monitor synchronization.
- View transaction activity.
- View reconciliation history.
- Review conflicts.
- Review suspicious activity.
- Monitor low-stock products.
- View alerts and reports.
- Manage products/inventory according to permissions.
- Configure applicable thresholds and rules according to the implemented permission model.

## 3.4 Supplier

A supplier is an external stakeholder with limited interaction.

The system may send:

- Restocking requests.
- Relevant inventory information.
- Appropriate business communication.

A supplier does not need access to the internal dashboard unless explicitly added later.

---

# 4. Functional Requirements

## FR-01 — Authentication

The system must provide authenticated access to authorized users.

- Login is required for protected areas.
- User identity determines available functionality.
- Unauthorized users cannot access protected data.
- Authentication failures are handled gracefully.

## FR-02 — Role-Based Access

The system must distinguish at minimum between:

```text
Store Staff
Store Manager
Inventory Administrator
```

Supplier access may be supported as a limited external role.

The interface and available operations must change according to the user's role.

## FR-03 — Store Identification

Store activity must be associated with a specific store.

Transactions must contain enough information to identify:

- Store.
- Transaction.
- Time.
- Product.
- Quantity.
- Transaction type.
- Synchronization state.

---

# 5. Sales and Transaction Requirements

## FR-04 — Record Sale

Authorized staff must be able to record a sale.

A transaction should contain at minimum:

- Transaction ID.
- Store ID.
- Product ID.
- Quantity.
- Timestamp.
- Transaction type.
- Transaction status.
- Synchronization status.

## FR-05 — Offline Transaction Recording

Sales must remain recordable when the internet is unavailable.

```text
User records sale
       ↓
Transaction saved locally
       ↓
Transaction marked pending
```

A temporary network outage must not prevent normal sales operations.

## FR-06 — Online / Offline Status

The application must clearly communicate connectivity state.

Possible states:

```text
ONLINE
OFFLINE
SYNCING
SYNC_FAILED
```

The state must be understandable to non-technical users.

## FR-07 — Pending Transaction Queue

Offline transactions remain pending until successfully synchronized.

Authorized users should be able to see:

- Number of pending transactions.
- Transaction details.
- Synchronization state.
- Synchronization progress where applicable.
- Failed synchronization status.

## FR-08 — Automatic Synchronization

When connectivity returns, the application must be able to initiate synchronization.

Process:

1. Detect restored connectivity.
2. Identify pending transactions.
3. Prepare transaction data.
4. Upload transaction log.
5. Trigger cloud-side processing.
6. Track processing status.

A successful upload must not automatically be presented as successful reconciliation.

---

# 6. Transaction Replay Requirements

## FR-09 — Preserve Individual Events

Offline transactions must remain individual events.

For example:

```text
Sale 1
Sale 2
Sale 3
Return
Sale 4
```

must remain traceable rather than being reduced to one final stock difference.

## FR-10 — Replay Transactions

After synchronization, cloud processing must replay transactions in the required sequence.

The replay process must:

- Read transaction events.
- Validate them.
- Process them in order.
- Apply inventory effects.
- Record processing status.
- Prevent accidental duplicate processing.

## FR-11 — Transaction Processing Status

Transactions should have a clear lifecycle, for example:

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

---

# 7. Inventory Requirements

## FR-12 — Central Inventory

The system must maintain centralized inventory information including, where applicable:

- Product ID.
- Product name.
- Store.
- Current quantity.
- Threshold.
- Last updated time.
- Inventory status.

## FR-13 — Inventory Update

Successful transaction processing must update the appropriate inventory state.

Invalid or duplicate inventory changes must not be silently applied.

## FR-14 — Low-Stock Detection

Inventory must be compared against a configured threshold.

Example:

```text
Current Stock = 4
Threshold = 5

4 < 5
 ↓
Low Stock
```

An appropriate operational alert should be generated.

---

# 8. Reconciliation Requirements

## FR-15 — Reconciliation

The system must reconcile offline transactions against central inventory after synchronization.

It must determine whether the transaction history can be applied consistently.

## FR-16 — Conflict Detection

The system must detect inventory inconsistencies.

Example:

```text
Expected = 50
Actual   = 47
Difference = 3
```

The conflict must be recorded and made visible to authorized users.

## FR-17 — Conflict Details

A conflict record should provide enough information to investigate it, including where applicable:

- Store.
- Product.
- Related transaction(s).
- Expected state.
- Actual state.
- Difference.
- Timestamp.
- Conflict status.
- Relevant reason/context.

## FR-18 — Conflict Resolution

Authorized users should have a workflow for handling conflicts.

Possible states:

```text
OPEN
UNDER_REVIEW
RESOLVED
ESCALATED
```

This state model is canonical; see `architecture.md` §16.1 for the corresponding `Conflicts` table definition.

---

# 9. Rule-Based Suspicious Activity Detection

## FR-19 — Suspicious Transaction Detection

The system must support **rule-based detection of suspicious transaction patterns**.

This is not a machine-learning fraud system.

Example:

```text
50 TVs sold
within 2 minutes
       ↓
Rule triggered
       ↓
Suspicious Activity
```

Possible rules include:

- Unusually high quantity within a short period.
- Unusually large transaction volume within a short interval.
- Other predefined suspicious patterns.

## FR-20 — Suspicious Activity Records

A triggered rule should create a record containing where applicable:

- Store.
- Related transaction(s).
- Triggered rule.
- Time.
- Product.
- Quantity/activity.
- Status.

Authorized users must be able to review the event.

---

# 10. Store Monitoring Requirements

## FR-21 — Store Connectivity Monitoring

The system must maintain information allowing authorized users to determine whether stores are synchronizing normally.

It should identify stores that have not synchronized for a configured period.

## FR-22 — Store Status

The central dashboard should communicate understandable store states such as:

```text
ONLINE
OFFLINE
SYNCING
SYNC_FAILED
```

Operational health such as `HEALTHY` or `ATTENTION_REQUIRED` is separate from connectivity state.

---

# 11. Notification Requirements

## FR-23 — Immediate Alerts

Immediate operational alerts must be supported for events requiring quick action:

- Low stock.
- Suspicious activity.
- Prolonged store outage.
- Important synchronization failure.

**Amazon SNS** should handle immediate notification workflows.

## FR-24 — Detailed Emails

Detailed business communication should be supported for:

- Daily inventory reports.
- Reconciliation reports.
- Conflict reports.
- Supplier restocking requests.

**Amazon SES** should handle these formal email workflows.

## FR-25 — Notification Failure Handling

A notification failure must not corrupt, reverse, or falsely invalidate the underlying inventory operation.

Notification status should be logged separately where appropriate.

---

# 12. Dashboard Requirements

## FR-26 — Central Dashboard

The application must provide a role-appropriate central dashboard.

For managers/administrators it should provide visibility into:

- Total stores.
- Store connectivity.
- Inventory status.
- Low-stock products.
- Pending synchronization.
- Reconciliation activity.
- Open conflicts.
- Suspicious activity.
- Recent alerts.

## FR-27 — Dashboard Drill-Down

Important metrics should lead to relevant details.

Example:

```text
Open Conflicts: 3
       ↓
Conflict List
       ↓
Individual Conflict
       ↓
Transaction Details
```

---

# 13. Inventory Interface

## FR-28 — Product List

Authorized users should be able to view:

- Product name.
- Product ID/SKU.
- Store.
- Quantity.
- Threshold.
- Stock status.

## FR-29 — Product Details

Users with appropriate permissions should be able to view detailed product information and inventory activity.

---

# 14. Transaction History

## FR-30 — Transaction History

Authorized users should be able to view historical transactions.

Useful filters include:

- Store.
- Product.
- Date.
- Transaction status.
- Synchronization status.
- Suspicious status.

## FR-31 — Transaction Traceability

A transaction should be traceable from creation through synchronization and processing.

```text
Created Offline
      ↓
Pending
      ↓
Uploaded
      ↓
Replayed
      ↓
Applied
      ↓
Reconciled
```

Traceability is a core requirement.

---

# 15. Reports

## FR-32 — Inventory Report

The system should generate inventory summaries containing information such as:

- Products updated.
- Current stock.
- Low-stock items.
- Store-level inventory.
- Relevant changes.

## FR-33 — Reconciliation Report

The system should generate reconciliation summaries containing:

- Products updated.
- Conflicts.
- Suspicious activity.
- Low stock.
- Transactions processed.

## FR-34 — Conflict Report

The system should provide detailed information about detected conflicts.

## FR-35 — Restocking Request

The system should support generating restocking requests containing:

```text
Product
Current Stock
Required Quantity
Store
Request Details
```

These may be sent through SES to the relevant supplier.

---

# 16. Data Requirements

The system should logically maintain records for at least:

### Users

```text
User
Role
Store / Organization
Authentication reference
Status
```

### Stores

```text
Store ID
Store Name
Connectivity Status
Last Synchronization
Status
```

### Products

```text
Product ID
Product Name
SKU
Threshold
```

### Inventory

```text
Store
Product
Quantity
Last Updated
```

### Transactions

```text
Transaction ID
Store
Product
Quantity
Type
Timestamp
Created Mode
Synchronization Status
Processing Status
```

### Conflicts

```text
Conflict ID
Store
Product
Expected Value
Actual Value
Difference
Related Transaction(s)
Status
Timestamp
```

### Suspicious Activity

```text
Alert ID
Store
Related Transaction(s)
Triggered Rule
Timestamp
Status
```

### Notifications

```text
Notification ID
Type
Recipient
Related Event
Status
Timestamp
```

The exact schema and DynamoDB design belong in `architecture.md`.

---

# 17. Non-Functional Requirements

## NFR-01 — Reliability

Temporary network failure must not cause legitimate offline sales to disappear.

## NFR-02 — Data Integrity

The system must prevent:

- Accidental duplicate processing.
- Silent inventory corruption.
- Untraceable inventory changes.
- Partial processing being presented as complete.

## NFR-03 — Idempotency

Repeated delivery of the same transaction or transaction log must not apply the same inventory change multiple times.

## NFR-04 — Availability

The store-side transaction workflow should remain usable during temporary outages.

Cloud-dependent operations may be unavailable while disconnected, but local transaction recording must continue.

## NFR-05 — Scalability

The architecture should support multiple stores and increasing transaction volumes without manual server provisioning.

## NFR-06 — Performance

Normal interactions should feel responsive.

Offline sales recording must not depend on a cloud response.

Cloud reconciliation should process pending transactions efficiently and expose meaningful status.

## NFR-07 — Security

The system must:

- Authenticate users.
- Authorize operations by role.
- Protect application data.
- Prevent unauthorized cross-store access.
- Validate incoming transaction data.
- Protect APIs and AWS resources according to the implemented security model.

## NFR-08 — Observability

Important operations should be observable through appropriate logs and monitoring.

The system should provide enough information to investigate:

- Failed synchronization.
- Failed processing.
- Conflicts.
- Notification failures.
- Unexpected application errors.

Amazon CloudWatch will be used for AWS-side monitoring/logging where appropriate.

## NFR-09 — Usability

The application must be understandable to non-technical retail users.

Users should not need to understand AWS, Lambda, S3, or distributed systems to operate it.

## NFR-10 — Responsive Design

The application should provide a usable interface across the target desktop/tablet/mobile form factors defined during design.

---

# 18. Error and Failure Requirements

## Network Failure

```text
Network unavailable
 ↓
Store enters offline mode
 ↓
Transactions continue locally
```

## Synchronization Failure

```text
Upload fails
 ↓
Transaction remains pending / failed
 ↓
User is informed
 ↓
Retry can occur
```

## Processing Failure

```text
Lambda processing fails
 ↓
Transaction is NOT falsely marked reconciled
 ↓
Failure is logged
 ↓
Retry/recovery mechanism
```

## Conflict

```text
Mismatch detected
 ↓
Conflict created
 ↓
Inventory state is not silently overwritten
 ↓
Authorized user reviews
```

## Notification Failure

```text
Inventory event succeeds
 ↓
Notification attempt fails
 ↓
Notification failure logged
 ↓
Inventory operation remains intact
```

---

# 19. System Boundaries

### In Scope

- Store sales recording.
- Offline transaction storage.
- Transaction synchronization.
- Transaction replay.
- Inventory reconciliation.
- Conflict detection.
- Rule-based suspicious activity detection.
- Low-stock detection.
- Store synchronization monitoring.
- Notifications.
- Reports.
- Central dashboard.
- Role-based access.
- AWS serverless infrastructure.

### Outside Core Scope

- Payment processing.
- Full accounting.
- Payroll.
- Complete ERP functionality.
- Machine-learning fraud prediction.
- Computer vision.
- General-purpose CRM.
- Replacing a full enterprise POS ecosystem.

---

# 20. Automation / AI Boundary

The core reconciliation engine is deterministic and rule-based.

The system may automatically:

- Detect connectivity state.
- Queue transactions.
- Initiate synchronization.
- Process transaction events.
- Replay transactions.
- Detect defined conflicts.
- Apply predefined suspicious-activity rules.
- Detect low stock.
- Generate notifications and reports.

Human users remain responsible for decisions such as:

- Reviewing serious conflicts.
- Determining whether suspicious activity is actually fraudulent.
- Authorizing inventory corrections where required.
- Taking operational action after alerts.
- Approving supplier-related decisions.

Automation should support human decision-making rather than silently making high-impact business decisions.

---

# 21. Core User Journeys

## Journey A — Normal Sale

```text
Login
 ↓
Store Dashboard
 ↓
Select Product
 ↓
Enter Quantity
 ↓
Record Sale
 ↓
Transaction Stored
 ↓
Inventory Updated
```

## Journey B — Offline Sale

```text
Login
 ↓
Store Dashboard
 ↓
Internet Lost
 ↓
Offline Indicator
 ↓
Record Sale
 ↓
Transaction Stored Locally
 ↓
Transaction Marked Pending
 ↓
Continue Selling
```

## Journey C — Reconnection

```text
Internet Restored
 ↓
Application Detects Connection
 ↓
Pending Transactions Found
 ↓
Synchronization Begins
 ↓
Transaction Log Uploaded
 ↓
Cloud Processing Triggered
 ↓
Transactions Replayed
 ↓
Inventory Reconciled
 ↓
Status Updated
```

## Journey D — Conflict

```text
Offline Transactions Uploaded
 ↓
Replay / Reconciliation
 ↓
Mismatch Detected
 ↓
Conflict Created
 ↓
Manager/Admin Alerted
 ↓
Conflict Reviewed
 ↓
Resolution Recorded
```

## Journey E — Suspicious Activity

```text
Transactions Processed
 ↓
Rule Evaluated
 ↓
Rule Triggered
 ↓
Suspicious Activity Record Created
 ↓
SNS Alert
 ↓
Manager/Admin Reviews
```

## Journey F — Low Stock

```text
Inventory Updated
 ↓
Stock Compared With Threshold
 ↓
Threshold Crossed
 ↓
Low-Stock Event
 ↓
SNS Alert
 ↓
Restocking Workflow / SES
```

---

# 22. Requirements Traceability

| Project Goal | Required Capability |
|---|---|
| Continue selling during outages | Offline transaction recording |
| Recover after reconnection | Automatic synchronization |
| Preserve transaction history | Individual event logging |
| Reconstruct inventory changes | Transaction replay |
| Detect mismatches | Reconciliation + conflict detection |
| Identify suspicious activity | Rule-based detection |
| React to operational problems | SNS alerts |
| Communicate detailed information | SES emails |
| Monitor distributed stores | Central dashboard |
| Avoid server management | Serverless AWS architecture |
| Investigate failures | Logging and monitoring |

---

# 23. MVP Requirements

The minimum viable version must demonstrate this complete critical path:

```text
Store records sale
      ↓
Internet goes down
      ↓
Store records sale offline
      ↓
Transaction remains locally pending
      ↓
Internet returns
      ↓
Transaction synchronizes
      ↓
Cloud processing occurs
      ↓
Transaction is replayed
      ↓
Inventory is updated/reconciled
      ↓
Result appears on dashboard
```

The MVP should also demonstrate at least:

- One conflict-detection scenario.
- One rule-based suspicious-activity scenario.
- One low-stock alert.
- One SNS notification workflow.
- One SES email/report workflow.
- Role-based access.
- Basic error handling.
- Basic monitoring/error visibility.

---

# 24. Definition of Done

A feature is complete only when:

1. Its UI exists where required.
2. Its required data flow works.
3. Appropriate permissions are enforced.
4. Success states are handled.
5. Failure states are handled.
6. Data remains consistent.
7. The feature integrates with the rest of the system.
8. It can be demonstrated through a realistic user journey.
9. Relevant logs/status information exists where required.
10. It does not break the offline-first workflow.

The project is not considered complete merely because individual screens exist.

---

# 25. Priority Classification

## P0 — Must Have

- Authentication.
- Role-based access.
- Store identification.
- Product/inventory data.
- Sale recording.
- Offline transaction recording.
- Pending transaction queue.
- Synchronization.
- Transaction replay.
- Inventory reconciliation.
- Conflict detection.
- Central dashboard.
- Error handling.
- Transaction integrity and idempotency.

## P1 — Important

- Rule-based suspicious activity detection.
- Low-stock detection.
- SNS alerts.
- SES reports.
- Store connectivity monitoring.
- Conflict resolution workflow.
- Detailed transaction history.
- Reporting.

## P2 — Enhancement

Potential future enhancements:

- More sophisticated rule configuration.
- Advanced analytics.
- Additional stakeholder portals.
- Expanded reporting.
- More advanced reconciliation strategies.

P2 features must never compromise the reliability of the P0 offline/reconciliation workflow.

---

# 26. Guiding Requirement

Every development decision should ultimately support:

> **A retail store must be able to keep operating during a temporary network failure, and when connectivity returns, every legitimate offline transaction should be recoverable, traceable, and safely reconciled with the central inventory.**
