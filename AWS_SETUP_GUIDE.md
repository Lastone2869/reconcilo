# Reconcilo — AWS Setup & Deployment Guide

> **Important Note:** This guide is ordered by the exact sequence in which you need each AWS facility. Each section explains why the facility is needed at that stage, followed by beginner-friendly, click-by-click console steps.

---

## Progress Checklist

| # | Facility / Service | Why Needed At This Step | Status |
|---|--------------------|-------------------------|--------|
| 1 | **DynamoDB** (10 tables) | Foundation: All transactional data, inventory, and audit logs live here | ☑️ **Done** |
| 2 | **Amazon S3** (Sync bucket) | Ingestion storage: POS devices upload bulk transaction batches here | ☑️ **Done** |
| 3 | **Amazon Cognito** (User Pool) | Authentication: Issues JWTs and enforces RBAC roles (Staff, Manager, Admin, Supplier) | ☑️ **Done** |
| 4 | **Amazon SQS FIFO + DLQ** | Ordering & Quarantine: Serializes transaction ingestion per store node | ☑️ **Done** |
| 5 | **Amazon SNS** (Operational Alerts) | Monitoring: Immediate notifications for low-stock, oversells, and anomalies | ☑️ **Done** |
| 6 | **Amazon SES** (Email Service) | Compliance: Sends detailed end-of-shift reports and reconciliation summaries | ☑️ **Done** |
| 7 | **AWS Step Functions** | Workflow: Orchestrates deterministic replay, reconciliation, and conflict detection | ☑️ **Done** |
| 8 | **AWS Lambda** (Core Replay Engine) | Compute: Executes backend handlers triggered by S3, SQS, API Gateway, and Streams | ☑️ **Done** |
| 9 | **DynamoDB Streams** | Real-Time Sync: Captures CDC row mutations to feed live dashboard updates | ☑️ **Done** |
| 10 | **API Gateway** (HTTP + WS) | Connectivity: Front door for HTTP REST requests and live WebSocket dashboard pushes | ☑️ **HTTP Live** |
| 11 | **Amazon CloudWatch** | Observability: Collects Lambda execution logs and triggers high-error alarms | ☑️ **Done** |

---

## 1. Amazon DynamoDB (Database Foundation)

### Why this is needed first:
Before any Lambda handlers or batch processors can run, the data storage tables must exist. The Reconcilo architecture relies on 10 distinct tables with optimistic concurrency versioning on the `Inventory` table and client-generated primary keys on `Transactions`.

### Click-by-Click Console Steps:
1. Open the [AWS Management Console](https://console.aws.amazon.com/) and search for **DynamoDB**.
2. Click **Create table**.
3. Create each of the 10 tables below with **On-Demand Capacity**:

| Table Name | Partition Key (PK) | Sort Key (SK) | Special Configuration |
|---|---|---|---|
| `Stores` | `store_id` (String) | — | — |
| `Users` | `user_id` (String) | — | — |
| `Products` | `product_id` (String) | — | — |
| `Inventory` | `store_id` (String) | `product_id` (String) | Composite Key; Streams: `NEW_AND_OLD_IMAGES` |
| `Transactions` | `transaction_id` (String) | — | GSI: `store_id` (PK) + `created_at` (SK) |
| `SyncBatches` | `batch_id` (String) | — | Streams: `NEW_AND_OLD_IMAGES` |
| `Conflicts` | `conflict_id` (String) | — | Streams: `NEW_AND_OLD_IMAGES` |
| `SuspiciousActivity` | `alert_id` (String) | — | Streams: `NEW_AND_OLD_IMAGES` |
| `Notifications` | `notification_id` (String) | — | — |
| `AuditRecords` | `audit_id` (String) | `created_at` (String) | Time-series append-only audit trail |

4. **Add Global Secondary Index (GSI) to Transactions Table:**
   - Click `Transactions` table &rarr; **Indexes** tab &rarr; **Create index**.
   - Partition key: `store_id` (String).
   - Sort key: `created_at` (String).
   - Index name: `store_id-created_at-index`.

---

## 2. Amazon S3 (Sync Batch Ingestion Bucket)

### Why this is needed now:
Offline POS devices aggregate queued transactions into batch JSON files and upload them to S3 before triggering the asynchronous processing pipeline.

### Click-by-Click Console Steps:
1. Open the AWS Console and navigate to **S3**.
2. Click **Create bucket**.
3. Bucket name: `reconcilo-sync-batches-<your-account-id>` (must be globally unique).
4. Region: Choose your deployment region (e.g. `us-east-1`).
5. Leave default encryption and block public access settings enabled.
6. Click **Create bucket**.
7. In the bucket's **Permissions** tab &rarr; **CORS configuration**, paste:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": ["ETag"]
     }
   ]
   ```

---

## 3. Amazon Cognito (User Authentication & RBAC)

### Why this is needed now:
All API endpoints enforce strict Role-Based Access Control (RBAC). Cognito manages users, credentials, and role groups (`STORE_STAFF`, `STORE_MANAGER`, `ADMIN`, `SUPPLIER`).

### Click-by-Click Console Steps:
1. Open the AWS Console and search for **Cognito**.
2. Click **Create user pool**.
3. Select **Email** as the sign-in option.
4. Set User Pool Name: `reconcilo-users`.
5. Under **App integration** &rarr; **Create app client**:
   - App client name: `reconcilo-web-app`.
   - Client secret: **Don't generate client secret** (public SPA client).
6. Click into the newly created User Pool &rarr; **Groups** tab &rarr; create 4 groups:
   - `STORE_STAFF`
   - `STORE_MANAGER`
   - `ADMIN`
   - `SUPPLIER`
7. Copy the **User Pool ID** and **App Client ID** into your `.env` file:
   - `COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx`
   - `COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## 4. Amazon SQS FIFO + DLQ (Serialized Queueing)

### Why this is needed now:
To preserve chronological sale ordering per store terminal without race conditions, transactions must be queued in a FIFO queue grouped by `store_id`.

### Click-by-Click Console Steps:
1. Open the AWS Console and search for **SQS**.
2. **First, create the Dead Letter Queue (DLQ):**
   - Click **Create queue** &rarr; select **FIFO**.
   - Name: `reconcilo-processing-dlq.fifo`.
   - Click **Create queue**. Copy its ARN.
3. **Second, create the Main Processing FIFO Queue:**
   - Click **Create queue** &rarr; select **FIFO**.
   - Name: `reconcilo-processing-queue.fifo`.
   - Scroll to **Dead-letter queue** &rarr; select **Enabled**.
   - Select `reconcilo-processing-dlq.fifo` as the target DLQ.
   - Maximum receives: `3`.
   - Click **Create queue**.
4. Copy the **Queue URL** to your `.env` as `SQS_QUEUE_URL`.

---

## 5. Amazon SNS (Operational Alerts Topic)

### Why this is needed now:
Provides instant alerts when stock drops below threshold, oversell conflicts occur, or suspicious transaction volumes are detected.

### Click-by-Click Console Steps:
1. Open the AWS Console and search for **SNS**.
2. Click **Topics** &rarr; **Create topic**.
3. Type: **Standard**.
4. Name: `reconcilo-operational-alerts`.
5. Click **Create topic**.
6. On the topic details page, click **Create subscription**:
   - Protocol: **Email**.
   - Endpoint: `your-email@example.com`.
7. Check your email and click **Confirm subscription**.
8. Copy the **Topic ARN** to your `.env` as `SNS_TOPIC_ARN`.

---

## 6. Amazon SES (Email Reports)

### Why this is needed now:
Sends formatted HTML shift reconciliation summaries and restock orders to store managers and supplier partners.

### Click-by-Click Console Steps:
1. Open the AWS Console and search for **SES**.
2. In the left navigation, click **Verified identities** &rarr; **Create identity**.
3. Select **Email address** and enter your sending email address.
4. Click **Create identity**, check your inbox, and verify the verification link.
5. In development (sandbox mode), also verify any recipient email addresses you intend to test with.

---

## 7. AWS Step Functions (Reconciliation State Machine)

### Why this is needed now:
Coordinates the multi-step reconciliation pipeline:
`Validate Batch -> Reconcile Inventory (Versioned) -> Parallel (Conflict Check + Suspicious Heuristics) -> Consolidate -> Notify`.

### Click-by-Click Console Steps:
1. Open the AWS Console and search for **Step Functions**.
2. Click **Create state machine**.
3. Select **Write your workflow in code** &rarr; Type: **Standard**.
4. Paste the state machine definition from `infrastructure/template.yaml`.
5. Name: `reconcilo-reconciliation-workflow`.
6. Click **Create state machine** and copy the **State Machine ARN**.

---

## 8. AWS Lambda (Serverless Compute Functions)

### Why this is needed now:
Runs all event-driven logic. Functions are triggered by S3 uploads, SQS messages, DynamoDB stream events, and API Gateway requests.

### Click-by-Click Console Steps:
1. Open the AWS Console and search for **Lambda**.
2. Create the functions using **Node.js 20.x** runtime:
   - `reconcilo-ingestion` (Triggered by S3 object creation `transactions/*.json`)
   - `reconcilo-processing` (Triggered by SQS FIFO queue)
   - `reconcilo-auth`
   - `reconcilo-inventory`
   - `reconcilo-transactions`
   - `reconcilo-sync-batch`
   - `reconcilo-dashboard`
   - `reconcilo-conflicts`
   - `reconcilo-suspicious`
   - `reconcilo-admin`
   - `reconcilo-stream-consumer` (Triggered by DynamoDB Streams)
   - `reconcilo-websocket` (API Gateway WebSocket $connect, $disconnect, $default)

---

## 9. Amazon API Gateway (HTTP REST & WebSocket APIs)

### Why this is needed now:
Connects the React frontend to the backend Lambda functions.

### Click-by-Click Console Steps:
1. **HTTP API:**
   - Open **API Gateway** &rarr; Create API &rarr; **HTTP API**.
   - Name: `reconcilo-http-api`.
   - Add routes: `/auth/login`, `/stores/{storeId}/inventory`, `/stores/{storeId}/transactions`, `/conflicts`, etc.
   - Attach Cognito JWT Authorizer to protected routes.
   - Copy the HTTP API URL to `frontend/.env` as `VITE_API_URL`.
2. **WebSocket API:**
   - Create API &rarr; **WebSocket API**.
   - Name: `reconcilo-websocket-api`.
   - Route Selection Expression: `$request.body.action`.
   - Add routes: `$connect`, `$disconnect`, `$default`.
   - Connect to `reconcilo-websocket` Lambda.
   - Deploy to `production` stage and copy URL to `frontend/.env` as `VITE_WS_URL`.

---

## 10. Amazon CloudWatch (Observability & Alarms)

### Why this is needed now:
Ensures continuous operational visibility and alerts engineers if Lambda error rates spike.

### Click-by-Click Console Steps:
1. Open the AWS Console and search for **CloudWatch**.
2. View function execution logs under **Log groups** (`/aws/lambda/reconcilo-*`).
3. Click **Alarms** &rarr; **Create alarm**:
   - Metric: `reconcilo-processing` &rarr; `Errors`.
   - Period: 5 minutes.
   - Threshold: Greater than 5.
   - Action: Send notification to SNS topic `reconcilo-operational-alerts`.
