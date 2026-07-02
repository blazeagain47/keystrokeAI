This is a Next.js app with a separate FastAPI backend that owns
authentication (username/password accounts, stored in Postgres).

## Architecture

- **Frontend**: Next.js app (this repo, `src/`), deployed on Vercel.
- **Backend**: FastAPI (`backend/`), handles `/auth/*` (register/login/logout/me)
  and is backed by **Postgres** (see `backend/database.py`). Self-hosted via
  `docker-compose.yml` (FastAPI + Postgres + Caddy for automatic HTTPS).
- **Game data**: Firestore (via `firebase-admin`), keyed by the app session's
  username, not by a separate identity system.

The backend intentionally does not use SQLite/local-file storage — an
earlier version did, which caused accounts created in one browser to be
invisible to logins from another (ephemeral, per-instance local disk). See
`backend/database.py` for the enforced Postgres requirement in production.

## Local development

### 1. Frontend

```bash
npm install
cp .env.example .env.local   # fill in Firebase + backend URL
npm run dev
```

Open http://localhost:3000.

### 2. Backend + Postgres

Easiest path — run Postgres via Docker and the API directly with `uvicorn`:

```bash
docker compose up postgres -d
python -m venv .venv && .venv\Scripts\Activate.ps1   # Windows
pip install -r requirements.txt
$env:DATABASE_URL = "postgresql://blazekey:change_me_to_a_long_random_value@localhost:5432/blazekey"
alembic upgrade head
python -m uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
```

(Match `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` to whatever you put
in your root `.env` used by `docker compose`.)

If you skip setting `DATABASE_URL`, the backend falls back to a local
`keystroke.dev.db` SQLite file for quick local hacking — this is explicitly
dev-only and prints a warning; never rely on it as a real data store, and
never set `APP_ENV=production` without a real `DATABASE_URL` (the backend
will refuse to start).

## Production deployment

### Backend (VPS, self-hosted)

1. Provision a small VPS (1-2GB RAM is enough — no GPU/ML runtime needed).
2. Point a subdomain (e.g. `api.yourdomain.com`) at the VPS's IP.
3. Install Docker + Docker Compose on the VPS.
4. Copy this repo to the VPS, copy `.env.example` to `.env`, and fill in:
   - `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`
   - `KS_JWT_SECRET` — generate with `python -c "import secrets; print(secrets.token_urlsafe(48))"`
   - `CORS_ORIGINS` — your deployed frontend origin(s)
   - `PUBLIC_API_DOMAIN` — the subdomain from step 2
5. `docker compose up -d --build`

Caddy automatically provisions/renews TLS for `PUBLIC_API_DOMAIN`. Postgres
data lives in a named Docker volume (`postgres_data`), separate from the
containers — a container restart or rebuild does not wipe it. See the
[Auth overhaul plan](.cursor/plans) for the full backup/monitoring checklist.

Schema changes ship as Alembic migrations (`backend/alembic/versions/`) and
run automatically on container start (`alembic upgrade head` in
`backend/Dockerfile`'s `CMD`).

### Frontend (Vercel)

Set `NEXT_PUBLIC_API_URL=https://api.yourdomain.com` (matching
`PUBLIC_API_DOMAIN` above) plus the Firebase env vars in the Vercel project
settings, then deploy as usual.

## Firebase Admin configuration

Create a `.env.local` with the following variables (do not commit secrets):

```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-XXXXX@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nABC...XYZ\n-----END PRIVATE KEY-----\n"

# Optional
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

On Windows, ensure newlines in `FIREBASE_PRIVATE_KEY` are encoded as `\n`.

You can also copy `.env.example` into `.env.local` and fill in the values.
