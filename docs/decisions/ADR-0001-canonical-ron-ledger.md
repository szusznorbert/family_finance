# ADR-0001: Canonical RON ledger and receipt source boundary

**Status:** Proposed technical design for EPIC-03-T02; the product rules below were approved by the user
**Date:** 2026-10-26; product rules confirmed 2026-10-27

## Context

The API currently stores households, memberships and seeded expense categories, but no financial entries. `OWNER` and `MEMBER` already have `financial-write` permission; `VIEWER` has read permission. EPIC-03 requires one RON ledger for income, expense and refund, while EPIC-05 must post one approved receipt as exactly one expense. The browser reaches PostgreSQL only through the web rewrite and API.

## Decision

### One canonical entry model

Introduce `LedgerEntry` as the only row that contributes to household financial totals. Its proposed Prisma fields are:

| Field | Storage and meaning |
|---|---|
| `id` | `String @id @default(cuid())` |
| `householdId` | Required household relation; restrict household deletion while financial rows exist |
| `type` | `LedgerEntryType` enum: `INCOME`, `EXPENSE`, `REFUND` |
| `amount` | Positive `Decimal @db.Decimal(18, 2)`; API accepts and emits a two-decimal string, never a JS number |
| `currency` | `String @db.Char(3)` fixed to `RON` in the MVP |
| `occurredOn` | `DateTime @db.Date`, transported as `YYYY-MM-DD`; monthly buckets compare calendar dates |
| `categoryId` | Nullable expense-category relation; when supplied, a composite `(householdId, categoryId)` foreign key must target the same household's category |
| `note` | Optional bounded user text; validation at the API boundary |
| `createdByUserId`, `createdAt`, `updatedAt` | Creator identifier and audit timestamps; the creator ID remains as a scalar if a user later leaves |
| `sourceType`, `sourceId` | Required source identity; `MANUAL` uses the client's stable request UUID, `RECEIPT` uses the receipt ID |
| `sourceRequestHash` | For manual writes, SHA-256 of the canonical validated intent, retained to distinguish a safe retry from key reuse with different content |

Add `@@unique([sourceType, sourceId])`, `@@index([householdId, occurredOn, id])`, and the required composite category key on `ExpenseCategory` (`@@unique([householdId, id])`). A database check enforces `amount > 0`, `currency = 'RON'`, and `sourceType = 'RECEIPT'` only when `type = 'EXPENSE'`. Prisma does not express these checks in the schema, so the migration must include explicit SQL. The write API must enforce them too and reject values with excess scale **before** PostgreSQL can round them. A category is never hard-deleted once referenced; T01 soft archive hides it from new-entry choices while keeping historical resolution.

The `(sourceType, sourceId)` uniqueness is global because receipt IDs are globally unique. It also makes a repeated manual intent idempotent. It is not a substitute for the receipt-household ownership check. When EPIC-05 adds `Receipt`, approval must verify the same household, reviewed status and category, then create the `RECEIPT` source entry and mark that receipt approved **in one database transaction**. A conflicting source uniqueness result is a replay/conflict, never a second expense. Receipt item rows never create ledger entries. EPIC-05 may add a direct receipt foreign key once its model exists; T02 must not invent an unbacked receipt ID in a public request.

### API boundary

Use `POST /api/v1/households/{householdId}/ledger-entries` for manual creation. The JSON body contains only `type`, decimal-string `amount`, `currency: "RON"`, `occurredOn`, `categoryId` (required for `EXPENSE`/`REFUND`, absent for `INCOME`), and optional `note`. A required `Idempotency-Key` header contains a UUID generated once per intended submission and reused on retry. The API sets `sourceType = MANUAL` and `sourceId` itself; any client-supplied source fields are rejected. A repeated key with the same canonical request returns the existing entry; a reused key with a different request returns `409` without mutation. A retry can return an existing row only after verifying the caller's current household access and that the stored entry belongs to the same household and creator. Do not derive the key from amount, time or the HTTP attempt.

Every mutation uses `authorizeHouseholdOperation(request, householdId, "financial-write")` and `validateSameOriginJsonMutation(request)`. An expense category is fetched by **both** `id` and `householdId` and must be active at write time. The API response has `{ entry: { id, type, amount: "12.35", currency: "RON", occurredOn: "YYYY-MM-DD", categoryId, note, sourceType: "MANUAL", createdAt } }`, with `Cache-Control: no-store`. Follow the existing `{ error: { code, message } }` shape and `401`/`403`/`404` household semantics; use `400` for malformed input and `409` for a duplicate intent with changed payload. The browser sends a string amount and displays the returned string; totals are calculated with PostgreSQL numeric or exact decimal arithmetic in the API.

### User-approved product rules — 2026-10-27

The user approved these accounting and input rules for the MVP:

- A refund is a positive `REFUND` entry that reduces expense and category net totals; it is not income or a negative expense row. A refund belongs to the month of its own `occurredOn` date.
- `occurredOn` is a Romanian household calendar date. The UI derives the default “today” in `Europe/Bucharest`; once submitted, the date string is stored without timezone conversion.
- `EXPENSE` and `REFUND` require an active expense category; `INCOME` has no expense category.
- Amount input is strictly positive RON with at most two fractional digits. The API returns exactly two digits, including `0.01`.

The `999999999.99` RON input ceiling is a technical API limit chosen for the first implementation, not a separately approved product rule. The exact idempotency key and source uniqueness mechanism above is likewise an architecture decision. A refund may later link to a prior same-household expense without changing its accounting type; that optional relation was not part of the approved minimum.

The user also decided that a monthly fixed-cost rule should produce **one real expense entry per month**. Changing that rule must update the past months linked to it and preserve an audit history. This is a separate future T09/EPIC-06 design and migration; T02 must not add recurring-rule fields, a recurring source variant, or silently rewrite past ledger rows. Photo receipts are the intended primary future capture flow in EPIC-05, while T02 still supplies manual entry for items such as rent or mortgage payments.

T03 separately decides edit/archive audit retention. This ADR does not authorize editing receipt-derived entries or correcting an approved receipt.

## Alternatives considered

- Separate income, expense and refund tables: rejected because monthly totals, browsing and source deduplication would need several inconsistent paths.
- Signed amounts and a single generic type: rejected because refund semantics and validation become implicit and easy to double count.
- One ledger row per receipt item: rejected because it would count a receipt's total more than once and cannot represent the canonical receipt expense.
- Nullable receipt ID without a source discriminator: rejected because it cannot distinguish a manual retry from a receipt source and invites client source impersonation.
- `Float`/JavaScript `number` for RON: rejected because binary rounding can change cent values. PostgreSQL `numeric`/Prisma `Decimal @db.Decimal(p, s)` is supported by the pinned stack; see [Prisma's PostgreSQL type mapping](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql) and [`@db.Date` mapping](https://www.prisma.io/docs/orm/v7/prisma-client/type-safety/prisma-type-system).

## Consequences and migration path

T01 should apply its category archive and normalized-name migration first. T02 then adds the entry enum/table, indexes, foreign keys and SQL checks in a new additive migration; no existing financial rows need backfill. The API and manual-entry UI follow the schema migration. T03 and T04 read this single model; EPIC-05 later adds the receipt model and approval transaction. `docs/architecture.md` must be updated only once implementation exists.

The API performs fresh membership checks on every request. Database category ownership and source uniqueness provide additional protection against cross-household references and concurrent duplicate posting. Database backups must include this table and the later receipt rows together. Manual duplicate protection adds a stable request UUID and request hash to the contract; if the client loses its key and submits a new intent, a second entry remains possible and must be handled as a user correction in T03.

The architect reviewed `.codex/agents/{architect,developer,reviewer,tester}.toml` and `.agents/skills/{api-and-interface-design,prisma-orm-setup}/SKILL.md` for this proposed design. No installed skill version or agent responsibility changes are required now. Recheck these mappings when the architecture is implemented.
