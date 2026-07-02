@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================
echo  blazeKey local dev stack
echo ============================================
echo.

REM --- 1. Make sure Docker is running (needed for local Postgres) ---
docker info >nul 2>&1
if errorlevel 1 (
    echo Docker engine not responding. Trying to launch Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo Waiting for Docker to come up ^(this can take ~30-60s^)...
    :waitdocker
    timeout /t 3 >nul
    docker info >nul 2>&1
    if errorlevel 1 goto waitdocker
)
echo [ok] Docker is ready.
echo.

REM --- 2. Start local Postgres (separate from the production compose file) ---
echo Starting local Postgres...
docker compose -f docker-compose.local.yml up -d
if errorlevel 1 (
    echo [FAIL] Could not start Postgres. See errors above.
    pause
    exit /b 1
)

echo Waiting for Postgres to be healthy...
:waitpg
docker compose -f docker-compose.local.yml exec -T postgres pg_isready -U blazekey -d blazekey >nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto waitpg
)
echo [ok] Postgres is healthy on localhost:5432.
echo.

REM --- 3. Find or create the Python venv ---
set VENV_DIR=
if exist ".venv\Scripts\activate.bat" set VENV_DIR=.venv
if exist "venv\Scripts\activate.bat" set VENV_DIR=venv

if "%VENV_DIR%"=="" (
    echo No Python venv found - creating .venv and installing requirements...
    python -m venv .venv
    set VENV_DIR=.venv
    call "%VENV_DIR%\Scripts\activate.bat"
    pip install -r requirements.txt
    call "%VENV_DIR%\Scripts\deactivate.bat"
)
echo [ok] Using venv: %VENV_DIR%
echo.

REM --- 4. Run pending migrations, then start the backend in its own window ---
REM (delegated to run-backend-local.bat to avoid cmd's "set VAR=val && ..."
REM trailing-space gotcha when building one big inline command string)
start "blazeKey backend (FastAPI)" cmd /k run-backend-local.bat

REM --- 5. Start the Next.js frontend in its own window ---
start "blazeKey frontend (Next.js)" cmd /k "npm run dev"

REM --- 6. Start PartyKit (realtime) in its own window ---
start "blazeKey partykit" cmd /k "npx partykit dev"

echo.
echo ============================================
echo  All services launching in separate windows:
echo    Frontend:  http://localhost:3000
echo    Backend:   http://localhost:8000
echo    Postgres:  localhost:5432  (db=blazekey user=blazekey)
echo.
echo  Close those windows (or run stop-local.bat) when done.
echo ============================================
pause
