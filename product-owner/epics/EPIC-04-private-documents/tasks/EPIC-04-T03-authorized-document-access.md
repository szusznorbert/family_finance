# EPIC-04-T03: Read private documents with authorization

## Goal and value

A current household member can inspect an uploaded original while a person outside that household learns nothing from a guessed document ID.

## Scope

- Provide household-scoped metadata lookup and authorized content access through API-controlled streaming or a short-lived private access mechanism. Recheck current membership on every request, including repeated access after a user leaves the household.
- Resolve the file from server-side metadata; never interpret a caller-controlled storage path. Use safe content type/disposition and cache behavior so private content is not accidentally served as public assets or executable browser content.
- Give a consistent inaccessible-resource response for nonexistent, foreign-household and mismatched household/document IDs; do not reveal storage keys or another household's document metadata.

## Implementation checklist

- [x] Household-scoped, authorized metadata/content GET with fresh membership checks.
- [x] Safe content/cache headers and private-byte reads; no public file path or storage key.
- [x] Synthetic cross-household, session, membership-revocation, and byte-match manual smoke documented.

## Acceptance criteria

- [x] A current authorized member can retrieve the exact uploaded synthetic bytes and safe metadata through the intended private route; the document has no permanent public URL.
- [x] No session returns 401; a known document ID from another household and a nonexistent ID have indistinguishable inaccessible responses; revoked membership loses access on the next request.
- [x] File content is served with safe response headers, without leaking local paths, generated keys or full file data into logs or unrelated API responses.

## Dependencies

T01 metadata/storage and T02 upload; EPIC-02 fresh household authorization. EPIC-05-T01 requires this access for receipt originals.

## Verification checklist

- [x] With two synthetic households and a synthetic file, retrieve content as an authorized member, compare returned bytes, try no session and a foreign/unknown document ID, and repeat after a synthetic membership change. Inspect cache/content headers and direct public paths. Do not alter real household membership or add automated tests.

## Non-goals and open questions

No general document library, delete endpoint or domain-specific receipt/bill/vehicle UI. Choose streaming versus short-lived access URLs according to the accepted storage backend; either way authorization precedes access and no permanent public link is allowed.

## Historical read-only preimplementation planning — 2026-10-28

**Dependencies and file boundary:** T01's API-only private `document_data` store and T02's completed household-scoped upload are available. Under accepted [ADR-0002](../../../../docs/decisions/ADR-0002-private-document-storage.md), access uses authenticated, API-controlled streaming with no short-lived or public URL. The `developer` owns two new GET routes: `apps/api/src/app/api/v1/households/[householdId]/documents/[documentId]/route.ts` for minimal metadata and `apps/api/src/app/api/v1/households/[householdId]/documents/[documentId]/content/route.ts` for original bytes. They use the existing `open` capability in `apps/api/src/lib/private-document-storage.ts`; schema, T02 upload route, storage-key handling, web UI, and deletion are outside this task. If a narrowly scoped storage helper is needed to close a file handle on stream abort, agree on that change first.

**Acceptance:** Both requests recheck the Better Auth session and current household `read` membership (`OWNER`/`MEMBER`/`VIEWER`). The document is always queried by `householdId + documentId + AVAILABLE`; the disk path is derived only from the validated server-side metadata `storageKey`, never a client path. No session returns `401`; nonexistent, foreign, or unavailable records return the same `404` without metadata leakage. Content is streamed only with a validated MIME, safe filename in `Content-Disposition: attachment`, `Cache-Control: private, no-store`, and `X-Content-Type-Options: nosniff`; abort closes the handle, and missing/corrupt bytes cannot become a successful empty download. Responses and logs contain no storage key, local path, or full hash.

**Synthetic manual verification and open gate:** A household member can download, byte-for-byte, a T02-uploaded image/PDF from each of two synthetic households; metadata and headers are safe, and a direct `/public` path does not serve the file. A signed-out caller, a member of another household, and an unknown ID receive the `401`/indistinguishable `404` results described above. Rechecking access after membership removal may be tested only with a separately authorized synthetic membership change. Record typecheck/lint/diff-check and manual HTTP observations; no automated suite. T01's named-volume persistence after an API Compose restart and database FK/immutability runtime checks remain separate open gates; a successful local T03 read does not close them.

## Current status — 2026-10-28

- Household-scoped metadata GET and content GET are implemented. Both check the Better Auth session and current `read` membership; storage lookup requires `householdId + documentId + AVAILABLE`. Metadata returns only ID, safe filename, allowed MIME, byte size, and creation time. Content opens the file using its server-side metadata key and streams it with allowlisted MIME, `attachment`, `private, no-store`, `nosniff`, and exact `Content-Length` headers; abort/read errors close the file handle.
- Verification: `pnpm typecheck`, `pnpm lint`, and `git diff --check` passed. Anonymous GETs to both metadata and content endpoints returned `401 UNAUTHENTICATED`.
- Manual HTTP smoke — 2026-10-28: two new `example.test` accounts, two synthetic households, and two small synthetic PNGs were created only through the API. Both uploads returned `201`; own metadata/content GETs returned `200`, and downloaded bytes matched exactly. Metadata returned only `id`, `displayName`, `detectedMimeType`, `byteSize`, and `createdAt`, with `Cache-Control: private, no-store`. Content headers were `image/png`, safe-name `attachment`, `private, no-store`, `nosniff`, and exact `Content-Length`; JSON responses contained no storage path/key/hash. Anonymous metadata/content GETs returned `401`; a foreign household document ID and an unknown ID returned identical `404` responses from both GETs. After inviting a synthetic B member, they read A’s document with `200`; after removing this fresh membership through the API, both GETs returned `404` on the next request. Direct `/public/{documentId}` returned `404` and did not serve bytes. The one-off Node HTTP client was not saved to disk and did not print credentials or cookies; no automated test file was created.
- Static log/response review — 2026-10-28: no `console`, logger, or other log call exists in the two T03 routes, `authorizeHouseholdOperation`, storage `open`, or metadata-helper code paths. Routes serialize only safe metadata; catch branches return generic errors and do not log errors. Storage key, local path, and full hash are not selected or included in route responses. This is a static review of T03 application code; it makes no claim about Next.js/runtime or host logging behavior.
- The dev app remained running. T01’s Compose named-volume restart persistence and database FK/immutability runtime gate remain open.
