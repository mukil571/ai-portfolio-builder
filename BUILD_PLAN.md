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
- [x] Live verification on Vercel: owner added a searchable fact, got AI suggestions from pasted text, and approved one (Google AI key configured)

**Done when:** adding/editing/deleting a fact updates retrieval; unit tests cover retrieval ranking and tenant isolation (site A never retrieves site B's facts).

---

## Phase 5 — Chat widget and AI pipeline (the core)
**Goal:** the visitor chat honors the Golden Rule.

- [x] Provider via Vercel AI SDK + platform Google key (`gemini-3.5-flash-lite`); OpenAI/Anthropic/own keys deferred to Phase 8 (per-site "Enable assistant (beta)" switch until then)
- [x] `/api/chat` endpoint (NDJSON stream; reply is fully checked before streaming): Zod input validation, rate limits (20/min/IP, 300/h/site, Postgres-backed), injection flagging + framing stripped
- [x] Intent classification: `owner_fact | general_tech | off_topic | unknown` (structured model output)
- [x] Retrieval + **grounding gate** in code: threshold 0.55, cited ids must be retrieved, numbers must come from cited facts
- [x] Answer generation restricted to retrieved facts, returns fact IDs for the "Verified by {owner}" source badge
- [x] Off-topic polite redirect (fixed template); general-tech only when `allowGeneralAnswers` is on, labelled "General info — not from {owner}"
- [x] Unanswered questions: embed → semantic dedup (0.88) → insert or increment `askedCount`
- [x] Chat widget UI: floating button, progressive messages, source badges, "Email me when answered" (stores lead), themed via the template's `--site-*` tokens
- [x] Conversations + messages persisted (hashed IP, anonymous visitor cookie)
- [x] "AI not configured" state when the assistant isn't enabled (widget hidden; API returns the template)
- [x] Eval: 37 cases (`src/tests/eval/chat-eval-set.ts`) pass 37/37 on real models in two consecutive runs; zero invented owner facts
- [x] Live verification on Vercel: owner enabled the assistant and got a verified answer, the unknown-question reply with email capture, and the off-topic redirect

**Done when:** an eval test set (at least 30 questions: known, unknown, off-topic, injection attempts, paraphrased duplicates) passes; the bot never invents an owner fact in any test.

**Prompt:** *"Phase 5. First write the eval test set and the grounding rules, show me, then implement."*

---

## Phase 6 — Questions inbox and the learning loop
**Goal:** close the loop: owner answers → AI learns → visitor notified.

- [x] Questions Inbox tab: sorted by Asked count/recency, status filters (open, answered, ignored)
- [x] Answer panel with **AI-drafted suggestion** (from existing facts), owner edits and approves, choose public/private-to-asker
- [x] Approving creates a `knowledge_fact` (embedded) and marks question answered; merged duplicates all resolved
- [x] Owner notifications: instant email + daily digest option
- [x] Visitor "answered" email via Resend
- [x] Ignore/merge/delete questions

**Done when:** e2e test: visitor asks unknown → appears in inbox with count → owner answers → a second visitor gets that answer instantly → first visitor gets email.

---

## Phase 7 — Remaining templates and customization
**Goal:** every site looks attractive.

- [x] Portfolio: **Bento**, **Dark Dev**, **Editorial**
- [x] Business: **SaaS Launch**, **Studio**, **Local Pro**, **Product Spotlight**
- [x] Customization panel: accent color, font pair, section order, hero image, light/dark default
- [x] Switch templates without losing content
- [x] SEO polish (sitemap, OG image generation, meta defaults)
- [x] Template previews in the wizard use real sample data

**Done when:** all 8 templates pass Lighthouse 90+ (perf and a11y) on mobile; visual review of each at 390px and 1280px.

---

## Phase 8 — AI and API settings, fake plans
**Goal:** the two AI modes work.

- [x] AI & API tab: choose mode (platform plan vs own key), choose provider/model
- [x] BYOK: encrypted key storage (AES-256-GCM), "Test key" button, show only last 4 chars, delete key
- [x] Fake plans (Free, Starter, Pro) with monthly message quotas; metering in `usage_logs`; usage meter UI; quota-exceeded graceful message
- [x] Free plan + no key → "AI not configured" with CTA to add a key
- [x] Plan selection UI that simulates upgrade (no payment)

**Done when:** keys never appear in logs/responses (test it); switching provider works; quota enforcement tested.

---

## Phase 9 — Workspace completeness
**Goal:** all dashboard tabs real.

- [x] Overview (visits, chats, unanswered count)
- [x] Content Editor: edit sections post-deploy, **Republish**, unpublish
- [x] Chatbot Settings: name, greeting, tone, general-answers toggle, widget colors
- [x] Conversations and Leads: transcripts, captured emails, export CSV
- [x] Analytics: top questions, answered vs escalated, coverage gaps
- [x] Fact conflict hints (e.g. two different rates)
- [x] Delete site, export/delete my data

**Done when:** every tab has loading, empty and error states.

---

## Phase 10 — Hardening and launch
**Goal:** resume-ready, demo-ready.

- [x] Rate limiting everywhere sensitive; abuse/spam protection on chat
- [x] Prompt-injection regression tests; security review against CLAUDE.md section 6
- [x] Playwright e2e: signup → create → publish → chat → answer loop
- [x] Accessibility pass, performance pass, error monitoring (Sentry)
- [x] Landing page final polish with live demo chatbot
- [x] Seed script: a demo portfolio site and a demo business site
- [x] README with architecture diagram, screenshots, setup steps
- [ ] 2-minute demo video; production deploy on Vercel with custom domain (optional)

**Done when:** a stranger can sign up on production and run the full loop without help.

---

## Later (stretch)
Custom domains · embeddable widget for external sites · owner live-takeover chat · multi-language answers · real payments (Razorpay/Stripe) · team accounts.

---

## Decision log
Record every decision or deviation here, newest first.

- 2026-11-22: `EMAIL_VERIFICATION=off` switch (owner's explicit request) because Resend's test sender only delivers to the owner's own address, so strangers could never confirm. Off = no confirmation emails, accounts usable straight after sign-up (Better Auth `requireEmailVerification`/`sendOnSignUp`/`sendOnSignIn` follow it; `getCurrentUser` accepts unverified users). Default stays "on"; turn it back on once a sending domain is verified. Risk accepted: anyone can sign up with someone else's address; password reset still needs working email.

- 2026-11-22 (Phase 10): Rate limits: shared Postgres fixed-window counters (migration `0005`, `rate_limits`) on notify (5/10 min/IP), visit (120/min/IP), uploads (30/10 min/owner), AI owner tools (30/h/owner), key tests (10/10 min), data export (5/h); fail open on DB errors. Chat spam: honeypot field, < 600 ms open-to-send, same message within 2 min, 80-message conversation cap -> fixed replies, no AI call.
- 2026-11-22 (Phase 10): Injection regression = a deliberately gullible fake model in `hardening.test.ts`; the gate must still block injected numbers and invented fact ids. Security review written to `docs/security-review.md` (incl. known gaps).
- 2026-11-22 (Phase 10): Sentry (`@sentry/nextjs`, owner's OK) via `instrumentation.ts` / `instrumentation-client.ts`, loaded lazily only when `NEXT_PUBLIC_SENTRY_DSN` is set (eager loading added 150 KB to every page). No PII, no request data, no tracing/replay; API-key-shaped strings masked.
- 2026-11-22 (Phase 10): Deviation (owner's choice): no live demo chatbot on the landing page (AI cost); it links to all 8 template samples instead. Seed adds a business demo at `/site/demo-business` (Studio template; slug reserved). Landing pricing now reads the real plan numbers.
- 2026-11-22 (Phase 10): Accessibility: primary purple darkened to oklch(0.56 0.19 280) (white text 3.1:1 -> 5.0:1). Lighthouse mobile, local production build: accessibility 100 on landing, login, signup and templates; performance ~84-87 on this laptop (same page weight as Phase 7's 92-97 runs; host CPU load varies), to be confirmed on production with PageSpeed Insights.
- 2026-11-22 (Phase 10): README with mermaid architecture diagram, screenshots (`docs/screenshots/`, taken from a local test account) and setup steps. Demo video and custom domain are left to the owner.

- 2026-11-22 (Phase 9): Phase 9 done. Overview/visits, conversations, analytics, chatbot settings, unpublish/publish again and data export verified by the owner on production.

- 2026-11-22 (Phase 9): Workspace tabs per site: Overview, Content, Design, Knowledge Base, Questions, Conversations, Analytics, AI & API; sidebar adds Plan & usage and Account. Every tab has a Suspense loading state, friendly empty states, and `error.tsx` boundaries (dashboard + site).
- 2026-11-22 (Phase 9): Deviation: no separate draft copy of a live site, so "Republish" = Unpublish / Publish again on Overview (content edits on a live site already go live instantly via autosave + cache tags).
- 2026-11-22 (Phase 9): Visits = private counter (migration `0004`: `site_daily_stats` per site per UTC day). The live page sends a beacon with only the slug; no cookies/IPs/ids stored; skipped for Do-Not-Track/GPC and obvious bots (incl. HeadlessChrome). Counts page views, not unique visitors.
- 2026-11-22 (Phase 9): Chatbot settings (`ai_settings.bot_name/greeting/tone/widget_style`): tone only appends a style line to the draft prompt ("friendly" leaves it byte-identical, so the eval still applies); greeting is owner-written text shown as-is (UI warns not to put facts there). "Accent" widget style colours launcher/send/visitor bubbles via `--site-accent`.
- 2026-11-22 (Phase 9): Conflict hints = approved public facts with embedding similarity >= 0.80 whose numbers differ (reuses the grounding number extractor). Hints only, never blocking.
- 2026-11-22 (Phase 9): Leads CSV neutralises spreadsheet formulas. Export my data = JSON of everything except password hashes, sessions, encrypted keys and embeddings. Delete account (type your email) signs out first, then deletes the user (everything cascades; usage logs removed). Uploaded images in Blob storage are not deleted yet.

- 2026-11-22 (Phase 8): Phase 8 done. AI & API tab, own-key flow (with `API_KEY_ENCRYPTION_KEY` set in Vercel) and Plan & usage verified by the owner on production.

- 2026-11-22: Dashboard speed: Better Auth session cookie cache (5 min, signed) so most requests skip the session DB lookup; `getCurrentUser` wrapped in React `cache()` (sidebar + page share one check); dashboard site pages run their queries in parallel. Trade-off accepted by the owner: a revoked session can stay valid on another device for up to 5 minutes. Not changed (owner's choice): Neon scale-to-zero cold starts and Vercel/Neon region placement.

- 2026-11-22 (Phase 8): Providers for own keys: Google, OpenAI, Anthropic (`@ai-sdk/openai`, `@ai-sdk/anthropic` added with the owner's OK). Owners pick from a short tested model list (`lib/ai/model-catalog.ts`); anything else is refused, and a stored non-catalog model means "not configured". Embeddings, fact extraction and inbox suggestions always use the platform key (owner tools, not metered).
- 2026-11-22 (Phase 8): Keys: AES-256-GCM (`lib/crypto/api-keys.ts`), random IV, site id as additional authenticated data (a ciphertext copied to another site won't decrypt), `key_version` 1, secret `API_KEY_ENCRYPTION_KEY` (32 bytes base64). Only last 4 shown. A key is saved only after a one-message test succeeds. Provider errors are reduced to a category (rejected/model/limited/unreachable) before logging or showing; a unit test captures all console output and asserts the key never appears.
- 2026-11-22 (Phase 8): Deviation from the plan (owner's choice): Free includes 50 Loriyum-AI messages/month so existing sites keep working; Starter 1,000, Pro 10,000. Quota = platform-billed `usage_logs` chat messages per user per 30-day period (rolled forward lazily); own-key chats are logged but never counted. Over quota, visitors get a fixed template pointing to the site's contact details. Plan switches are simulated and keep the current period's usage (no resetting the counter by switching).
- 2026-11-22 (Phase 8): Chat model choice (`lib/ai/chat-model.ts`): byok -> owner key + model; platform -> Loriyum key if under quota; anything broken -> "not configured", never a fallback to another key. The grounding gate and templates are identical for every model. The eval still runs on the platform model only (no owner keys available to test with).

- 2026-11-22 (Phase 7): Phase 7 done. Template samples, the Design tab and a live template switch verified by the owner on production.

- 2026-11-22 (Phase 7): Lighthouse (mobile, production build) on all 8 template samples: performance 92-97, accessibility 100, best practices 100. SEO shows 63 there only because samples are deliberately `noindex`; a real published site scored SEO 100. Visual review done at 390px and 1280px.
- 2026-11-22 (Phase 7): Templates = one shared shell + section components with semantic hook classes (`site-hero`, `site-section`, `site-card`, …); each template is CSS only (`src/app/site-templates.css`, keyed on `data-template`, `data-font`, `data-mode`). Switching templates only changes `sites.template`, so content can't be lost. Bento is a wrapping flex grid of tiles that pair up when neighbours exist.
- 2026-11-22 (Phase 7): `sites.theme` = `{ accent?, fontPair?, defaultMode? }`; every unset field falls back to the template's default (so switching templates adopts the new look unless the owner chose otherwise). Text on the accent is black/white by luminance; accent used as text is `--site-accent-ink` (accent mixed toward the foreground) for contrast. Six curated font pairs via `next/font/google`, `preload: false` so a site only downloads the faces it uses. Hero image customization edits the hero section's image (no duplicate field).
- 2026-11-22 (Phase 7): Design tab (`/dashboard/sites/[id]/design`): template, accent (presets + custom), fonts, default mode, SEO title/description, hero image and section order (instant saves), with a scaled live preview. Reordering sections now also refreshes a published site's cache (was missing).
- 2026-11-22 (Phase 7): SEO: `sitemap.xml` (home + published sites, hourly cache), `robots.txt` (blocks dashboard, preview, api, template samples), per-site Open Graph image via `next/og` in the site's colours, `summary_large_image` Twitter cards. Template samples (`/templates/[id]`) use a portfolio sample or a new business sample by kind, with template defaults.

- 2026-11-22 (Phase 6): Phase 6 done. Live inbox verified by the owner (questions listed with counts, public + private answers approved). Visitor/owner emails are refused by Resend's test sender (it only delivers to the Resend account's own address); they will work once a sending domain is verified and `EMAIL_FROM` updated. No resend button for leads that failed meanwhile (owner's choice).

- 2026-11-22 (Phase 6): Inbox = `/dashboard/sites/[id]/questions` (tabs with Knowledge Base). Lists top-level questions only; merged questions become hidden children (`merged_into_id`) whose counts and waiting visitors move to the target, and answering the target answers them all. Delete removes the question, its children and their un-notified leads; the answer fact stays.
- 2026-11-22 (Phase 6): Approving an answer creates an APPROVED fact (`source = inbox`, `source_question_id`) in one transaction with the status change, then embeds it and emails waiting visitors once each (`leads.notified_at`). "Only the people who asked" = private fact: emailed, never retrieved by chat.
- 2026-11-22 (Phase 6): AI suggestion drafts from retrieved approved public facts only (score >= 0.45); a draft that cites no retrieved fact is dropped. It is shown only to the owner, who edits and approves it.
- 2026-11-22 (Phase 6): Owner emails per site (`sites.question_notify`: instant default, daily, off). Instant = one email per NEW question, claimed atomically via `unanswered_questions.owner_notified_at` and sent with `after()` so the visitor reply isn't delayed. Daily digest = Vercel Cron `0 8 * * *` UTC -> `/api/cron/digest`, which refuses requests without `Authorization: Bearer $CRON_SECRET`. Migration `0003` marks existing questions as already notified (no backlog digest).
- 2026-11-22 (Phase 6): Known edge case (not changed, needs owner approval since it touches the Golden Rule gate): the "numbers must come from facts" check also rejects digits from the owner's own name if the model repeats it (e.g. "Studio 54"), so such answers fall back to "I don't have that yet". The e2e uses a digit-free owner name.

- 2026-11-22 (Phase 5): Phase 5 done. Live chat verified by the owner (answer + badge, unknown + email capture, off-topic redirect).

- 2026-11-21 (Phase 5): Platform chat + extraction model switched from `gemini-3.5-flash` to `gemini-3.5-flash-lite` (owner's choice): the free-tier quota for 3.5 Flash was exhausted (429). One config line each (`chat-config.ts`, `models.ts`).
- 2026-11-21 (Phase 5): Grounding rules approved (`docs/chat-grounding.md`). The model only proposes; code decides. Non-answers are fixed templates. Prompt probes are redirected without calling a model. Messages flagged as injection are reduced to their genuine final question before retrieval/model (`genuineQuestion`), so injected "facts" and fake SYSTEM lines never reach the model.
- 2026-11-21 (Phase 5): Eval history: run 1 33/37 (4 injection cases over-cautious, none invented facts) → prompt fix; run 2 35/37 (I3 + the I2 check bug below) → prompt rule + check fix; run 3 37/37; run 4 failed I4 (flaky injection handling) and U6 (Google 503 outage, not a bot error) → framing-stripping fix + retry on 503; runs 5 and 6 37/37. One eval check was corrected: I2's forbidden "500 per hour" matched inside the correct "2,500 per hour"; it now forbids "₹500".
- 2026-11-21 (Phase 5): Until Phase 8, a site's assistant is enabled per site by its owner ("Enable assistant (beta)", platform key); off by default. `npm run eval` runs the real-model eval locally (needs the key in `.env.local`).

- 2026-11-21 (Phase 4): Phase 4 done. `GOOGLE_GENERATIVE_AI_API_KEY` set in Vercel; live embedding + extraction verified by the owner. Open follow-up: PDF/DOCX upload (needs approval for `unpdf` + `mammoth`).

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
