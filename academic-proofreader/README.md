# Academic English Proofreader

Academic English proofreading web app (Paperpal-style) being extended into a full scientific paper authoring environment. Built with Next.js (App Router), TypeScript, Tailwind CSS, the Google Gemini API (`@google/genai`), and Supabase (Auth + PostgreSQL). See `docs/ARCHITECTURE.md` for the full design and phase plan.

## Getting started

```bash
cp .env.example .env.local   # add your GEMINI_API_KEY (and optionally Supabase)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Supabase env vars the app runs in **local mode** (localStorage only), exactly like before. To enable cloud persistence: create a Supabase project, run `supabase/migrations/0001_init.sql` against it (SQL editor or `supabase db push`), and set `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Sign-in then migrates the local draft to the cloud and keeps them in sync (`SUPABASE_SERVICE_ROLE_KEY` additionally enables usage metering).

## Features

- Tabs: 執筆支援 (drafting), 本文校正 (body proofreading), 図表キャプション (figure/table captions), 文献・引用 (references & citations), 査読対応 (response to reviewers).
- **Proofreading**: track-changes style diff (strikethrough deletions, underlined+colored additions) with per-correction Accept/Reject, Accept All / Reject All, click-to-view reasons (English/Japanese toggle), a word-count tracker vs. the journal's limit, and a consistency checker for undefined abbreviations/inconsistent terminology (e.g. "AWD" vs. "alternate wetting and drying").
- **Drafting**: research-notes → editable IMRaD outline generator; section-by-section draft assistant (pick a section + rhetorical "move"); a static Academic Phrasebank (contrast/claim/limitation/implication/background/summary); conservative paraphrase or word-count compression of a selection — all insert directly into the body editor at the cursor.
- **References & citations**: import BibTeX/RIS (hand-written parsers, normalized to CSL-JSON), search Crossref/Semantic Scholar/PubMed and add/cite results, an AI citation checker (uncited references, in-text citations with no matching reference), and a formatted bibliography (Vancouver/APA/Nature) that auto-updates as you cite — see `docs/ARCHITECTURE.md`'s Phase 2 notes for how the formatter is scoped.
- Journal-specific style/format/citation profiles (`src/lib/journalProfiles.ts`) for Nature, Science, PNAS, PLOS ONE, Bioinformatics, and a General fallback — add a journal by appending an entry to that file.
- Domain whitelist for terms that should never be rewritten (with field presets: agronomy, genetics, bioinformatics, clinical medicine).
- Cover letter draft generator and Response-to-Reviewers draft generator (Gemini, server-side).
- Version history (one snapshot per proofreading run) with a word-level diff against the current text, plus a lightweight comment thread.
- Copy-to-clipboard and `.docx` export of the revised text.
- Optional Supabase-backed accounts: signed-out/unconfigured → localStorage-only; signed in → documents, versions, whitelist, and references sync to Postgres (RLS-scoped per user).

## Architecture

See `docs/ARCHITECTURE.md` for the full picture (directory layout, DB schema, API route list, data flow, phase plan). Highlights:

- `src/config/` — model IDs, env access, rate-limit/plan quotas.
- `src/types/` + `src/schemas/` — API contracts and Gemini `responseSchema` definitions, fixed before implementation.
- `src/lib/ai/gemini.ts` — server-only Gemini wrapper (structured output via `responseMimeType` + `responseSchema`).
- `src/app/api/*/route.ts` — Route Handlers with rate limiting (`lib/rateLimit.ts`), optional Bearer auth (`lib/serverAuth.ts`), and usage metering (`lib/usage.ts`).
- `src/context/AuthContext.tsx` + `src/lib/repo/cloudSync.ts` — Supabase auth and DB⇔localStorage sync; `supabase/migrations/` holds the schema.
- `src/components/` — UI grouped by feature area.

The app is mounted via `next/dynamic({ ssr: false })` in `src/app/page.tsx` since all state is seeded from `localStorage`, which only exists in the browser.
