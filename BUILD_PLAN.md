# Loriyum — Build Plan for Claude Code

Work top to bottom. One phase per session (or a few sessions). Do not start a phase until the previous phase's "Done when" is fully checked. Always start a session with: *"Read CLAUDE.md and BUILD_PLAN.md. We are on Phase N."*

Legend: `[ ]` todo · `[x]` done

---

## Phase 0 — Project setup
**Goal:** a running, typed, linted, tested skeleton deployed to Vercel.

- [ ] Create Next.js app (App Router, TS strict, Tailwind), install shadcn/ui, Framer Motion
- [ ] Add Drizzle + Postgres connection (Neon/Supabase), enable pgvector extension
- [ ] Typed `env.ts` with Zod, `.env.example`
- [ ] ESLint, Prettier, Vitest, Playwright configs; npm scripts from CLAUDE.md section 9
- [ ] Place `CLAUDE.md` and `BUILD_PLAN.md` in repo root
- [ ] Deploy empty app to Vercel

**Done when:** `typecheck`, `lint`, `test` all pass; the deployed URL loads.

**Prompt:** *"Read CLAUDE.md. Set up Phase 0 exactly as listed. Ask me for any credentials you need."*

---

## Phase 1 — Auth, schema, dashboard shell
**Goal:** users can sign up/in and see an empty dashboard.

- [ ] Full Drizzle schema + first migration: `users`, `sites`, `site_sections`, `knowledge_facts`, `knowledge_files`, `unanswered_questions`, `conversations`, `messages`, `leads`, `ai_settings`, `usage_logs`, `subscriptions`
- [ ] Auth.js: email+password, Google, email verification, password reset
- [ ] Route protection middleware for `/dashboard/*`
- [ ] Dashboard layout (sidebar/topbar) and **My Websites** page:
  - empty state "No websites yet" + Create website button
  - card grid for existing sites (name, status, live link, unanswered badge) + Add card
- [ ] Landing page v1 (hero, how it works, pricing teaser, CTA) — polish later

**Done when:** sign up → log in → see empty state; unauthenticated users are redirected; ownership-scoping test exists for the sites query.

**Prompt:** *"Phase 1. Design the schema carefully with indexes (pgvector on facts and unanswered questions), show me the schema before migrating."*

---

## Phase 2 — Section system and site renderer
**Goal:** a published site renders from JSON, with empty sections omitted.

- [ ] Zod schemas for every section type (hero, about, skills, experience, education, projects, services, pricing, testimonials, gallery, faq, contact, social)
- [ ] Shared section components in `components/sections/` (themeable via CSS variables)
- [ ] Renderer: ordered list of sections → components; skip empty/invalid sections
- [ ] First template: **Minimal Mono** (portfolio)
- [ ] `/site/[slug]`: published only (404 for draft/missing), SSR, metadata + Open Graph
- [ ] Owner preview route for drafts (auth required)

**Done when:** seeded site renders beautifully on mobile and desktop; removing a section's content removes it from the page; draft is 404 publicly.

**Prompt:** *"Phase 2. Invest in visual quality: type scale, spacing, motion. Show me screenshots at 390px and 1280px."*

---

## Phase 3 — Create-website wizard
**Goal:** owner can create and publish a site end to end (no AI yet).

- [ ] Step 1: choose Business/Product or Portfolio
- [ ] Step 2: choose template (cards with live preview) — only Minimal Mono available for now, others "coming soon"
- [ ] Step 3: section forms (hero, about, skills, experience, education, projects, contact…), autosave drafts, image upload, reorder sections, empty = omitted
- [ ] Step 4: placeholder for knowledge step (built in Phase 4)
- [ ] Step 5: slug picker with live availability check, preview, **Deploy** button
- [ ] Site appears on dashboard with live link

**Done when:** a new user completes the wizard in under 5 minutes and the site is live at `/site/[slug]`; slug collisions and reserved words handled.

---

## Phase 4 — Knowledge base
**Goal:** owners can teach the bot facts.

- [ ] Add text fact (title/question + answer), edit, delete, optional expiry, visibility
- [ ] File upload (PDF, DOCX, TXT): parse server-side → chunk → propose **fact cards** for owner review (nothing is trusted until approved)
- [ ] Paste resume/LinkedIn text → proposed facts (LLM extraction) → review screen
- [ ] Embedding pipeline with the fixed platform embedding model; store vectors in pgvector
- [ ] Retrieval function: top-k facts for a site + similarity score
- [ ] Knowledge Base tab in site workspace; wizard step 4 wired up
- [ ] Wizard section data auto-seeds starter facts (owner reviews and approves)

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

- 2026-11-17: Single TypeScript full-stack repo. "Deploy" = publish at `/site/[slug]`. General-tech answers off by default. Plans are faked. Embeddings use one fixed platform model; generation uses owner's provider.
