# Security review (Phase 10)

Reviewed 2026-11-22 against [CLAUDE.md §6](../CLAUDE.md). Each rule lists how it's met and the
test that proves it. "Known gaps" are honest limits, not hidden.

## 1. Owner API keys

**Rule:** encrypted at rest (AES-256-GCM, key from env), decrypted only server-side at call time,
never logged, never returned to the client (last 4 only).

- `src/lib/crypto/api-keys.ts`: AES-256-GCM, random 12-byte IV per key, the **site id as
  additional authenticated data** (a ciphertext copied to another site's row won't decrypt),
  `key_version` for rotation, secret `API_KEY_ENCRYPTION_KEY` (32 bytes).
- Decrypted only in `/api/chat` (to answer) and `testSavedKeyAction`; the owner view
  (`getOwnerAiSettings`) selects `apiKeyLast4` only. Data export excludes the ciphertext.
- Provider errors are reduced to a category before logging (`testApiKey`); Sentry events mask
  anything shaped like `sk-…`, `sk-ant-…` or `AIza…`.
- Tests: `ai-keys.test.ts` (round-trip, wrong site/secret/tamper fail, **all console output
  captured and checked for the key**), `hardening.test.ts` (Sentry scrubbing),
  `workspace.test.ts` (export has no secrets), e2e `ai-settings.spec.ts` (a refused key is
  never shown back).

## 2. Chat endpoint

**Rule:** rate limit per IP and per site; cap message length; neutralise prompt injection; the
system prompt is never exposed.

- Per IP (20/min) and per site (300/h) limits; message cap 1,000 characters after cleaning.
- Spam: hidden honeypot field, too-fast sends, repeats within 2 minutes and very long chats get
  fixed replies **without** an AI call.
- Plan quotas stop Loriyum-AI usage at the monthly limit.
- Injection: messages are data inside delimited blocks; flagged framing is stripped before
  retrieval and the model; questions about the instructions get the fixed redirect without a
  model call. The **code gate** (not the model) decides whether an owner fact may be shown.
- Tests: `chat-guard.test.ts`, `chat-pipeline.test.ts`, `hardening.test.ts` (a deliberately
  gullible model that obeys every injection still can't get an injected number or invented
  fact id through), and the real-model eval (`npm run eval`, 37 cases incl. injections).

## 3. Untrusted input

**Rule:** treat visitor messages and uploaded files as data; never follow instructions in them.

- Resume/file text is wrapped as a document for extraction and only ever produces **proposed**
  facts the owner must approve. Inbox suggestions are drafts only the owner sees.
- All server actions and API inputs are Zod-validated. Email HTML escapes every value; the leads
  CSV neutralises spreadsheet formulas.

## 4. File uploads

**Rule:** type and size allowlist, parse server-side, no execution.

- Images: JPEG/PNG/WebP/AVIF/GIF only (no SVG), 5 MB, owner + site checked, rate-limited, stored
  under `sites/<id>/` with a random suffix.
- Knowledge files: `.txt` only, 200 KB, decoded in memory with control characters stripped; the
  original is not stored.

## 5. Auth on every dashboard and API route

- `proxy.ts` redirects requests without a session cookie; every dashboard page calls
  `requireUser()`, and **every exported server action** does too (checked: 34 of 34).
- Private API routes (`/api/uploads`, `/api/sites/[id]/leads`, `/api/account/export`) check the
  signed-in user; `/api/cron/digest` requires the `CRON_SECRET` bearer token (constant-time).
- Public routes by design: `/api/chat`, `/api/chat/notify`, `/api/visit`, `/api/health`.
- Every owner query is scoped by owner id, with "another owner gets null" tests in each query
  test file.
- Sensitive owner actions are rate-limited (AI tools 30/h, key tests 10/10 min, uploads 30/10 min,
  export 5/h); sign-up is limited by Better Auth (3 per 10 s per IP).

## 6. No draft or cross-tenant leaks on public pages

- Public reads only select `status = 'published'`; drafts and unknown slugs return a real 404
  (`sites.spec.ts`), unpublished sites too (`workspace.spec.ts`).
- Private facts are never retrieved for chat (`inbox.test.ts`); sitemap lists published sites
  only (`site-design.test.ts`).

## Known gaps

- The gate fully blocks invented **numbers** and **uncited facts**, but a model could still add a
  non-numeric claim to an answer that cites a real fact (e.g. "and she works weekends"). The
  prompt forbids it and the eval checks for it, but it isn't mathematically enforced.
- Session cookie cache: a revoked session can stay valid on another device for up to 5 minutes.
- Rate limits fail open if the database is unreachable (by design, so chat stays up).
- Images in Blob storage aren't deleted when a site or account is deleted.
- Visit counts are page views and can be inflated by a determined script (they're informational
  only; nothing is billed on them).
- Owner greetings are shown as written (owner-authored, not grounded); the UI warns not to put
  facts there.
