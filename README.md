# CareerAI — Intelligent Career Growth Platform

CareerAI is an AI-powered career coaching platform that helps job seekers align their skills with market demand, generate personalized learning roadmaps, practice technical interviews, and track applications to offer. Built as a full-stack capstone with React, TypeScript, Express, MongoDB and the Groq AI API.

![Dashboard Preview](./client/public/dashboard-placeholder.png)

## Features

| Module | What it does |
| --- | --- |
| **Resume Parsing & AI Scoring** | Upload PDF/DOCX, get parsed, scored, rewritten bullets and section feedback from Groq (Llama 3.3 70B). Raw text is stored for reuse. |
| **ATS Compatibility Checker** | Rule-based audit of parseability (contact info, standard sections, length, layout, action verbs) plus AI keyword extraction against a job description. Deterministic scores — no flaky AI inference on structure. |
| **Smart Job Matching** | Vector embeddings + Cosine Similarity against a seed job catalog; per-job missing-skill gaps and an **AI roadmap** generated from those gaps. |
| **AI Career Roadmaps** | Month-by-month study plans with tasks you can tick off; progress persists and feeds the analytics dashboard. |
| **Mock Interview Simulator** | Chat-based interview room where the AI acts as a recruiter, asks follow-ups and scores each answer until the interview ends. |
| **Application Tracker (Kanban)** | Drag-and-drop board — Saved → Applied → Interviewing → Offer → Rejected — wired to matched jobs with a one-click "Track" button. |
| **Gamification** | XP, levels, daily activity streaks and 13 badges awarded server-side across every module. |
| **PDF Export** | Download your resume report (with embedded ATS audit) or your roadmap as a styled PDF. |
| **Premium Analytics** | Recharts dashboard of scores, roadmap progress and interview performance. |

## Architecture

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Zustand, Recharts, Lucide icons, `@dnd-kit` core.
- **Backend**: Node.js, Express 5, TypeScript, MongoDB (Mongoose), JWT auth, Multer, pdfkit.
- **AI**: Groq API — Llama 3.3 70B for deep reasoning (analysis, roadmap, interview), Llama 3.1 8B for fast calls (keyword extraction, embeddings fallback). Every AI call falls back to deterministic mock logic when `GROQ_API_KEY` is absent, so the whole app runs offline.
- **Testing**: Jest + ts-jest (server), oxlint (client), GitHub Actions CI on every push.

## Local Setup

### Prerequisites
- Node.js v18+ (v22 recommended)
- MongoDB (local or Atlas) — *optional: falls back to an in-memory DB when no URI is provided*
- Groq API key — *optional: falls back to mock AI*

### Installation

1. Clone the repository.
2. Install dependencies for both client and server:
   ```bash
   cd client && npm install
   cd ../server && npm install
   ```

3. Set up environment variables — create a `.env` in `/server`:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   GROQ_API_KEY=your_groq_api_key
   ```

4. Run the development servers:
   ```bash
   # Terminal 1 (Backend)
   cd server
   npm run dev

   # Terminal 2 (Frontend)
   cd client
   npm run dev
   ```

5. Open `http://localhost:5173`, register an account, and start with the **Seed Sample Jobs** button in the Job Matcher.

## Testing & CI

```bash
cd server && npm test        # 37 Jest tests: ATS rules, embeddings, gamification, PDF builders
cd client && npm run lint    # oxlint
cd client && npm run build   # tsc + vite production build
```

GitHub Actions runs the server suite and the client lint/build on every push to `main`.

## Build Phases

Phases A–E are complete and each was shipped as a single commit:

| Phase | Deliverable | Commit |
| --- | --- | --- |
| A | Groq AI migration (dual-model, offline fallbacks) | `7fa133f` |
| B | ATS Compatibility Checker | `2c0f56b` |
| C | Application Tracker Kanban (@dnd-kit) | `47e2f6d` |
| D | Gamification (XP, streaks, badges) | `ed4d30d` |
| E | PDF export (resume report + roadmap) | `36c7811` |
| F | Polish, tests, CI, docs | *current* |

See `PROGRESS.md` for per-phase notes and manual test checklists, and `DECISIONS.md` for the reasoning behind each architectural choice.

## Deployment (Vercel only — live)

Everything runs on Vercel as two projects: a static frontend and the Express API as a single serverless function.

| Part | URL | Config |
| --- | --- | --- |
| Frontend (Vite SPA) | https://careerai-alpha.vercel.app | `client/vercel.json` (SPA rewrite) |
| Backend (Express → one lambda) | https://careerai-api.vercel.app | `server/vercel.json` (`builds` + catch-all `routes`) |

Required environment variables on the **API** project: `MONGODB_URI` (Atlas), `JWT_SECRET`, `GROQ_API_KEY`. On the **client** project: `VITE_API_URL=https://careerai-api.vercel.app/api`.

Redeploy any time with `vercel --prod --yes` from the `server/` or `client/` directory (CLI is linked to the projects).

See `deployment_checklist.md` for the step-by-step launch guide, including creating a free MongoDB Atlas cluster.