@echo off
cd /d "%~dp0"
echo Stopping local Postgres...
docker compose -f docker-compose.local.yml down
echo.
echo Done. The backend/frontend/partykit windows are separate consoles -
echo close them manually (or Ctrl+C in each) if they're still open.
pause
