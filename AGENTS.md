# AGENTS.md — Agent Behavior Rules for This Project

These are instructions for the AI coding agent working in this repository. They govern **how** the agent should work — not what the system does (that's `rules.md`, the business/domain rule set).

---

## 1. Source-of-Truth Hierarchy

When documents disagree, or a decision isn't obvious from code alone, resolve in this order:

1. `architecture.md` — technical architecture, state machines, schema, API contract (§16)
2. `rules.md` — business/domain rules (validation, fraud detection, RBAC, notifications)
3. `projectrequirements.md` — scope and functional requirements
4. `design.md` — UI/visual spec
5. `memory.md` — current build status and next steps

**Never resolve a disagreement by inventing a third option.** If two documents genuinely conflict, stop and flag it in the response rather than silently picking one — this project has already had real cross-document drift (transaction lifecycle states, store-connectivity states) and re-introducing it is the failure mode this file exists to prevent.

## 2. Canonical Vocabulary — Do Not Rename or Reinvent

Use these exact terms everywhere in code (variable names, enums, DB values, API responses). Do not use synonyms, and do not shorten/rename them for convenience:

- **Transaction lifecycle:** `CREATED → PENDING → SYNCING → PROCESSING → RECONCILED → COMPLETED`, with exceptions `CONFLICT`, `FLAGGED`, `REJECTED` (architecture.md §6). `UPLOAD_ATTEMPT` is a sync-level sub-state of `PENDING`, never a transaction lifecycle value.
- **Store connectivity:** `ONLINE / OFFLINE / SYNCING / SYNC_FAILED` (architecture.md §10). `HEALTHY` / `ATTENTION_REQUIRED` is a separate, derived dashboard concept — never conflate it with connectivity state.
- **Conflict status:** `OPEN / UNDER_REVIEW / RESOLVED / ESCALATED` (projectrequirements.md FR-18).
- **Suspicious activity status:** `FLAGGED / REVIEWED`.

If a new state genuinely needs to exist, update `architecture.md` (or the relevant doc) **first**, in the same change, before writing code that uses it — never let code and docs diverge.

## 3. Schema & API Contract Authority

`architecture.md` §16 (Data Model and API Contract) is the canonical DynamoDB table design and API surface. Before adding a new table, attribute, or endpoint:

- Check §16 first — extend it in the same change rather than improvising a schema in code that the docs don't reflect.
- Do not rename partition/sort keys already defined there without updating §16.
- Do not add AWS services beyond those listed in architecture.md §4 without flagging it — this is a defined, deliberately scoped serverless stack (API Gateway, Lambda, S3, SQS FIFO+DLQ, DynamoDB+Streams, Step Functions, SNS, SES, CloudWatch, Cognito).

## 4. Tech Stack Lock

Per `memory.md`, the stack is fixed:

- Frontend: React + Vite + Tailwind CSS, IndexedDB for local offline storage
- Backend/local POS logic: **TypeScript**, not JavaScript — this is a stated preference, not a default; do not write new `.js` files where `.ts`/`.tsx` is expected
- IaC: AWS SAM or Serverless Framework
- Data format: JSON

Don't substitute alternative libraries, state managers, ORMs, or IaC tools without calling it out explicitly — treat any such swap as a decision for the person to confirm, not a default to silently take.

## 5. Offline-First Invariants

This system's entire premise is that stores keep working with no connectivity. Any code touching sale recording, the local queue, or sync must assume:

- The network may be unavailable at any point, including mid-write.
- Local writes (IndexedDB) must succeed independently of cloud reachability.
- Every transaction gets a client-generated `transaction_id` at creation time — never a server-assigned ID — so idempotent replay works per architecture.md §8.
- Sync is retried, not blocking; a failed upload returns the transaction to `PENDING`, never to a dead end.

## 6. Idempotency & Concurrency

- Every place that processes a transaction must be safe to run twice on the same `transaction_id` (conditional writes, not blind puts).
- Inventory updates must use the `version` field / conditional writes described in architecture.md §14 — never a read-then-write without a version check.

## 7. Role-Based Access

Enforce role checks (`STORE_STAFF / STORE_MANAGER / ADMIN / SUPPLIER`) on every new endpoint per rules.md RULE-048–051. Don't add an endpoint without stating which role(s) can call it, and don't default to "any authenticated user."

## 8. Configuration, Not Hardcoding

Thresholds (low-stock, suspicious-quantity, offline-alert duration, retry counts) must be configurable, per rules.md §21 — never hardcode a magic number where the docs describe it as a configurable value. Never write secrets, API keys, or credentials into any file the agent creates — use environment variables or a secrets manager.

## 9. Testing Expectations

For any change touching transaction processing, conflict detection, suspicious-activity detection, or sync/idempotency, include or update a test covering:

- The happy path
- At least one exception path from the state machine (§6) relevant to the change
- A duplicate/replay case if the change touches idempotency

## 10. Traceability

Reference the relevant `FR-xx` (projectrequirements.md) or `RULE-xxx` (rules.md) ID in commit messages or PR descriptions when implementing a requirement, so changes stay traceable back to spec.

## 11. When Unsure

If a requirement is ambiguous, under-specified, or the docs conflict, say so and propose an option rather than silently guessing — this mirrors how `memory.md` is meant to track open questions. Update `memory.md`'s status/next-steps section when a meaningful implementation milestone is reached.

## 12. Skill Usage Guidelines

The workspace includes active agent skills in `.agents/skills/` and specialized libraries in the root. Use them whenever necessary according to the task domain:

- **UI & Frontend Development**:
  - `ui-ux-pro-max`: Use for page/dashboard layout, color palette generation, accessibility (WCAG), typography, and tech stack guidance (React + Tailwind). Run `python .agents/skills/ui-ux-pro-max/scripts/search.py` for design system generation and style queries.
  - `ui-styling` & `design-system`: Use for Tailwind CSS tokens, component specifications, responsive layouts, and accessible component patterns.
- **Workflow & Engineering Methodology (Superpowers)**:
  - `systematic-debugging`: Use whenever investigating unexpected behavior, bugs, or failing tests before modifying code.
  - `test-driven-development`: Use when adding new domain logic, sync rules, or transaction state transitions.
  - `verification-before-completion`: Use before declaring any implementation task complete to ensure all requirements, edge cases, and tests pass.
  - `writing-plans` & `executing-plans`: Use for multi-phase tasks or major architectural increments.
- **Domain-Specific Patterns (Agentic Awesome Skills)**:
  - Consult `agentic-awesome-skills/CATALOG.md` and `agentic-awesome-skills/skills_index.json` when encountering specialized requirements (e.g. DynamoDB streams, SQS FIFO error handling, IndexedDB storage management, POS hardware/offline protocols, or security compliance checks). Reference or pull from `agentic-awesome-skills/skills/<skill-name>/SKILL.md` as needed.

