@echo off
rem Mobil 1 5W-20 daily prices. Double-click to run now; Task Scheduler runs it every morning.
cd /d "%~dp0"
python oil_prices.py %*
start "" report.html
