# Claude Artifact edition

`AcademicProofreaderArtifact.jsx` is a scaled-down, single-file version of the
proofreader meant to run directly inside a claude.ai (or Claude Desktop)
conversation as an **Artifact**, with no install step and no API key.

## How to use it

1. Open a new conversation at claude.ai (or in Claude Desktop).
2. Paste the entire contents of `AcademicProofreaderArtifact.jsx` into the
   chat and ask Claude to render it as an artifact (e.g. "render this as a
   React artifact").
3. Use it directly in the artifact panel — no `npm install`, no `.env`, no
   dev server.

Proofreading, cover-letter drafting, and reviewer-response drafting all go
through the artifact's built-in `window.claude.complete(prompt)` completion
API, so there is nothing to configure. That API only exists when the
component is actually running as a claude.ai/Claude Desktop Artifact —
pasting it into a plain HTML page or another React app will not work.

## What's different from the full app (`../src`)

The Artifact sandbox doesn't allow a custom backend, arbitrary `npm install`,
or reliable persistent storage, so this version trades some things away:

| | Full Next.js app | Artifact edition |
|---|---|---|
| Proofreading engine | Anthropic API via server-side Route Handler | `window.claude.complete` (no key needed) |
| Whitelist / version history / comments / draft autosave | Persisted to `localStorage` | In-memory only — **lost on refresh** |
| Export | Copy text, `.docx` download | Copy text, plain `.txt` download only |
| Data/prompt modules | Split across `src/lib/*.ts` | Inlined in one file |

Everything else — the two-column layout, track-changes diff with click-to-view
reasons (English/Japanese toggle), Accept/Reject (All), journal profiles
(Nature/Science/PNAS/PLOS ONE/Bioinformatics/General), style presets, the
whitelist with field presets, word-count tracking, the consistency checker,
figure/table caption mode, reviewer-response drafting, and cover-letter
generation — works the same way.
