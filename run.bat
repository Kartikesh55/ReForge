@echo off
setlocal enabledelayedexpansion

title ReForge - Codebase Intelligence ^& Software Migration

echo ======================================================
echo    ReForge: Codebase Intelligence ^& Migration Platform
echo ======================================================
echo.

cd /d "%~dp0"

:: 1. Detect existing virtualenv in root or backend
set "VENV_PYTHON="
if exist ".venv\Scripts\python.exe" set "VENV_PYTHON=.venv\Scripts\python.exe"
if not defined VENV_PYTHON (
    if exist "backend\.venv\Scripts\python.exe" set "VENV_PYTHON=backend\.venv\Scripts\python.exe"
)

:: 2. If no virtualenv found, find system Python and create one
if not defined VENV_PYTHON (
    echo [1/3] Setting up Python virtual environment...
    
    set "SYS_PYTHON="
    python --version >nul 2>&1 && set "SYS_PYTHON=python"
    if not defined SYS_PYTHON (
        py -3 --version >nul 2>&1 && set "SYS_PYTHON=py -3"
    )
    if not defined SYS_PYTHON (
        python3 --version >nul 2>&1 && set "SYS_PYTHON=python3"
    )

    if not defined SYS_PYTHON (
        echo.
        echo [ERROR] Python 3.10+ was not found on your system!
        echo Please install Python from https://www.python.org/downloads/
        echo IMPORTANT: When installing, check the box: "Add Python to PATH"
        echo.
        pause
        exit /b 1
    )

    echo Using system Python: !SYS_PYTHON!
    !SYS_PYTHON! -m venv .venv
    if not exist ".venv\Scripts\python.exe" (
        echo [ERROR] Failed to create virtual environment in .venv
        pause
        exit /b 1
    )
    set "VENV_PYTHON=.venv\Scripts\python.exe"

    echo Installing dependencies from requirements.txt...
    !VENV_PYTHON! -m pip install --upgrade pip --quiet
    !VENV_PYTHON! -m pip install -r requirements.txt --quiet
    echo Dependencies installed successfully.
) else (
    echo [1/3] Python environment ready: !VENV_PYTHON!
)

:: 3. Check pre-compiled frontend assets
if exist "frontend\dist\index.html" (
    echo [2/3] Pre-compiled frontend UI ready.
) else (
    echo [2/3] Pre-compiled frontend not found, checking Node.js...
    npm --version >nul 2>&1 && (
        cd frontend
        call npm install --silent
        call npm run build
        cd ..
    ) || (
        echo WARNING: Frontend build not found and npm is not installed.
    )
)

:: 4. Launch ReForge server
echo [3/3] Starting ReForge full-stack server on http://localhost:8000...
echo.
echo ^>^> Web UI: http://127.0.0.1:8000
echo ^>^> Press Ctrl+C in this window to stop the server.
echo.

!VENV_PYTHON! main.py
pause
