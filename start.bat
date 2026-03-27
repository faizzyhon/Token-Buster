@echo off
setlocal EnableDelayedExpansion

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
cd /d "%ROOT%"

echo.
echo  ========================================================
echo   TOKEN BUSTER -- Setup and Launch
echo   by Muhammad Faizan ^| github.com/faizzyhon
echo  ========================================================
echo   Folder: %ROOT%
echo.

echo [STEP 1] Checking Python...
set "PYTHON_CMD="
for %%P in (python python3 py) do (
    if not defined PYTHON_CMD (
        %%P --version >nul 2>&1 && set "PYTHON_CMD=%%P"
    )
)
if not defined PYTHON_CMD (
    echo ERROR: Python not found. Install from https://www.python.org/downloads/
    pause & exit /b 1
)
echo        Found Python OK.
echo.

echo [STEP 2] Checking files...
if not exist "%ROOT%\requirements.txt" (
    echo ERROR: requirements.txt not found at %ROOT%
    pause & exit /b 1
)
echo        requirements.txt ... OK
echo.

echo [STEP 3] Creating virtual environment...
if exist "%ROOT%\venv\Scripts\activate.bat" (
    echo        venv already exists.
) else (
    "%PYTHON_CMD%" -m venv "%ROOT%\venv"
    if errorlevel 1 ( echo ERROR: venv failed. & pause & exit /b 1 )
    echo        venv created.
)
echo.

echo [STEP 4] Activating venv...
call "%ROOT%\venv\Scripts\activate.bat"
echo.

echo [STEP 5] Upgrading pip...
python -m pip install --upgrade pip --quiet
echo.

echo [STEP 6] Installing packages...
python -m pip install -r "%ROOT%\requirements.txt"
if errorlevel 1 ( echo ERROR: Install failed. & pause & exit /b 1 )
echo        Packages installed OK.
echo.

echo [STEP 7] Building frontend...
where npm >nul 2>&1
if errorlevel 1 ( echo        npm not found, skipping frontend. & goto launch )
if not exist "%ROOT%\token_buster\frontend\package.json" ( goto launch )
cd /d "%ROOT%\token_buster\frontend"
if not exist node_modules ( call npm install )
call npm run build
cd /d "%ROOT%"
echo.

:launch
echo [STEP 8] Launching Token Buster...
echo.
echo   Dashboard: http://localhost:5000
echo   Press Ctrl+C to stop.
echo.
python "%ROOT%\main.py"
pause