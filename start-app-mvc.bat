@echo off
setlocal enabledelayedexpansion

set "SERVER_DIR=%~dp0server-mvc-dotnet"
set "SERVER_PORT=5082"
set "SERVER_URL=http://localhost:%SERVER_PORT%"
set "IIS=%ProgramFiles%\IIS Express\iisexpress.exe"
if not exist "%IIS%" (
  set "IIS=%ProgramFiles(x86)%\IIS Express\iisexpress.exe"
)
for %%I in ("%~dp0.") do set "FRONTEND_DIR=%%~fI"
set "STATIC_SERVER_DIR=%~dp0static-server"
set "FRONTEND_PORT=5080"
set "FRONTEND_ORIGIN=http://localhost:%FRONTEND_PORT%"
set "FRONTEND_URL=%FRONTEND_ORIGIN%/start.html?apiBase=%SERVER_URL%"
set "FRONTEND_ROOT=%FRONTEND_DIR%"

if not exist "%IIS%" (
  echo IIS Express not found at "%IIS%"
  exit /b 1
)

echo Starting MVC server from "%SERVER_DIR%" on %SERVER_URL% ...
start "MVC API Server" "%IIS%" /path:"%SERVER_DIR%" /port:%SERVER_PORT%

set "TRIES=20"
echo Waiting for MVC health endpoint...
:retry
timeout /t 1 >nul
powershell -NoLogo -NoProfile -Command "try { $r = Invoke-RestMethod -Uri '%SERVER_URL%/graphapi/health' -TimeoutSec 2; $r | ConvertTo-Json -Compress; exit 0 } catch { exit 1 }"
if %ERRORLEVEL%==0 goto success
set /a TRIES-=1
if !TRIES! gtr 0 goto retry

echo MVC health endpoint did not respond in time.
goto done

:success
echo MVC health response:
powershell -NoLogo -NoProfile -Command "Invoke-RestMethod -Uri '%SERVER_URL%/graphapi/health' -TimeoutSec 2 | ConvertTo-Json -Compress"

echo Starting static file server from "%FRONTEND_DIR%" on %FRONTEND_ORIGIN% ...
start "Static Server" cmd /k "cd /d ""%STATIC_SERVER_DIR%"" && set FRONTEND_ROOT=%FRONTEND_ROOT% && dotnet run --urls=%FRONTEND_ORIGIN% -- defaultDocument=start.html"

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
echo Press Ctrl+C in the server windows to stop them when finished.
pause
