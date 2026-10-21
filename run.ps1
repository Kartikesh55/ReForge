# ReForge Self-Bootstrapping Launch Script (Windows PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "   ReForge: Codebase Intelligence & Migration Platform" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RootDir

# 1. Detect existing virtualenv in root or backend
$VenvPython = $null
if (Test-Path "$RootDir\.venv\Scripts\python.exe") {
    $VenvPython = "$RootDir\.venv\Scripts\python.exe"
} elseif (Test-Path "$RootDir\backend\.venv\Scripts\python.exe") {
    $VenvPython = "$RootDir\backend\.venv\Scripts\python.exe"
}

# 2. If missing, create .venv in root
if (-not $VenvPython) {
    Write-Host "[1/3] Setting up Python virtual environment..." -ForegroundColor Yellow
    
    $SysPython = $null
    if (Get-Command python -ErrorAction SilentlyContinue) {
        $SysPython = "python"
    } elseif (Get-Command py -ErrorAction SilentlyContinue) {
        $SysPython = "py -3"
    } elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
        $SysPython = "python3"
    } else {
        Write-Host "ERROR: Python 3.10+ is required but not found in PATH." -ForegroundColor Red
        Write-Host "Please install Python from https://www.python.org/downloads/ and ensure 'Add Python to PATH' is checked." -ForegroundColor Red
        Read-Host "Press Enter to exit..."
        exit 1
    }

    Write-Host "Using system Python: $SysPython" -ForegroundColor Gray
    Invoke-Expression "$SysPython -m venv .venv"
    
    $VenvPython = "$RootDir\.venv\Scripts\python.exe"
    if (-not (Test-Path $VenvPython)) {
        Write-Host "ERROR: Failed to create virtual environment in $RootDir\.venv." -ForegroundColor Red
        Read-Host "Press Enter to exit..."
        exit 1
    }
    
    Write-Host "Installing backend dependencies from requirements.txt..." -ForegroundColor Yellow
    & $VenvPython -m pip install --quiet --upgrade pip
    & $VenvPython -m pip install --quiet -r requirements.txt
    Write-Host "Backend dependencies installed successfully." -ForegroundColor Green
} else {
    Write-Host "[1/3] Python virtual environment detected: $VenvPython" -ForegroundColor Green
}

# 3. Check frontend build
$DistHtml = "$RootDir\frontend\dist\index.html"
if (-not (Test-Path $DistHtml)) {
    Write-Host "[2/3] Frontend build not found, checking Node.js to build it..." -ForegroundColor Yellow
    if (Get-Command npm -ErrorAction SilentlyContinue) {
        Write-Host "Building frontend assets with npm..." -ForegroundColor Gray
        Push-Location "$RootDir\frontend"
        npm install --silent
        npm run build
        Pop-Location
    } else {
        Write-Host "WARNING: Frontend dist not found and npm is not installed." -ForegroundColor Yellow
    }
} else {
    Write-Host "[2/3] Pre-compiled frontend UI ready." -ForegroundColor Green
}

# 4. Launch server
Write-Host "[3/3] Starting ReForge full-stack server on http://localhost:8000..." -ForegroundColor Cyan
Write-Host ""
Write-Host ">> Server URL:  http://127.0.0.1:8000" -ForegroundColor Green
Write-Host ">> Press Ctrl+C in this terminal to stop the server." -ForegroundColor Gray
Write-Host ""

& $VenvPython main.py
