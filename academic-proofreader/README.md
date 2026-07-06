# Academic English Proofreader

Academic English proofreading web app (Paperpal-style), extended into a full scientific paper authoring environment. Built with Next.js (App Router), TypeScript, Tailwind CSS, the Google Gemini API (`@google/genai`), Supabase (Auth + PostgreSQL), and Stripe (billing framework). All six planned phases (see `docs/ARCHITECTURE.md`) are implemented.

## Getting started

```bash
cp .env.example .env.local   # add your GEMINI_API_KEY (and optionally Supabase)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Supabase env vars the app runs in **local mode** (localStorage only), exactly like before. To enable cloud persistence: create a Supabase project, run `supabase/migrations/0001_init.sql` then `0002_billing.sql` against it (SQL editor or `supabase db push`), and set `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Sign-in then migrates the local draft to the cloud and keeps them in sync. `SUPABASE_SERVICE_ROLE_KEY` additionally enables usage metering, daily plan quotas, and the Stripe webhook's writes. Add `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_PRO` on top of that to enable upgrade/billing-portal buttons — see `.env.example`.

## Features

- Tabs: 執筆支援 (drafting), 本文校正 (body proofreading), 図表キャプション (figure/table captions), 文献・引用 (references & citations), 品質・投稿準備 (quality & submission prep), エクスポート・体裁 (export & formatting), 査読対応 (response to reviewers).
- **Proofreading**: track-changes style diff (strikethrough deletions, underlined+colored additions) with per-correction Accept/Reject, Accept All / Reject All, click-to-view reasons (English/Japanese toggle), a word-count tracker vs. the journal's limit, and a consistency checker for undefined abbreviations/inconsistent terminology (e.g. "AWD" vs. "alternate wetting and drying").
- **Drafting**: research-notes → editable IMRaD outline generator; section-by-section draft assistant (pick a section + rhetorical "move"); a static Academic Phrasebank (contrast/claim/limitation/implication/background/summary); conservative paraphrase or word-count compression of a selection — all insert directly into the body editor at the cursor.
- **References & citations**: import BibTeX/RIS (hand-written parsers, normalized to CSL-JSON), search Crossref/Semantic Scholar/PubMed and add/cite results, an AI citation checker (uncited references, in-text citations with no matching reference), and a formatted bibliography (Vancouver/APA/Nature) that auto-updates as you cite — see `docs/ARCHITECTURE.md`'s Phase 2 notes for how the formatter is scoped.
- **Quality & submission prep**: interactive reporting-guideline checklists (PRISMA/ARRIVE/MIQE/CONSORT/STROBE) where you can accept or override the AI's per-item verdict; a statistical-reporting consistency check (p-values, CIs, effect sizes, significant figures); Data Availability/Ethics/COI/Funding statement generation from a short form; title/abstract/keyword optimization suggestions; and companion-document drafts (Plain Language Summary, Highlights, graphical-abstract caption, suggested-reviewers).
- **Export & formatting**: a lightweight inline tag syntax (`[[fig:label]] caption`, `[[table:label]] caption`, `[[eq:label]]`, `[[ref:label]]`) drives auto-numbering and cross-referencing; a live panel lists every figure/table/equation and flags unresolved refs. LaTeX export converts these to real `\label`/`\ref` (numbering stays LaTeX-native); Markdown export resolves them to plain text/numbers. A journal-template formatter reorders the manuscript's `##` sections to match the selected journal's `headingTemplate`. All of this is pure client-side text transformation (`src/lib/export/`) — no AI, no API route, works offline.
- Journal-specific style/format/citation profiles (`src/lib/journalProfiles.ts`) for Nature, Science, PNAS, PLOS ONE, Bioinformatics, and a General fallback — add a journal by appending an entry to that file.
- Domain whitelist for terms that should never be rewritten (with field presets: agronomy, genetics, bioinformatics, clinical medicine).
- Cover letter draft generator and Response-to-Reviewers draft generator (Gemini, server-side).
- Version history (one snapshot per proofreading run) with a word-level diff against the current text, plus a lightweight comment thread.
- Copy-to-clipboard and `.docx` export of the revised text.
- Optional Supabase-backed accounts: signed-out/unconfigured → localStorage-only; signed in → documents, versions, whitelist, and references sync to Postgres (RLS-scoped per user).
- **Usage & billing (productization)**: every Gemini-backed route goes through one gate (`src/lib/aiGate.ts`) enforcing a per-minute rate limit *and* a daily free/pro quota (`src/lib/quota.ts`, backed by `usage_events`); a sidebar panel shows today's usage and plan. A working (but disabled-until-configured) Stripe framework handles checkout, the billing portal, and webhook-driven plan updates — see `src/lib/billing/stripe.ts`. Plagiarism/AI-generated-text detection is deliberately *not* implemented in-house; only the integration interface exists (`src/lib/integrations/plagiarismCheck.ts`), with the reasoning in that file's header comment.

## Architecture

See `docs/ARCHITECTURE.md` for the full picture (directory layout, DB schema, API route list, data flow, phase plan). Highlights:

- `src/config/` — model IDs, env access, rate-limit/plan quotas.
- `src/types/` + `src/schemas/` — API contracts and Gemini `responseSchema` definitions, fixed before implementation.
- `src/lib/ai/gemini.ts` — server-only Gemini wrapper (structured output via `responseMimeType` + `responseSchema`).
- `src/app/api/*/route.ts` — Route Handlers with rate limiting (`lib/rateLimit.ts`), optional Bearer auth (`lib/serverAuth.ts`), and usage metering (`lib/usage.ts`).
- `src/context/AuthContext.tsx` + `src/lib/repo/cloudSync.ts` — Supabase auth and DB⇔localStorage sync; `supabase/migrations/` holds the schema.
- `src/components/` — UI grouped by feature area.

The app is mounted via `next/dynamic({ ssr: false })` in `src/app/page.tsx` since all state is seeded from `localStorage`, which only exists in the browser.
