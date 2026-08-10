# CareerAI — Architectural Decisions Log

Rationale for notable decisions, so they can be defended in interviews/reviews.

## Phase A decisions

### D1: Groq over Anthropic/OpenAI
Groq's OpenAI-compatible SDK is free (no billing risk for a student project) and very fast, which matters for live demos. All calls are server-side; the key is only read from `process.env.GROQ_API_KEY`.

### D2: Two-model strategy inside the free tier
- Reasoning-heavy tasks (roadmap, interview evaluation, resume analysis) → `llama-3.3-70b-versatile`.
- Lightweight task (opening interview question) → `llama-3.1-8b-instant`.
Rationale: preserves the reasoning model's rate-limit budget for the demo-critical moments and keeps low-value calls cheap/fast.

### D3: Retry with exponential backoff on 429/5xx
The free tier throttles at ~30 req/min, and the UI can fire concurrent calls (both roadmap and interview are single calls, but resume uploads can burst). Retrying with capped exponential backoff (500ms→2s, max 3 retries) makes bursts self-healing without user-visible failures.

### D4: Defensive JSON parsing with one regeneration
LLMs occasionally return fenced or truncated JSON. We strip ```json fences, attempt a strict parse, and regenerate ONCE on failure (models rarely fail twice). Then we run a light structural validation (e.g., `overallScore` is a number, roadmap is a non-empty array) before persisting to MongoDB. This keeps malformed AI output from corrupting the DB or the UI.

### D5: Keep mock fallbacks
When `GROQ_API_KEY` is absent (fresh clone, CI, offline demo), the service returns deterministic mock data. This guarantees the whole product is demoable without touching paid quota and lets Jest tests run without network calls or key setup.

### D6: Reuse of existing output shapes
The AI migration preserved the `ClaudeAnalysis`/`RoadmapMonth`/`InterviewEvaluation` output contracts exactly (renamed only). This avoided any frontend or database changes in the same phase — safe, reviewable, single-responsibility commit.

### D7: Root fix for the src/ build-artifact leak
`tsc`/ts-jest were emitting `.js` + `.d.ts` into `src/` (no rootDir/outDir) — and as OneDrive placeholders they barely show up in normal directory listings, making the pollution invisible until jest started failing on empty `.d.ts` suites. Fixed at the config level: `rootDir`/`outDir`, no declarations (this is an app, not a publishable library), ts-jest in transpile-only mode, jest `roots` pinned to `src/`. Worth mentioning in interviews as a "build hygiene / invisible CI breakage" war story.

### D8: Serve-then-validate AI JSON
Rather than blindly trusting Llama's JSON, every structured call now passes through `extractJson` (fence stripping) → strict parse → single regeneration → light shape validation before anything touches Mongo or the UI. This prevents both corrupted DB rows and confusing 500s on the demo.

## Phase B decisions

### D9: Deterministic rules for objective checks, LLM only for semantics
ATS structure checks (sections, contact info, tables, length) are pure rule-based functions with 24 jest tests — because "was there a table?" is a factual question where an LLM can hallucinate. The ONLY AI step is keyword extraction from the JD (fast model). This separation is the answer to "why didn't you just ask the LLM for a score?" — reproducible, testable, zero-cost, and defensible in interviews.

### D10: One LLM call per ATS run, not three
Extract keywords from the JD once (fast model), then match them against the resume text with deterministic word-boundary regexes. Extracting from BOTH texts would double the cost and rate-limit risk without improving accuracy. Rate-limit budget stays in reserve for roadmap/interview demos.

### D11: Word-boundary matching with special-case fallback
Pure-alphanumeric keywords get `\b` boundaries ("excel" ≠ "excellent"); special-char keywords (C++, .NET, node.js, C#) fall back to substring matching where boundaries are unreliable ("C#" with \b would never match "C#"). Small detail, big difference in match accuracy.

### D12: Weights normalize when no JD is provided
The keyword check (50 pts) only exists when a JD is pasted. Score = earned/available×100 keeps structural-only runs on the same 0–100 scale — no "what does 78 without a JD mean" confusion in demos.

### D13: Persist resumeText once, reanalyze many times
`ResumeAnalysis.resumeText` (cap 20k) means ATS (and later: placement analytics, PDF export) can re-run against the stored text without asking the user to re-upload. Costs ~20KB/document in MongoDB — a fair trade for the UI flow.

## Phase C decisions

### D14: Server is the source of truth for board state
Drag-and-drop mutates local state optimistically but every move is PATCHed to MongoDB; on failure the board reverts and refetches. This gives instant UI feedback with zero risk of the demo showing a lie.

### D15: State bridge via zustand, not prop drilling
JobMatcher → ApplicationTracker cross-component communication uses a tiny 3-line zustand slice (pending job queue) instead of lifting state into Dashboard. Components stay independently mountable and testable.

### D16: Trust boundaries on the create endpoint
When adding a matched job, title/company are loaded server-side from the Job document — the client only sends `{jobId, matchScore}`. Manual entries require title/company from the user. Prevents payload spoofing between the two flows.

### D17: No @dnd-kit/sortable (yet)
Column-to-column drags via `@dnd-kit/core` cover the master-prompt requirement; in-column sorting is deferred. `position` is still persisted so adding sortable later is a UI-only change.

## Phase D decisions

### D18: Gamification is a server-side projection, never a client-side count
All XP/streak/badge math lives in one service; the UI only renders snapshots. No client can fake a level, and a refresh is always truthful.

### D19: Fire-and-forget award calls
`void awardXp(...).catch(() => {})` — a gamification DB failure must never return 500 on a resume upload. Core flows stay correct even if the bonus layer breaks.

### D20: Deterministic badge checks instead of "unlocks" a user might miss
Every badge is a pure function of `{counts, xp, streak, meta}` evaluated on every award — badges earn retroactively (e.g. roadmap #5 grants Pathfinder even if the UI never showed Stargazer's progress).

### D21: Display names vs logic ids
Badge names are human-readable ("Stargazer", "Unstoppable") so the shelf reads like a game, while `id`s drive logic. XP is deliberately small (10-50) vs level costs (150+ per level) so early progress feels fast.

## Phase E decisions

### D22: Server-side PDFs (pdfkit), not a client library
One source of truth renders both PDFs, the ATS structure score inside the report costs zero AI tokens, and nothing new ships to the browser. Client work is a two-button panel.

### D23: Resume report includes a freshly computed ATS score
`resumeText` (D13) pays off — the PDF embeds a rule-based ATS audit at export time, so the report is a complete snapshot without requiring the user to re-upload.

### D24: Keep exports deterministic
No AI calls in the export path; only stored data + rule-based checks. Exporting is fast, offline-safe and never blocked by a Groq outage.

## Phase F decisions

### D25: Tests assert on extracted PDF text, not just file headers
The export tests round-trip generated PDFs through pdf-parse's `PDFParse({data})` so they verify real content (section titles, scores, roadmap months), not merely that a %PDF header exists.

### D26: Jest runs with `--experimental-vm-modules`
pdf-parse v2 bundles pdfjs-dist, which uses dynamic `import()`. The test script sets `NODE_OPTIONS` via `cross-env` so the suite runs identically on Windows, macOS and Linux CI.

### D27: Extraction of pure badge logic for unit testing
`evaluateNewBadges(earnedIds, ctx)` is a pure function of the same context object `awardXp` builds — the 37-test suite covers badge thresholds without requiring a database connection.