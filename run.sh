#!/usr/bin/env bash
set -e

echo "======================================================"
echo "   ReForge: Codebase Intelligence & Migration Platform"
echo "======================================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VENV_PYTHON=""
if [ -f "$SCRIPT_DIR/.venv/bin/python" ]; then
    VENV_PYTHON="$SCRIPT_DIR/.venv/bin/python"
elif [ -f "$SCRIPT_DIR/backend/.venv/bin/python" ]; then
    VENV_PYTHON="$SCRIPT_DIR/backend/.venv/bin/python"
fi

if [ -z "$VENV_PYTHON" ]; then
    echo "[1/3] Setting up Python virtual environment..."
    if command -v python3 &>/dev/null; then
        python3 -m venv .venv
    elif command -v python &>/dev/null; then
        python -m venv .venv
    else
        echo "ERROR: Python 3.10+ is required but not found."
        exit 1
    fi
    VENV_PYTHON="$SCRIPT_DIR/.venv/bin/python"
    "$VENV_PYTHON" -m pip install --quiet --upgrade pip
    "$VENV_PYTHON" -m pip install --quiet -r requirements.txt
else
    echo "[1/3] Python virtual environment detected."
fi

if [ ! -f "$SCRIPT_DIR/frontend/dist/index.html" ]; then
    echo "[2/3] Building frontend assets..."
    if command -v npm &>/dev/null; then
        cd "$SCRIPT_DIR/frontend"
        npm install --silent
        npm run build
        cd "$SCRIPT_DIR"
    fi
else
    echo "[2/3] Pre-compiled frontend UI ready."
fi

echo "[3/3] Starting ReForge server on http://localhost:8000..."
echo ""
echo ">> Web UI: http://127.0.0.1:8000"
echo ">> Press Ctrl+C to stop the server."
echo ""

"$VENV_PYTHON" main.py
