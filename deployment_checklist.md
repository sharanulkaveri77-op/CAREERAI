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

## 7. CI/CD Pipelines (GitHub Actions)

| Workflow | File | Trigger | Purpose |
| --- | --- | --- | --- |
| CI | `.github/workflows/ci.yml` | push/PR to `main` | Server build + tests, client lint + build. |
| CD · Production Deploy | `.github/workflows/cd.yml` | push to `main` | `vercel build --prebuilt --prod` for **both** projects. |
| Preview Deploy | `.github/workflows/preview.yml` | PR open/sync | Deploys preview builds, comments URLs on the PR. |
| Dependabot | `.github/dependabot.yml` | weekly | Automated dependency PRs (npm + actions). |

To activate auto-deploys, add one GitHub Actions secret — `VERCEL_TOKEN` — created at
https://vercel.com/account/settings/tokens (also see README → CI/CD Pipelines):

```powershell
gh secret set VERCEL_TOKEN
```

The workflows already carry `VERCEL_ORG_ID` (`team_SCHJ4axXjcFefinXX1Gwybbc`) and both
`VERCEL_PROJECT_ID`s (`prj_kGAkPkSxp59waXTMuSow2iCzkuDL` = API, `prj_xgoVLet3RGcis5lcxsUJCmyMMRKT` = web)
from the linked projects — no other setup required. `VERCEL_TOKEN` is set (repo secret, added 2026-08-13;
currently using the local CLI session token — replace it anytime with a dedicated token from
https://vercel.com/account/settings/tokens).

> Manual deploys remain available: `vercel --prod --yes` from `server/` or `client/`.
