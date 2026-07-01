# Academic English Proofreader

Academic English proofreading web app (Paperpal-style) built with Next.js (App Router), TypeScript, Tailwind CSS, and the Anthropic API (Claude). All processing state is stored in the browser's `localStorage` — there is no backend database.

## Getting started

```bash
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- Two-column editor / proofreading-result layout with three modes: 本文校正 (body), 図表キャプション (figure/table captions), 査読対応 (response to reviewers).
- Track-changes style diff (strikethrough deletions, underlined+colored additions) with per-correction Accept/Reject, Accept All / Reject All, and click-to-view reasons (English/Japanese toggle).
- Journal-specific style/format profiles (`src/lib/journalProfiles.ts`) for Nature, Science, PNAS, PLOS ONE, Bioinformatics, and a General fallback — add a journal by appending an entry to that file.
- Real-time word count vs. the selected journal's limit, with an over-limit warning.
- Consistency checker for undefined abbreviations and inconsistent terminology (e.g. "AWD" vs. "alternate wetting and drying").
- Domain whitelist for terms that should never be rewritten (with field presets: agronomy, genetics, bioinformatics, clinical medicine).
- Cover letter draft generator and Response-to-Reviewers draft generator, both calling Claude server-side.
- Version history (one snapshot per proofreading run) with a word-level diff against the current text, plus a lightweight comment thread — both persisted to `localStorage`.
- Copy-to-clipboard and `.docx` export of the revised text.

## Architecture

- `src/lib/` — domain types, journal/style/whitelist data, prompt building, localStorage persistence, diff helpers.
- `src/app/api/*/route.ts` — server-side Route Handlers that call the Anthropic API; the API key never reaches the browser.
- `src/context/AppContext.tsx` — the single client-side state container (settings, drafts, results, whitelist, versions, comments) with `localStorage` sync.
- `src/components/` — UI, grouped by feature area (`proofread/`, `sidebar/`, `history/`, `comments/`, `coverletter/`, `reviewer/`).

The app is mounted via `next/dynamic({ ssr: false })` in `src/app/page.tsx` since all state is seeded from `localStorage`, which only exists in the browser.
