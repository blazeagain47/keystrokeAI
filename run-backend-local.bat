@echo off
REM Started by start-local.bat in its own window (or double-click directly
REM once local Postgres is already running via `docker compose -f
REM docker-compose.local.yml up -d`).
setlocal
cd /d "%~dp0"

set VENV_DIR=
if exist ".venv\Scripts\activate.bat" set VENV_DIR=.venv
if exist "venv\Scripts\activate.bat" set VENV_DIR=venv

if "%VENV_DIR%"=="" (
    echo No Python venv found. Run start-local.bat first to create one.
    pause
    exit /b 1
)

call "%VENV_DIR%\Scripts\activate.bat"

set "DATABASE_URL=postgresql://blazekey:localdevpassword@localhost:5432/blazekey"

echo Running migrations...
alembic upgrade head
if errorlevel 1 (
    echo [FAIL] Migrations failed - is local Postgres running? See errors above.
    pause
    exit /b 1
)

echo Starting FastAPI backend on http://localhost:8000 ...
python -m uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
