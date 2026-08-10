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