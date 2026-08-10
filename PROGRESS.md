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

## Next phases
- **Phase C**: Application Tracker Kanban board (@dnd-kit) tied to job matches.
- **Phase D**: Gamified progress (streaks, XP, badges).
- **Phase E**: PDF export (resume report + roadmap).
- **Phase F**: Polish, tests, GitHub Actions, README/deploy finalization.