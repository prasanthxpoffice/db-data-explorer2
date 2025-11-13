@echo off
setlocal enabledelayedexpansion

set "SERVER_DIR=%~dp0server-dotnet"
set "SERVER_URL=http://localhost:5050"
set "INDEX_FILE=%~dp0index.html"
set "FRONTEND_URL=%SERVER_URL%/"

echo Starting .NET server from "%SERVER_DIR%" on %SERVER_URL% ...
start "" /D "%SERVER_DIR%" dotnet run --urls=%SERVER_URL%

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
if exist "%INDEX_FILE%" (
  echo Opening frontend: %FRONTEND_URL%
  start "" "%FRONTEND_URL%"
) else (
  echo Frontend file not found at "%INDEX_FILE%".
)

:done
echo.
echo Press Ctrl+C in the server window to stop it when finished.
pause
