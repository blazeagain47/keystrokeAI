import os
import sys

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

_IS_PROD = os.getenv("APP_ENV", os.getenv("NODE_ENV", "development")) == "production"
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    if _IS_PROD:
        # Fail loudly and immediately rather than silently falling back to a
        # local SQLite file. A per-process local file is exactly what caused
        # accounts to become invisible depending on which backend
        # instance/restart handled a given request — never repeat that here.
        print(
            "[bk] FATAL: DATABASE_URL is not set in production. "
            "Refusing to start with an ephemeral local database.",
            file=sys.stderr,
        )
        raise RuntimeError("DATABASE_URL must be set in production (Postgres connection string)")

    # Local/dev-only convenience fallback. Loud on purpose so nobody mistakes
    # this for a durable store.
    print(
        "[bk] WARNING: DATABASE_URL not set — falling back to local SQLite "
        "(./keystroke.dev.db) for LOCAL DEVELOPMENT ONLY. This file is NOT "
        "shared or durable. Run `docker compose up postgres` and set "
        "DATABASE_URL to test against real Postgres.",
        file=sys.stderr,
    )
    DATABASE_URL = "sqlite:///./keystroke.dev.db"

_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=_connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
