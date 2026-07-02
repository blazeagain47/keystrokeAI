# Build context is the repo root (see docker-compose.yml: `context: .`)
# because the app needs both `backend/` and the root-level `alembic.ini`.
FROM python:3.12-slim

WORKDIR /app

# System deps needed to build psycopg2 if a wheel isn't available for the
# target platform; kept minimal since the backend has no ML dependencies.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY alembic.ini ./
COPY backend ./backend

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

# Run pending migrations, then start the API. `alembic upgrade head` is
# idempotent/safe to run on every boot (no-op if already up to date), so
# this doubles as the deploy step — no separate manual migration command
# to remember/forget.
CMD ["sh", "-c", "alembic upgrade head && gunicorn backend.app:app -k uvicorn.workers.UvicornWorker -w 2 -b 0.0.0.0:8000 --access-logfile - --error-logfile -"]
