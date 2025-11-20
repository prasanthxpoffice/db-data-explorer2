@echo off
setlocal enabledelayedexpansion

set "SERVER_DIR=%~dp0server-dotnet"
set "SERVER_URL=http://localhost:5050"
for %%I in ("%~dp0.") do set "FRONTEND_DIR=%%~fI"
set "STATIC_SERVER_DIR=%~dp0static-server"
set "FRONTEND_PORT=5080"
set "FRONTEND_URL=http://localhost:%FRONTEND_PORT%/"
set "FRONTEND_ROOT=%FRONTEND_DIR%"

echo Starting .NET server from "%SERVER_DIR%" on %SERVER_URL% ...
start "API Server" cmd /k "cd /d ""%SERVER_DIR%"" && dotnet run --urls=%SERVER_URL%"

set "TRIES=15"
echo Waiting for health endpoint...
:retry
timeout /t 1 >nul
powershell -NoLogo -NoProfile -Command "try { $r = Invoke-RestMethod -Uri '%SERVER_URL%/health' -TimeoutSec 2; $r | ConvertTo-Json -Compress; exit 0 } catch { exit 1 }"
if %ERRORLEVEL%==0 goto success
set /a TRIES-=1
if !TRIES! gtr 0 goto retry

echo Health endpoint did not respond in time.
goto done

:success
echo Health response:
powershell -NoLogo -NoProfile -Command "Invoke-RestMethod -Uri '%SERVER_URL%/health' -TimeoutSec 2 | ConvertTo-Json -Compress"

echo Starting static file server from "%FRONTEND_DIR%" on %FRONTEND_URL% ...
start "Static Server" cmd /k "cd /d ""%STATIC_SERVER_DIR%"" && dotnet run --urls=%FRONTEND_URL%"

set "FRONTEND_TRIES=15"
echo Waiting for frontend server...
:frontend_retry
timeout /t 1 >nul
powershell -NoLogo -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -Uri '%FRONTEND_URL%' -TimeoutSec 2 > $null; exit 0 } catch { exit 1 }"
if %ERRORLEVEL%==0 goto open_frontend
set /a FRONTEND_TRIES-=1
if !FRONTEND_TRIES! gtr 0 goto frontend_retry

echo Frontend server did not respond in time.
goto done

:open_frontend
echo Opening frontend: %FRONTEND_URL%
start "" "%FRONTEND_URL%"

:done
echo.
echo Press Ctrl+C in the server window to stop it when finished.
pause
