@echo off
rem Opens the site to other devices in the same Wi-Fi/LAN network on port 8000.
cd /d "%~dp0"
if not exist .venv\Scripts\python.exe (
  py -m venv .venv
)
call .venv\Scripts\activate.bat
python -m pip install -r requirements.txt
echo.
echo  Other devices: http://YOUR-PC-IP:8000  (find the IP with: ipconfig)
echo.
waitress-serve --host=0.0.0.0 --port=8000 app:app
pause
