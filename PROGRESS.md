# CareerAI — Build Progress Log

Phase-by-phase record of what has been built, what was assumed, and what needs manual testing.

## Phase A — Migrate AI Service Layer to Groq (COMPLETE)

### Built
- Rewrote `server/src/services/ai.service.ts` to be fully Groq-branded (types/functions renamed from `Claude*` to `Groq*`; behavior unchanged for callers).
- Added rate-limit + transient-failure retry: exponential backoff (500ms → 1s → 2s, capped at 5s, max 3 retries) for HTTP 429/5xx and network errors — required because Groq free tier is ~30 req/min.
- Added defensive structured-JSON parsing: strips markdown fences and regenerates the response ONCE on malformed output, with light shape validation per call.
- Model split per master prompt: `llama-3.3-70b-versatile` (resume, roadmap, interview feedback) and `llama-3.1-8b-instant` (initial interview question only, to preserve reasoning quota).
- Updated all three controller imports + parser.service.ts comment.
- Updated client UI copy ("Claude AI" → "AI"/"Groq" in Dashboard, ResumeFeedback, ResumeUploader).
- Updated `render.yaml`, `README.md`, `ARCHITECTURE.md` (no Anthropic references remain).
- Removed stray `@google/genai` dependency from server package.json.

### Assumptions
- Mock fallbacks (no `GROQ_API_KEY`) retained so the app is demoable without a key.
- Function *behavior/output shapes* unchanged, so the frontend did not need API changes.

### Unplanned fixes (build was red before Phase A — CI would have failed)
- `server/tsconfig.json` had `verbatimModuleSyntax: true` + `type: commonjs` ⇒ ~50 TS errors in every file; disabled it (ESM syntax now transpiles to CJS as normal).
- `tsconfig` had no `rootDir`/`outDir`, so `tsc` and ts-jest emitted `.js`/`.d.ts` artifacts INTO `src/`; set `rootDir: ./src`, `outDir: ./dist`, removed `declaration`/`declarationMap` (app, not a library), switched jest to ts-jest `isolatedModules` mode, and restricted jest to `roots: ["<rootDir>/src"]`. Deleted 69 leaked artifacts (OneDrive placeholder reparse-points needed `-Force`).
- `parser.service.ts` used pdf-parse's **v1 function API** but v2 is installed (class `PDFParse` + `getText()`) — rewrote it (also gives us `getTable()` later for the ATS checker).
- `analytics.controller.ts` referenced non-existent fields (`analysis.score`, `analysis.skillsDetected`, `task.completed`) — corrected to `overallScore`, `detectedSkills`, `isCompleted` + undefined-guard on the latest-roadmap lookup.
- `middlewares/auth.ts` JWT decode cast/`token` undefined handling tightened.
- `embedding.service.test.ts` now imports jest globals explicitly from `@jest/globals` (tsconfig has `"types": []`).
- Client: added `ignoreDeprecations: "6.0"` (baseUrl deprecation blocked `tsc -b`), fixed type-only imports and removed unused imports flagged by `noUnusedLocals`.

### Manual test checklist
1. Without `GROQ_API_KEY`: upload a resume → mock analysis appears (score gauge, skills, feedback, rewrites).
2. With a valid `GROQ_API_KEY`: upload a resume → real AI analysis within ~2-5s.
3. Generate a roadmap from the Skills page app overlay → 3-month plan renders; toggle a task → progress recalculates.
4. Mock interview: start session → question appears; answer 3 times → completion with average score.
5. Job matcher still returns matches (embeddings unaffected by this phase).

## Phase B — ATS Compatibility Checker (COMPLETE)

### Built
- **`server/src/services/ats.service.ts`** — deterministic, unit-tested rule engine:
  - Section-header detection (Experience/Education/Skills, weighted 20 pts)
  - Contact info (email 6, phone 5, LinkedIn/GitHub 4 = 15 pts)
  - Table/column layout heuristics (tab-separated rows, "|" separators, wide column alignment — indentation excluded to avoid bullet-list false positives, 12 pts)
  - Length sanity floor (150 words, 3 pts)
  - Keyword matching vs job posting (50 pts, scaled by match rate) with word-boundary regexes (so `excel` never matches `excellent`) and special-char fallbacks for `C++`/`.NET`/`node.js`
  - Score normalizes to earned/available when no JD is supplied (structural-only run)
- **`extractKeywordsWithGroq`** in ai.service.ts — fast model (`llama-3.1-8b-instant`), strict JSON array, reuses the retry + regenerate-on-malformed pipeline; returns `null` without a key so the caller can fall back to `extractKeywordsRuleBased` (offline deterministic splitter).
- Controller + route `POST /api/resume/ats` (protected); `resumeText` now persisted with each analysis (`ResumeAnalysis.resumeText`, capped 20k chars) so ATS runs without re-uploading.
- **`client/src/features/resume/ATSReport.tsx`** — score dial, pass/warn/fail checklist, matched/missing keyword chips, JD textarea + re-run button; wired under ResumeFeedback on the Dashboard; friendly 404 state when no resume exists yet.
- **24 jest tests** passing (2 suites): section/contact/layout/length rules, keyword normalization + boundary matching, full-report scoring bounds.

### Assumptions
- "ATS compatibility" = rule-based heuristics (clearly labeled in UI); real ATS systems are commercial/opaque, so the module demonstrates the *thinking* behind them.
- Stored resumeText is capped at 20k chars to avoid bloating MongoDB.
- Existing DB rows created before Phase B lack `resumeText` — the API returns a clear "re-upload" message (no data migration needed for a dev-stage app).

### Manual test checklist
1. Analyze a resume → scroll to ATS card → structural score appears (~90+ for a good resume).
2. Paste a JD with keywords the resume lacks → "Missing from Resume" chips appear; score drops as keyword coverage drops.
3. Without a key… (no longer applicable — key is now set) rules still work via rule-based extraction.
4. Check the checklist details text — they are candidate-facing advice, usable in the demo.

## Phase C — Application Tracker (Kanban) (COMPLETE)

### Built
- **`server/src/models/Application.ts`** — `{ user, job?, title, company, jobUrl, matchScore(0-100), status, position }` with a compound index `{user, status, position}` covering the board query; statuses strictly enumerated.
- **Controller + routes** under `/api/applications`: list (board order), create (from match engine or manual), patch (drag-drop persistence), delete. Column moves auto-append at the end of the new column; duplicates by job ref are rejected (409).
- **`client/src/features/applications/ApplicationTracker.tsx`** — real drag-and-drop via `@dnd-kit/core` (PointerSensor with 6px activation distance so clicks/card buttons don't trigger drags). Optimistic column move + PATCH, revert+refetch on failure. Match-score badge (cosmetic-similarity % or "manual"), hover-reveal delete, empty-state "Drop jobs here", manual add form (title/company/URL).
- **Job Matcher integration** — "Track" button per matched job → `useTrackerStore` (zustand) pending-job bridge → tracker POSTs with `jobId + matchScore*100`; "Added ✓" state, and the server pulls title/company from the Job doc (client can't spoof text).
- Wired as a new dashboard section below the job matcher.

### Assumptions
- Within-column reordering is not supported (only column-to-column) — `position` still persists for future sorting work. Keeps dnd surface small and robust.
- `@dnd-kit/sortable` deliberately not used; cards append to the end of a column.

### Manual test checklist
1. Seed jobs if empty → cards show on saved column after clicking Track.
2. Drag a card between columns → refreshes (F5) and it stays where dropped.
3. Add a manual job → appears in Saved; delete both kinds of cards.
4. Track the same job twice → friendly "already on your board" error.
5. Kill the backend mid-drag → card reverts to its original column.

## Phase D — Gamification (COMPLETE)

### Built
- **`Gamification` model** (server-only, no UI persistence) — `{ xp, streakCount, lastActivityDate (UTC day key), counts, badges[], recentEvents[] }`, one doc per user.
- **`gamification.service.ts`** — XP table (resume +20, ATS +15, roadmap +50, application +10, stage advance +15, interview +40), level curve `sqrt(xp/150)`, calendar-day streak logic (consecutive UTC days, else reset), and a 13-badge catalog with deterministic checks.
- **Award hooks** (fire-and-forget, `.catch(() => {})` so gamification can never break a core flow): resume analyze, ATS check (meta: score → "ATS Maestro" 90+ badge), roadmap generate, application create, column move (status change only), interview completion.
- **`GET /api/gamification`** → snapshot `{ xp, level, xpIntoLevel, xpForNextLevel, streakCount, badges (earned flags), recentEvents }`.
- **`GamificationCard`** on the dashboard — level + XP progress bar, streak flame, "Recent" XP activity, and a 13-slot badge shelf (locked badges grayscale with tooltips).
- **Live refresh**: actions dispatch a `window` `gamification-updated` event; card refetches.

### Assumptions
- No manual test-award endpoint; badges unlock only through real usage.
- Streak is UTC-calendar based, not 24-hour rolling.

### Manual test checklist
1. Analyze resume → XP +20, 📄 Documented badge lights up, level bar advances.
2. Run ATS check → +15; add a job to the tracker → +10 ("On Board").
3. Drag a card to a new column → +15 ("Climbing" at 3 moves).
4. Generate roadmap → +50 ("Stargazer"); complete a mock interview → +40 ("Interview Ready").
5. Live reload of the card: verify badge shelf updates without an F5.

## Phase E — PDF Export (COMPLETE)

### Built
- **`pdfkit`** (server-side, no client libs) + **`export.service.ts`** — two deterministic PDF builders:
  - **Resume Report**: dark CareerAI header, overall score bar (color-coded), rule-based **ATS structure score** (reuses `buildAtsReport` on the stored `resumeText`, zero AI calls), detected skills chips, per-section feedback, and original → rewrite → reason triples.
  - **Career Roadmap**: progress bar, per-month focus area with hours + task completion, topics/projects/resources lists, ☐/✓ task checkboxes, multi-page footers with page numbers.
- **`GET /api/export/resume-report`** and **`GET /api/export/roadmap`** (auth protected) → `application/pdf` attachments.
- **`ExportPanel`** on the dashboard — two download buttons, friendly 404 messaging ("analyze a resume / generate a roadmap first"), blob download via `URL.createObjectURL`.

### Verified
- Server `tsc` + 24 Jest tests green; client `tsc` + build green.
- Runtime smoke: server boots (tmp in-memory Mongo when no URI), `/api/health` OK, `/api/export/roadmap` returns 401 without a token (route + middleware wired).

### Manual test checklist
1. Analyze a resume → Download "Resume Report" → opens a valid multi-page PDF.
2. Generate a roadmap → Download "Career Roadmap" → checkboxes reflect completed tasks.
3. Fresh account → both buttons show the "nothing to export yet" message.

## Phase F — Polish, Tests, CI, Docs (COMPLETE)

### Built
- **New test suites** (server now **37 tests**, all passing):
  - `gamification.service.test.ts` — level curve, XP table, and all badge thresholds (including 90+ ATS and 7-day streak edge boundaries) via the newly extracted pure `evaluateNewBadges` helper.
  - `export.service.test.ts` — builds real PDFs with pdfkit and re-extracts their text via pdf-parse's `PDFParse({data})` API to assert actual content, page validity (`%PDF-`/`%%EOF`) and score/roadmap rendering.
- **CI**: `.github/workflows/ci.yml` — server (build + jest) and client (oxlint + tsc/vite build) jobs on every push/PR to `main`. Requires `--experimental-vm-modules` for pdfjs under Jest, added via `cross-env` in the test script (cross-platform).
- **README.md**: full rewrite — feature table for all six modules, updated architecture, phases table with commit hashes, testing/dev instructions.
- **Lint cleanup**: removed unused catch params in JobMatcher/RoadmapView; `npm run lint` now reports zero warnings.

### Verified (final pass)
- Server: `tsc` clean, 37/37 Jest tests pass.
- Client: oxlint zero warnings, `tsc -b && vite build` clean.
- Runtime smoke: server boots, `/api/health` OK, protected `/api/export/*` returns 401 unauthenticated.

### Full manual test checklist (all phases)
1. Register/login → dashboard loads with analytics.
2. Upload resume → score + feedback; run ATS check with a JD; watch XP/gamification card update live.
3. Seed sample jobs → "Track" a matched job → appears on the Kanban board; drag between columns.
4. Generate an AI roadmap from a match → tick tasks; complete a mock interview.
5. Download both PDFs → resume report contains the ATS audit; roadmap shows checkbox progress.
6. Badge shelf: Documented, On Board, Stargazer, Interview Ready unlock in order; streak flame appears next session.

## Deployment — Vercel only (LIVE, one env var pending)

**Goal from user: "deploy in vercel only"** — no Render, no external VM.

### What's live
- **API** → `https://careerai-api.vercel.app` (`/api/health` returns `success`; protected routes return 401/404 correctly).
- **Frontend** → `https://careerai-alpha.vercel.app` (HTTP 200, SPA rewrites working).

### Architecture
- `server/src/app.ts` — Express app assembled, exported; `server/src/index.ts` — local-only entry (listen + DB fail-fast); `server/api/index.ts` — Vercel serverless entry (default-export the app, connect DB on cold start).
- `server/vercel.json` — classic `builds` (`@vercel/node` on `api/index.ts`) + catch-all `routes` so **every** path hits the one lambda. Deliberately bypasses the auto-detected "express" framework preset (see pitfalls).
- `client/vercel.json` — SPA rewrite to `index.html`; `VITE_API_URL` env points the axios client at the API.
- Env vars set in Vercel: `JWT_SECRET`, `GROQ_API_KEY` (API), `VITE_API_URL` (client). **Pending: `MONGODB_URI`** (user is creating a free Atlas cluster; without it `connectDB` intentionally fails fast on Vercel — see `src/config/db.ts`).

### Pitfalls hit & fixed (documented in `deployment_checklist.md`)
1. Stale `api/index.js` next to `index.ts` → "conflicting paths" deploy error → deleted, redeployed.
2. Vercel's "express" framework preset built a **second** lambda at path `index`; `/api/*` 404'd while root hit the wrong function → replaced with explicit `builds` + `routes`.
3. pdf-parse **v2** crashed Vercel's Node runtime at boot (`DOMMatrix is not defined` — browser pdfjs in a serverless lambda) → pinned `pdf-parse@1.1.1` (pure Node CJS), reverted `parser.service.ts` + export tests to the v1 callable API.

### Remaining steps
1. User pastes Atlas connection string → `vercel env add MONGODB_URI production` → `vercel --prod --yes`.
2. Full E2E against prod: register → seed jobs → track/drag → resume upload (parses PDF!) → ATS → roadmap → interview → PDF downloads → badge unlocks.

## ALL PHASES COMPLETE — delivery ready