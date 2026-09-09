# Offline-First Event-Driven Inventory Reconciliation System

## 1. Project Overview

This project is an **offline-first, event-driven inventory reconciliation system for distributed retail stores**.

The system is designed for retail environments where individual stores may temporarily lose internet connectivity but must continue normal sales operations. Instead of stopping sales or depending on a continuously available connection to the central inventory system, each store can continue recording transactions locally during an outage.

When internet connectivity is restored, the store uploads its pending transaction data to the cloud. The system then automatically processes the transactions, replays them in sequence, reconciles the store's inventory with the central inventory, detects conflicts and suspicious activity, and updates the central system.

The project uses a **serverless AWS architecture** so that the application does not require user-managed backend servers. AWS services handle storage, event triggering, computation, database operations, notifications, email communication, and monitoring.

The central idea is:

> **Stores should be able to keep selling during network failures, and the system should be able to recover and reconcile those transactions reliably when connectivity returns.**

---

## 2. Problem Statement

Conventional inventory systems generally assume that a store has a continuous connection to a central server or cloud database.

This creates several problems:

- A network outage can interrupt inventory synchronization.
- Stores may still need to continue selling while disconnected.
- Simply updating the final stock value after reconnection can hide the sequence of transactions that caused the change.
- Offline and central inventory values may conflict.
- Suspicious transaction patterns may go unnoticed during synchronization.
- Managers may not immediately know about low stock, suspicious activity, or prolonged store outages.
- Manual reconciliation increases operational effort and the possibility of errors.

The proposed system addresses these problems by treating offline transactions as an **event log** that can be uploaded and replayed after reconnection.

---

## 3. Core Idea

The system follows an **offline-first approach**.

A simplified lifecycle is:

```text
Store Online
    ↓
Normal Sales
    ↓
Internet Failure
    ↓
Sales Continue Offline
    ↓
Transactions Stored Locally
    ↓
Internet Restored
    ↓
Transaction Log Uploaded
    ↓
Cloud Processing Triggered
    ↓
Transactions Replayed in Sequence
    ↓
Inventory Reconciliation
    ↓
Conflict Detection
    ↓
Rule-Based Fraud Detection
    ↓
Inventory Updated
    ↓
Alerts / Reports Generated
    ↓
Dashboard Updated
```

The important distinction is that the system does not only compare the final inventory values. It preserves and processes the individual transactions so that the system can understand **what happened and in what order**.

---

## 4. Main Project Objective

The primary objective is to build a reliable inventory synchronization system for distributed retail stores that:

1. Allows stores to continue recording sales during temporary network outages.
2. Stores offline transactions safely until connectivity is restored.
3. Automatically uploads pending transactions after reconnection.
4. Processes uploaded transaction logs through an event-driven workflow.
5. Replays transactions in sequence.
6. Reconciles offline transactions with the central inventory.
7. Detects inventory conflicts and mismatches.
8. Applies rule-based detection of suspicious transaction patterns.
9. Sends immediate operational alerts when action is required.
10. Generates detailed reports for managers and other stakeholders.
11. Provides a centralized dashboard for monitoring stores and inventory.
12. Uses a serverless cloud architecture that can scale without manually managing servers.

---

## 5. Users of the System

### 5.1 Store Staff

Store staff are responsible for normal sales operations.

They should be able to:

- Record sales.
- Continue recording sales during internet outages.
- View relevant local inventory information.
- Allow pending transactions to synchronize when connectivity returns.

### 5.2 Store Manager

The store manager monitors the store's operational and inventory status.

They should be able to:

- View inventory.
- View synchronization status.
- Review conflicts.
- Receive low-stock alerts.
- Receive suspicious-activity alerts.
- Receive store-offline alerts.
- View reconciliation results and reports.

### 5.3 Headquarters / Inventory Administrator

The central operations team manages inventory across multiple stores.

They should be able to:

- Monitor multiple stores.
- View centralized inventory.
- Track synchronization.
- Review reconciliation conflicts.
- Review suspicious transactions.
- Monitor stock levels.
- Access reports.
- Track store connectivity and system activity.

### 5.4 Supplier

A supplier may receive relevant restocking communication generated by the system.

The supplier does not need access to the entire internal system. Communication can be limited to appropriate restocking requests or related reports.

---

## 6. Key Features

### Offline-First Sales

Stores can continue recording transactions when internet connectivity is unavailable.

### Transaction Logging

Offline transactions are preserved as individual transaction records rather than only storing the final stock value.

### Automatic Synchronization

When connectivity returns, pending transaction data is uploaded to the cloud.

### Transaction Replay

Transactions are processed in their appropriate sequence so that the system can reconstruct the inventory changes caused by offline activity.

### Inventory Reconciliation

The system compares and reconciles offline transaction activity with the central inventory state.

### Conflict Detection

The system identifies mismatches such as differences between expected and actual inventory.

Example:

```text
Expected Stock: 50
Actual Stock:   47
Difference:      3
```

The system records the conflict so that it can be investigated rather than silently ignoring the discrepancy.

### Rule-Based Fraud Detection

The system checks predefined transaction rules for suspicious activity.

Example:

```text
50 TVs sold
within 2 minutes
        ↓
Suspicious activity detected
        ↓
Alert generated
```

This is **rule-based detection**, not a machine-learning fraud model.

### Low-Stock Detection

When inventory falls below a configured threshold, the system generates an immediate alert.

Example:

```text
Laptop Stock: 4
Threshold:    5
        ↓
Low-stock alert
```

### Store Connectivity Monitoring

The system can identify stores that have not synchronized for a configured period.

Example:

```text
Store A
Offline / unsynchronized for 2 hours
        ↓
Operational alert
```

### Notifications and Reports

The project distinguishes between immediate alerts and detailed business communication.

- **Amazon SNS** is used for immediate operational alerts such as low stock, suspicious activity, or prolonged store outages.
- **Amazon SES** is used for detailed emails such as reconciliation reports, conflict reports, daily inventory reports, and supplier restocking requests.

### Central Dashboard

The dashboard provides an overview of:

- Store status.
- Inventory status.
- Synchronization status.
- Reconciliation results.
- Conflicts.
- Suspicious activity.
- Low-stock products.
- Relevant alerts and reports.

---

## 7. Project Architecture — High-Level View

The project follows a **cloud-native, event-driven, serverless architecture**.

At a high level:

```text
                    ┌─────────────────────┐
                    │     Retail Store    │
                    │                     │
                    │ Sales / Offline Log │
                    └──────────┬──────────┘
                               │
                    Internet Restored
                               │
                               ▼
                    ┌─────────────────────┐
                    │      Amazon S3      │
                    │ Transaction Storage │
                    └──────────┬──────────┘
                               │
                         Event Trigger
                               │
                               ▼
                    ┌─────────────────────┐
                    │     AWS Lambda      │
                    │ Transaction Engine  │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼─────────────────┐
              │                │                 │
              ▼                ▼                 ▼
        Reconciliation   Conflict Detection   Fraud Rules
              │                │                 │
              └────────────────┼─────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     DynamoDB        │
                    │ Central Data Store   │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┴─────────────┐
                 ▼                           ▼
          Amazon SNS                    Amazon SES
        Immediate Alerts             Detailed Emails
                 │                           │
                 └─────────────┬─────────────┘
                               ▼
                    ┌─────────────────────┐
                    │      Dashboard      │
                    └─────────────────────┘
```

The detailed architecture, APIs, data flow, database structure, and service interactions will be documented separately in `architecture.md`.

---

## 8. AWS and Serverless Concept

The system is designed around managed AWS services:

- **Amazon S3** — transaction-log storage and durable synchronization batches.
- **AWS Lambda** — event-driven ingestion and processing.
- **Amazon SQS FIFO** — per-store ordered batch processing.
- **Amazon DynamoDB** — central inventory and operational data.
- **DynamoDB Streams** — committed database-change events for downstream updates.
- **Amazon API Gateway** — HTTP API layer and WebSocket API for real-time dashboard updates.
- **AWS Step Functions** — reconciliation workflow orchestration.
- **Amazon SNS** — immediate notifications.
- **Amazon SES** — detailed business emails.
- **Amazon CloudWatch** — monitoring and logging.

The architecture is considered serverless because the project team does not provision or maintain traditional application servers. AWS manages the underlying infrastructure, scaling, availability, and execution environment.

The project should not describe "using AWS" alone as its novelty. AWS is the implementation platform; the main innovation is the **offline-first, event-driven reconciliation mechanism**.

---

## 9. Project Novelty

The project's main novelty is its **offline-first reconciliation mechanism**.

Unlike a conventional inventory application that assumes continuous connectivity, this system allows stores to continue operating during temporary network failures. Once connectivity returns, the system automatically processes the accumulated transaction events and reconciles them with the central inventory.

The strongest differentiating features are:

- **Offline-first inventory operations**
- **Event-driven synchronization**
- **Transaction replay rather than only final-value synchronization**
- **Automated inventory conflict detection**
- **Rule-based suspicious transaction detection**
- **Automatic operational alerts**
- **Centralized monitoring of distributed stores**
- **Serverless cloud implementation**

The project should therefore be positioned as a **distributed inventory recovery and reconciliation system**, rather than simply another inventory management application.

---

## 10. Why Transaction Replay Matters

Consider a store that has the following offline transactions:

```text
Initial Stock = 100

Sale 1: 10 units
Sale 2: 15 units
Sale 3: 5 units
Return: 2 units
Sale 4: 8 units
```

The system should not simply upload:

```text
Final Stock Change = -36
```

Instead, it should preserve the events:

```text
Sale 1
   ↓
Sale 2
   ↓
Sale 3
   ↓
Return
   ↓
Sale 4
```

Replaying the transactions provides a traceable sequence of inventory changes and makes it possible to identify where conflicts or suspicious activity occurred.

This is an important part of the project's architecture and novelty.

---

## 11. Event-Driven Processing

The system is designed so that important operations occur in response to events.

For example:

```text
Transaction Log Uploaded
          ↓
       S3 Event
          ↓
      AWS Lambda
          ↓
   Process Transactions
          ↓
 ┌────────┼─────────┐
 ↓        ↓         ↓
Update   Conflict   Fraud
Stock    Detection  Rules
          ↓         ↓
          └────┬────┘
               ↓
        Notifications
               ↓
           Dashboard
```

This avoids requiring a continuously running application server to constantly check whether something has happened.

---

## 12. Development Cycle

The project will be developed incrementally rather than attempting to build the entire system at once.

### Stage 1 — Planning and Requirements

Define:

- Project objective.
- Users.
- Functional requirements.
- Non-functional requirements.
- Core workflows.
- System boundaries.
- AWS services.
- Data requirements.
- Security and error-handling requirements.

### Stage 2 — UX and Design

Design the complete user experience before implementing the application.

This includes:

- Dashboard.
- Store views.
- Inventory views.
- Transaction views.
- Reconciliation screens.
- Conflict screens.
- Fraud/suspicious activity screens.
- Alerts.
- Reports.
- Forms.
- Dialogs.
- Empty states.
- Loading states.
- Error states.
- Responsive layouts.

The visual design will be created using **Google Stitch**.

### Stage 3 — Foundation

Build the project foundation:

- Frontend structure.
- Backend/API structure where required.
- AWS configuration.
- Authentication and authorization structure.
- Database structure.
- Storage structure.
- Core application navigation.

### Stage 4 — Offline Transaction System

Implement:

- Transaction creation.
- Local transaction storage.
- Offline operation.
- Pending transaction tracking.
- Connectivity detection.
- Synchronization initiation.

### Stage 5 — Cloud Reconciliation Engine

Implement:

- Transaction-log upload.
- Event triggering.
- Lambda processing.
- Transaction replay.
- Inventory reconciliation.
- Conflict detection.
- Idempotency and duplicate handling.
- Processing status.

### Stage 6 — Intelligence and Notifications

Implement rule-based operational logic:

- Low-stock detection.
- Suspicious transaction rules.
- Store-offline detection.
- SNS alerts.
- SES reports and business emails.

### Stage 7 — Monitoring and Dashboard

Implement:

- Central inventory dashboard.
- Store health/status.
- Synchronization monitoring.
- Conflict monitoring.
- Suspicious activity monitoring.
- Reports and operational metrics.
- Cloud monitoring and logs.

### Stage 8 — Testing and Hardening

Test:

- Normal online transactions.
- Offline transactions.
- Reconnection.
- Duplicate uploads.
- Interrupted synchronization.
- Conflicting inventory states.
- Invalid transactions.
- Suspicious transaction rules.
- Low-stock conditions.
- Notification failures.
- API failures.
- AWS service failures.
- Authentication/authorization boundaries.

### Stage 9 — Final Integration and Deployment

Integrate all modules, perform end-to-end testing, resolve defects, validate the complete workflow, and prepare the project for demonstration, documentation, and evaluation.

---

## 13. Core Design Philosophy

The project should follow these principles throughout development:

### Reliability First

A temporary network failure should not prevent a store from recording legitimate sales.

### Traceability

Every important inventory change should be explainable through the transaction history.

### Event-Based Processing

Important cloud operations should be triggered by meaningful events rather than unnecessary continuous polling.

### Clear Separation of Responsibilities

Storage, processing, database operations, notifications, reporting, and monitoring should have clearly defined responsibilities.

### Human-Readable Operations

Managers should be able to understand what happened without examining raw technical logs.

### Fail Safely

A failed synchronization or processing operation should not silently corrupt inventory data.

### Scalable Architecture

The design should support multiple stores and increasing transaction volumes without requiring the team to manually operate servers.

### Practical Student Implementation

The project should remain technically impressive but feasible for a student development team. Features should solve the defined inventory-reconciliation problem rather than being added only for complexity.

---

## 14. Project Boundaries

The system is primarily an **inventory reconciliation and synchronization platform**.

It is not intended to become:

- A complete accounting system.
- A payment gateway.
- A full enterprise resource planning system.
- A machine-learning fraud prediction platform.
- A general-purpose CRM.
- A replacement for a retailer's complete POS ecosystem.

Fraud detection in this project is **rule-based** and focuses on identifying predefined suspicious transaction patterns.

The system's core value remains:

> **Reliable inventory continuity during connectivity failures and accurate, traceable reconciliation after reconnection.**

---

## 15. Expected Outcome

At the end of development, the project should demonstrate a realistic distributed retail scenario:

```text
Store A
   ↓
Internet goes down
   ↓
Sales continue
   ↓
Transactions are stored locally
   ↓
Internet returns
   ↓
Transactions synchronize automatically
   ↓
Cloud processing begins
   ↓
Transactions are replayed
   ↓
Inventory is reconciled
   ↓
Conflicts are identified
   ↓
Suspicious activity is checked
   ↓
Relevant alerts/reports are generated
   ↓
Central dashboard reflects the updated state
```

The final system should demonstrate that **temporary loss of connectivity does not have to mean loss of business continuity or loss of inventory traceability**.

---

## 16. One-Line Project Definition

> **An offline-first, event-driven inventory reconciliation system that enables retail stores to continue operating during network failures and automatically replays, reconciles, validates, and monitors offline transactions when connectivity is restored using a serverless AWS architecture.**
