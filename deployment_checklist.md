# CareerAI — Deployment Checklist (Vercel only)

Everything deploys to Vercel as two projects under the `sharanu1` account:

- **careerai** (frontend) → `https://careerai-alpha.vercel.app`
- **careerai-api** (backend, single Express serverless function) → `https://careerai-api.vercel.app`

## 1. Prerequisites

- `vercel` CLI installed and logged in (`vercel whoami` → `sharanu1`).
- A **MongoDB Atlas** free cluster + connection string (see step 4).

## 2. Backend deploy (`/server`)

```bash
cd server
vercel link --yes --project careerai-api
# set env vars (one-time):
vercel env add MONGODB_URI production
vercel env add JWT_SECRET production
vercel env add GROQ_API_KEY production
vercel --prod --yes
```

- `server/vercel.json` uses classic `builds` + a catch-all route so **every** path (`/api/health`, `/api/auth/...`) hits the single lambda `api/index.ts`. This deliberately bypasses Vercel's auto-detected "express" framework preset, which builds a *second* lambda at the root and splits routing (root works, `/api/*` 404s).
- `api/index.ts` connects to Mongo on cold start and reuses mongoose's cached connection on warm instances.

## 3. Frontend deploy (`/client`)

```bash
cd client
vercel link --yes --project careerai
vercel env add VITE_API_URL production   # value: https://careerai-api.vercel.app/api
vercel --prod --yes
```

- `client/vercel.json` rewrites every path to `index.html` (SPA deep links work).
- The axios client reads `VITE_API_URL` and falls back to `http://localhost:5000/api` for local dev.

## 4. MongoDB Atlas (free tier) — one-time

1. Register at https://www.mongodb.com/cloud/atlas/register.
2. **Build a Database** → **M0 Free** tier → name `CareerAI` → Create.
3. **Database Access** → create user `careerai` with a password.
4. **Network Access** → **Allow Access from Anywhere** (`0.0.0.0/0`).
5. **Connect → Drivers → Node.js** → copy the string and replace `<db_password>`:
   `mongodb+srv://careerai:<db_password>@careerai.<...>.mongodb.net/?retryWrites=true&w=majority&appName=CareerAI`
6. Add it as `MONGODB_URI` (step 2) and redeploy: `vercel --prod --yes`.

## 5. Post-deploy verification

```powershell
Invoke-RestMethod https://careerai-api.vercel.app/api/health      # status: success
Invoke-RestMethod https://careerai-alpha.vercel.app/login         # HTTP 200
# Browser: register → seed sample jobs → track a job → upload resume → download PDFs
```

## 6. Troubleshooting (issues we actually hit)

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Error: Two or more files have conflicting paths ... api/index.js conflicts with api/index.ts` | A compiled `api/index.js` (from a failed local tsc) sat next to `api/index.ts` | Delete `api/index.js` / `index.js.map`, redeploy |
| `/api/*` returns 404, root returns 500 | Vercel's auto-detected "express" preset built a second lambda at path `index` | Use `builds` + `routes` in `vercel.json` instead of the preset |
| `ReferenceError: DOMMatrix is not defined` on boot | pdf-parse **v2** bundles browser-only pdfjs which crashes in Vercel's node runtime | Use `pdf-parse@1.1.1` (pure Node CJS); see `src/services/parser.service.ts` |
| Registration works locally but 500s in prod | `MONGODB_URI` not set — `connectDB` throws by design on Vercel without it (`src/config/db.ts`) | Set the env var and redeploy |

## 7. CI

`.github/workflows/ci.yml` runs server tests + client lint/build on every push to `main` — deployment itself is manual via the CLI (or you can wire GitHub Auto-Deploy in the Vercel dashboard later).
