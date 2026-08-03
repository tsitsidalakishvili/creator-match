# CreatorMatch

A standalone **creator ↔ campaign matching app**. Brands write a campaign brief with a target
audience (niches, channels, geography, age range, languages, budget); creators have audience
profiles; a transparent scoring engine ranks every creator against every campaign **0–100** with a
per-dimension breakdown and plain-English reasons. Shortlist, invite, and track creators per
campaign.

Derived from the Campaigns & Audience modules of a larger civic-CRM project: the campaign *brief*
drives everything, audience fit is computed before outreach, and every recommendation is
explainable.

## Stack

| Layer    | Tech                                             | Deploy |
| -------- | ------------------------------------------------ | ------ |
| Backend  | FastAPI + SQLModel (SQLite locally, Postgres OK) | Render |
| Frontend | React 19 + Vite + Mantine 8                      | Vercel |

## Matching engine

Each creator is scored against the campaign brief across 7 weighted dimensions (total 100):

| Dimension    | Weight | Signal                                                    |
| ------------ | ------ | --------------------------------------------------------- |
| Niche fit    | 30     | Overlap of campaign niches with the creator's niches      |
| Channel fit  | 15     | Campaign channels covered by the creator's platforms      |
| Geography    | 15     | Target geos covered by the creator's audience geos        |
| Age range    | 10     | Share of the target age range the audience covers         |
| Language     | 10     | Campaign languages the creator publishes in               |
| Budget       | 10     | Creator rate vs. per-creator budget (with negotiable band)|
| Engagement   | 10     | Engagement rate normalized (6%+ = max)                    |

Creators below the campaign's `min_followers` are filtered out. Every score ships with reasons
("Covers campaign niches: food, travel", "Rate exceeds the per-creator budget", …).

## Run locally

Backend (Python 3.11+):

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows  (source .venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API at http://localhost:8000 (interactive docs at `/docs`). A SQLite DB is created and seeded with
10 demo creators and 3 demo campaigns on first start.

Frontend:

```bash
cd frontend
npm install
npm run dev
```

App at http://localhost:5173 (points at `http://localhost:8000` by default; override with
`VITE_API_URL` in `frontend/.env.local`).

## Deploy

### Backend → Render

The repo contains [render.yaml](render.yaml). In the Render dashboard: **New → Blueprint**, pick
this repo, apply. Or create a **Web Service** manually:

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Env var `FRONTEND_ORIGIN` = your Vercel URL (e.g. `https://creatormatch.vercel.app`)
- Optional: attach a Render Postgres and set `DATABASE_URL` (without it, SQLite is used — fine for
  a demo, but data resets on redeploys because Render's free disk is ephemeral)

### Frontend → Vercel

Import the repo in Vercel:

- Root directory: `frontend`
- Framework preset: Vite (build `npm run build`, output `dist`)
- Env var `VITE_API_URL` = your Render URL (e.g. `https://creatormatch-api.onrender.com`)

## API overview

```
GET    /api/health
GET    /api/stats
GET    /api/creators?search=&niche=&platform=
POST   /api/creators
GET    /api/creators/{id}
PATCH  /api/creators/{id}
DELETE /api/creators/{id}
GET    /api/campaigns?status=
POST   /api/campaigns
GET    /api/campaigns/{id}
PATCH  /api/campaigns/{id}
DELETE /api/campaigns/{id}
GET    /api/campaigns/{id}/matches            # ranked, scored, explained
PUT    /api/campaigns/{id}/matches/{creatorId}/status
GET    /api/campaigns/{id}/shortlist
```
