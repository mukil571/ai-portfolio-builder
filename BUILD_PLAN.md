# Loriyum — Build Plan for Claude Code

Work top to bottom. One phase per session (or a few sessions). Do not start a phase until the previous phase's "Done when" is fully checked. Always start a session with: *"Read CLAUDE.md and BUILD_PLAN.md. We are on Phase N."*

Legend: `[ ]` todo · `[x]` done

---

## Phase 0 — Project setup
**Goal:** a running, typed, linted, tested skeleton deployed to Vercel.

- [x] Create Next.js app (App Router, TS strict, Tailwind), install shadcn/ui, Framer Motion
- [x] Add Drizzle + Postgres connection (Neon/Supabase), enable pgvector extension — applied via Vercel deploy; `/api/health` reports `pgvector: true`
- [x] Typed `env.ts` with Zod, `.env.example`
- [x] ESLint, Prettier, Vitest, Playwright configs; npm scripts from CLAUDE.md section 9
- [x] Place `CLAUDE.md` and `BUILD_PLAN.md` in repo root
- [x] Deploy empty app to Vercel — https://ai-portfolio-builder-czbe.vercel.app/

**Done when:** `typecheck`, `lint`, `test` all pass; the deployed URL loads.

**Prompt:** *"Read CLAUDE.md. Set up Phase 0 exactly as listed. Ask me for any credentials you need."*

---

## Phase 1 — Auth, schema, dashboard shell
**Goal:** users can sign up/in and see an empty dashboard.

- [x] Full Drizzle schema + first migration: `users`, `sites`, `site_sections`, `knowledge_facts`, `knowledge_files`, `unanswered_questions`, `conversations`, `messages`, `leads`, `ai_settings`, `usage_logs`, `subscriptions` (+ `sessions`, `accounts`, `verifications`) — applied in production
- [x] Better Auth (replaces Auth.js): email+password, email verification, password reset — sign up → confirm email → log in → empty dashboard verified live on Vercel. Google sign-in is built but off until `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are added (owner chose to skip for now).
- [x] Route protection for `/dashboard/*` (`src/proxy.ts` cookie check + server-side `requireUser()`), e2e-tested incl. forged cookie
- [x] Dashboard layout (sidebar/topbar) and **My Websites** page:
  - empty state "No websites yet" + Create website button
  - card grid for existing sites (name, status, live link, unanswered badge) + Add card
- [x] Landing page v1 (hero, how it works, pricing teaser, CTA) — polish later
- [x] Ownership-scoping test for the sites query (PGlite + real migrations: `src/tests/unit/sites-query.test.ts`)

**Done when:** sign up → log in → see empty state; unauthenticated users are redirected; ownership-scoping test exists for the sites query.

**Prompt:** *"Phase 1. Design the schema carefully with indexes (pgvector on facts and unanswered questions), show me the schema before migrating."*

---

## Phase 2 — Section system and site renderer
**Goal:** a published site renders from JSON, with empty sections omitted.

- [x] Zod schemas for every section type (hero, about, skills, experience, education, projects, services, pricing, testimonials, gallery, faq, contact, social) — `src/lib/validation/sections.ts`
- [x] Shared section components in `components/sections/` (themeable via `--site-*` CSS variables)
- [x] Renderer: ordered list of sections → components; skip empty/invalid sections — `src/lib/sites/render-plan.ts`
- [x] First template: **Minimal Mono** (portfolio), light/dark with remembered visitor choice; sample at `/templates/minimal-mono`
- [x] `/site/[slug]`: published only (real HTTP 404 for draft/missing), cached per slug, metadata + Open Graph
- [x] Owner preview route for drafts (auth required): `/preview/[siteId]`, linked from dashboard cards
- [x] Seeded live site verified: `/site/demo` renders at 390px and 1280px, `/site/demo-draft` returns 404 publicly, both cards on the owner's dashboard and Preview opens the draft

**Done when:** seeded site renders beautifully on mobile and desktop; removing a section's content removes it from the page; draft is 404 publicly.

**Prompt:** *"Phase 2. Invest in visual quality: type scale, spacing, motion. Show me screenshots at 390px and 1280px."*

---

## Phase 3 — Create-website wizard
**Goal:** owner can create and publish a site end to end (no AI yet).

- [x] Step 1: choose Business/Product or Portfolio (+ site name)
- [x] Step 2: choose template (cards with live iframe preview) — only Minimal Mono available, others "coming soon"
- [x] Step 3: section forms for all 13 types (schema-driven editor), debounced autosave, image upload (Vercel Blob, URL paste fallback), reorder sections, add sections, empty = omitted ("Shown/Hidden" badge)
- [x] Step 4: placeholder for knowledge step (built in Phase 4)
- [x] Step 5: slug picker with live availability check (format, reserved words, taken; race-safe), preview, **Deploy** button
- [x] Site appears on dashboard with live link (+ Edit / Preview links)
- [x] Live verification on Vercel: owner created a site through the wizard, uploaded a hero photo (Vercel Blob) and published it at `/site/<slug>`

**Done when:** a new user completes the wizard in under 5 minutes and the site is live at `/site/[slug]`; slug collisions and reserved words handled.

---

## Phase 4 — Knowledge base
**Goal:** owners can teach the bot facts.

- [x] Add text fact (title/question + answer), edit, delete, optional expiry, visibility
- [x] File upload: **TXT only for now** (owner's choice; PDF/DOCX deferred, would need `unpdf` + `mammoth`). Parsed in memory, original not kept → proposed fact cards for review
- [x] Paste resume/LinkedIn text → proposed facts (Gemini 3.5 Flash extraction) → review screen (Approve / Edit / Reject)
- [x] Embedding pipeline with the fixed platform model (gemini-embedding-001, 768 dims); vectors stored on approve/edit; "Retry indexing" when unavailable
- [x] Retrieval function: top-k facts for a site + cosine similarity score (`lib/knowledge/retrieval.ts`)
- [x] Knowledge Base tab (`/dashboard/sites/[id]/knowledge`, linked from site cards); wizard step 4 wired up
- [x] Wizard section data seeds starter facts on request ("Suggest from my site content"; owner reviews and approves)
- [ ] Live verification on Vercel (needs `GOOGLE_GENERATIVE_AI_API_KEY` in Vercel for suggestions + searchable facts)

**Done when:** adding/editing/deleting a fact updates retrieval; unit tests cover retrieval ranking and tenant isolation (site A never retrieves site B's facts).

---

## Phase 5 — Chat widget and AI pipeline (the core)
**Goal:** the visitor chat honors the Golden Rule.

- [ ] Provider factory using Vercel AI SDK (OpenAI, Anthropic, Google) + platform key for dev
- [ ] `/api/chat` streaming endpoint with: input validation, rate limit, injection filter
- [ ] Intent classification: `owner_fact | general_tech | off_topic | unknown`
- [ ] Retrieval + **grounding gate** (threshold tuned with tests)
- [ ] Answer generation restricted to retrieved facts, returns fact IDs for source badge
- [ ] Off-topic polite redirect; general-tech only when `allowGeneralAnswers` is on, labelled
- [ ] `record_unanswered_question` tool: embed → semantic dedup → insert or increment `askedCount`
- [ ] Chat widget UI: floating button, streaming messages, source badges, "Email me when answered" capture (stores lead/notify email), themed per template
- [ ] Conversations + messages persisted
- [ ] "AI not configured" state when no key/plan

**Done when:** an eval test set (at least 30 questions: known, unknown, off-topic, injection attempts, paraphrased duplicates) passes; the bot never invents an owner fact in any test.

**Prompt:** *"Phase 5. First write the eval test set and the grounding rules, show me, then implement."*

---

## Phase 6 — Questions inbox and the learning loop
**Goal:** close the loop: owner answers → AI learns → visitor notified.

- [ ] Questions Inbox tab: sorted by Asked count/recency, status filters (open, answered, ignored)
- [ ] Answer panel with **AI-drafted suggestion** (from existing facts), owner edits and approves, choose public/private-to-asker
- [ ] Approving creates a `knowledge_fact` (embedded) and marks question answered; merged duplicates all resolved
- [ ] Owner notifications: instant email + daily digest option
- [ ] Visitor "answered" email via Resend
- [ ] Ignore/merge/delete questions

**Done when:** e2e test: visitor asks unknown → appears in inbox with count → owner answers → a second visitor gets that answer instantly → first visitor gets email.

---

## Phase 7 — Remaining templates and customization
**Goal:** every site looks attractive.

- [ ] Portfolio: **Bento**, **Dark Dev**, **Editorial**
- [ ] Business: **SaaS Launch**, **Studio**, **Local Pro**, **Product Spotlight**
- [ ] Customization panel: accent color, font pair, section order, hero image, light/dark default
- [ ] Switch templates without losing content
- [ ] SEO polish (sitemap, OG image generation, meta defaults)
- [ ] Template previews in the wizard use real sample data

**Done when:** all 8 templates pass Lighthouse 90+ (perf and a11y) on mobile; visual review of each at 390px and 1280px.

---

## Phase 8 — AI and API settings, fake plans
**Goal:** the two AI modes work.

- [ ] AI & API tab: choose mode (platform plan vs own key), choose provider/model
- [ ] BYOK: encrypted key storage (AES-256-GCM), "Test key" button, show only last 4 chars, delete key
- [ ] Fake plans (Free, Starter, Pro) with monthly message quotas; metering in `usage_logs`; usage meter UI; quota-exceeded graceful message
- [ ] Free plan + no key → "AI not configured" with CTA to add a key
- [ ] Plan selection UI that simulates upgrade (no payment)

**Done when:** keys never appear in logs/responses (test it); switching provider works; quota enforcement tested.

---

## Phase 9 — Workspace completeness
**Goal:** all dashboard tabs real.

- [ ] Overview (visits, chats, unanswered count)
- [ ] Content Editor: edit sections post-deploy, **Republish**, unpublish
- [ ] Chatbot Settings: name, greeting, tone, general-answers toggle, widget colors
- [ ] Conversations and Leads: transcripts, captured emails, export CSV
- [ ] Analytics: top questions, answered vs escalated, coverage gaps
- [ ] Fact conflict hints (e.g. two different rates)
- [ ] Delete site, export/delete my data

**Done when:** every tab has loading, empty and error states.

---

## Phase 10 — Hardening and launch
**Goal:** resume-ready, demo-ready.

- [ ] Rate limiting everywhere sensitive; abuse/spam protection on chat
- [ ] Prompt-injection regression tests; security review against CLAUDE.md section 6
- [ ] Playwright e2e: signup → create → publish → chat → answer loop
- [ ] Accessibility pass, performance pass, error monitoring (Sentry)
- [ ] Landing page final polish with live demo chatbot
- [ ] Seed script: a demo portfolio site and a demo business site
- [ ] README with architecture diagram, screenshots, setup steps
- [ ] 2-minute demo video; production deploy on Vercel with custom domain (optional)

**Done when:** a stranger can sign up on production and run the full loop without help.

---

## Later (stretch)
Custom domains · embeddable widget for external sites · owner live-takeover chat · multi-language answers · real payments (Razorpay/Stripe) · team accounts.

---

## Decision log
Record every decision or deviation here, newest first.

- 2026-11-21 (Phase 4): Knowledge files are TXT-only for now (no new parser packages); originals are not stored (`knowledge_files.storage_key` now nullable, migration 0002). Extraction model `gemini-3.5-flash` on the same platform Google key as embeddings; source text is wrapped as untrusted data, output is Zod-validated, and every suggestion is PROPOSED (never retrievable until approved).
- 2026-11-21 (Phase 4): Retrieval gate = site_id + approved + public + not expired + embedded with the current model, exact cosine `<=>`. Editing a fact's wording drops its embedding before re-indexing, so a stale vector is never served. Owner-written facts are approved immediately; facts without an embedding show "Not searchable yet" with a retry.
- 2026-11-21 (Phase 4): "Private" visibility means stored but not told to visitors (Phase 6 will use it for answer-only-to-the-asker). Starter facts from wizard content are derived without AI and also arrive as proposals.
- 2026-11-21 (Phase 4): E2E runs with one worker and the signup helper waits out Better Auth's 3-sign-ups-per-10s limit, which stays enabled.

- 2026-11-21 (Phase 3): Phase 3 done. Vercel Blob store connected (`BLOB_READ_WRITE_TOKEN`); live upload + publish verified by the owner. `/api/uploads` rejects malformed bodies with 400 and logged-out requests with 403.

- 2026-11-17 (Phase 3): Wizard = `/dashboard/new` (steps 1-2, client) -> draft site created with placeholder slug `draft-<random>` (prefix reserved) + default sections per kind + `ai_settings` (mode none) -> `/dashboard/sites/[id]/setup/{content,knowledge,publish}`. Slug chosen at publish; `publishSite` catches unique-violation races. Publish and edits to a published site call `updateTag(siteCacheTag(slug))` (old slug too).
- 2026-11-17 (Phase 3): Autosave stores work-in-progress section content as typed (shape/size-checked, 50 KB cap); the strict section schema runs at render time and decides what shows. All builder queries are owner-scoped and PGlite-tested (`site-builder.test.ts`).
- 2026-11-17 (Phase 3): Image upload = Vercel Blob client uploads via `/api/uploads` (auth + site ownership, JPEG/PNG/WebP/AVIF/GIF only, no SVG, 5 MB, random suffix, `sites/<id>/` prefix). Without `BLOB_READ_WRITE_TOKEN` the editor offers link paste only.
- 2026-11-17 (Phase 3): Local dev database = PGlite when `DATABASE_URL="pglite:<dir>"` (one instance per process via globalThis; separate instances in Next's route/page bundles didn't see each other's writes). Refused on Vercel. Without Resend locally, emails go to `.local-outbox/` so e2e can follow verification links. E2E (`wizard.spec.ts`) covers signup -> verify -> wizard -> publish -> live page in ~10 s.

- 2026-11-17 (Phase 2): Phase 2 done. The first live seed failed (`inconsistent types deduced for parameter`): a SQL param was used as both enum and text. Seed logic moved to `src/lib/sites/seed-demo.ts` with explicit casts and PGlite tests, so SQL type errors fail locally first.

- 2026-11-17 (Phase 2): `/site/[slug]` = `ensureStatic = "navigation"` + `instant = false` + data via `use cache` with `cacheTag("site:<slug>")` and `cacheLife("hours")`. The full render blocks, so drafts/unknown slugs return a real HTTP 404 (not a streamed soft 404). `generateStaticParams` returns the invalid slug `_` (Cache Components requires ≥1 param; it never queries the DB). **Phase 3 must `revalidateTag(siteCacheTag(slug))` on publish, edit and unpublish.**
- 2026-11-17 (Phase 2): Sections: blank strings = missing, invalid list items are dropped (not the whole section), links allow only http(s)/mailto/tel/#anchor, gallery images require alt text. Empty sections are omitted, along with their nav link.
- 2026-11-17 (Phase 2): Templates style only `--site-*` tokens on `.site-root[data-template][data-mode]`, independent of the dashboard's dark theme. Visitor light/dark choice is stored in localStorage and applied by an inline script before paint. Owner images use plain `<img>` until uploads/blob storage (Phase 3).
- 2026-11-17 (Phase 2): Demo seed (`scripts/seed-demo.ts`, Node type stripping) runs in `vercel-build` only while `SEED_OWNER_EMAIL` is set; it never takes over a slug owned by someone else and never fails the deploy. Slugs `demo` / `demo-draft` should be reserved in Phase 3.
- 2026-11-17 (Phase 2): E2E now runs against a production build (`next build && next start`) for real status codes and to avoid dev-server compile races. The dev network's DNS now resolves Neon again.

- 2026-11-17 (Phase 1): Phase 1 done. Live sign-up hit two config issues, both fixed in code: `NEXT_PUBLIC_APP_URL` is normalized to a bare origin (trailing slash, path, spaces and a trailing-dot host are stripped), and auth also trusts Vercel's own URLs (`VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL`, `VERCEL_BRANCH_URL`). Verification emails from Resend's shared test sender land in spam and only reach the Resend account's own address; a verified sending domain is needed before real users (Phase 10 at the latest).

- 2026-11-17 (Phase 1): Route protection = `src/proxy.ts` (Next 16's renamed middleware; optimistic session-cookie check) + `requireUser()` in every dashboard page (DB-validated). Session reads sit behind `<Suspense>` (Cache Components), and `headers()` is awaited before touching auth so prerender never needs secrets.
- 2026-11-17 (Phase 1): Query functions take the db as a parameter (`AppDb`), so tests run them on PGlite (in-memory Postgres + pgvector, dev-only deps) with the real migrations. Neon is unreachable from the dev network, so this is the DB test path.
- 2026-11-17 (Phase 1): Email: Resend; without `RESEND_API_KEY`, dev prints emails to the server log and production refuses to send (never silently drops). New users get a Free `subscriptions` row via a Better Auth `databaseHooks.user.create.after` hook.

- 2026-11-17 (Phase 1): Schema approved and applied as migration `0001_phase1_schema` (15 tables, snake_case via Drizzle `casing`). App queries and migrations use Neon's WebSocket `Pool` (`drizzle-orm/neon-serverless`) for real transactions; `engines.node >=22` for built-in WebSocket.
- 2026-11-17 (Phase 1): No ANN index on embeddings. Retrieval/dedup use exact cosine distance (`<=>`) filtered by `site_id` (btree). Revisit HNSW + iterative scan only if a single site's fact count makes exact scans slow.
- 2026-11-17 (Phase 1): Embeddings: `gemini-embedding-001`, `outputDimensionality: 768`, L2-normalized; task types `RETRIEVAL_DOCUMENT` (facts), `RETRIEVAL_QUERY` (visitor queries), `SEMANTIC_SIMILARITY` (unanswered-question dedup). `embedding_model` stored per row.
- 2026-11-17 (Phase 1): Auth library is Better Auth (not Auth.js): Auth.js v5 is still beta with no release since July 2026, and Better Auth ships email verification, password reset, Google and DB sessions. Approved by the owner.
- 2026-11-17 (Phase 1): Facts keep both `approved_at` (first approval) and `verified_at` (last owner confirmation, for staleness). `ai_settings.key_version` records which server key encrypted the API key, for rotation.

- 2026-11-17 (Phase 0): Migrations run on every Vercel deploy via `vercel-build` (`db:migrate && next build`), using `scripts/migrate.mjs` (drizzle-orm neon-http migrator, fails loudly) instead of `drizzle-kit migrate` (exited silently on errors). Reason: local DNS blocks Neon DB hosts, including from the Neon Console SQL Editor. Caveat: preview deploys also migrate the `production` branch; switch previews to a Neon branch before migrations get risky.

- 2026-11-17 (Phase 0): Env validation and the DB client are lazy (`getEnv()`, `getDb()`), not module-load side effects. `next build` imports route modules to collect config; eager validation failed the first Vercel deploy when `DATABASE_URL` was unset. Missing vars now fail only the request that needs them.

- 2026-11-17 (Phase 0): Next.js 16.4.6 with `cacheComponents` on (scaffold default) — dynamic route handlers call `await connection()` instead of `export const dynamic`. Tailwind 4, shadcn/ui (`base-nova` style, Base UI primitives). Animation lib is `motion` (current name of Framer Motion; import from `motion/react`).
- 2026-11-17 (Phase 0): Database is Neon (project `divine-grass-68095393`, branch `production`), linked via `neon init`, which wrote `.env.local` and added `neon.ts` + `@neon/config`/`@neon/env` deps. App uses `drizzle-orm/neon-http`; migrations use `DATABASE_URL_UNPOOLED`. pgvector enabled by custom migration `0000_enable_pgvector.sql`.
- 2026-11-17 (Phase 0): Env validation in `src/env.ts` (server-only) over pure schemas in `src/lib/env/schema.ts`; `SKIP_ENV_VALIDATION=1` bypass for tooling. `@types/node` bumped to 24 (Vitest 5 peer requirement).
- 2026-11-17 (Phase 0): Deploy via Vercel GitHub import of `origin/main`. Local network DNS (10.34.252.207) refuses `*.aws.neon.tech` lookups, so `db:migrate` and `/api/health` can't reach Neon locally until DNS is changed.

- 2026-11-17: Single TypeScript full-stack repo. "Deploy" = publish at `/site/[slug]`. General-tech answers off by default. Plans are faked. Embeddings use one fixed platform model; generation uses owner's provider.
