@echo off
rem Starts the Mathinik Quest server from any folder, without PowerShell script restrictions.
cd /d "%~dp0backend"
if not exist node_modules (
  echo Installing packages...
  call npm.cmd install
)
call npm.cmd run dev
echo.
echo The server stopped. Read the message above, then press any key to close.
pause >nul
