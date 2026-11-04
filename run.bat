@echo off
cd /d "%~dp0"
title Zero Waste AI

if not exist "app.py" (
  echo [ERROR] app.py not found next to run.bat.
  echo Unzip the archive first: right click the ZIP - Extract All, then run run.bat from the extracted folder.
  pause
  exit /b 1
)

set PY=
where py >nul 2>nul && set PY=py
if "%PY%"=="" where python >nul 2>nul && set PY=python
if "%PY%"=="" (
  echo [ERROR] Python is not installed.
  echo Download Python 3.11 or newer from https://www.python.org/downloads/
  echo During setup tick "Add python.exe to PATH", then run run.bat again.
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo Creating virtual environment...
  %PY% -m venv .venv
)
if not exist ".venv\Scripts\python.exe" (
  echo [ERROR] Could not create .venv. Move the folder to a path without special characters, e.g. C:\zero_waste_ai
  pause
  exit /b 1
)

echo Installing packages, first time takes 1-2 minutes and needs internet...
".venv\Scripts\python.exe" -m pip install -q -r requirements.txt
if errorlevel 1 (
  echo [ERROR] Package install failed. Check the internet connection and run again.
  pause
  exit /b 1
)

echo.
echo   Site: http://127.0.0.1:5000
echo   Keep this window open while you use the site.
echo.
start "" cmd /c "timeout /t 3 >nul & start http://127.0.0.1:5000"
".venv\Scripts\python.exe" app.py
echo.
echo Server stopped. If you see an error above, take a screenshot of this window.
pause
