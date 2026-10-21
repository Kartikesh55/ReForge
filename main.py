import os
import sys
import webbrowser

# Add backend directory to sys.path so app modules can be imported directly
root_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(root_dir, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

def check_dependencies():
    missing = []
    for pkg in ["fastapi", "uvicorn", "pydantic", "sqlalchemy", "aiosqlite"]:
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)
    return missing

if __name__ == "__main__":
    missing = check_dependencies()
    if missing:
        print("=" * 60)
        print("  ReForge: Missing Dependencies Detected")
        print("=" * 60)
        print(f"Missing packages: {', '.join(missing)}")
        print("\nPlease install the required packages using:")
        print("    pip install -r requirements.txt\n")
        print("Or run the automated launcher:")
        print("    Windows: double-click run.bat")
        print("    PowerShell: .\\run.ps1")
        print("    Mac/Linux: ./run.sh")
        print("=" * 60)
        sys.exit(1)

    import uvicorn
    from app.main import app

    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", 8000))

    print("=" * 60)
    print("   ReForge: Codebase Intelligence & Software Migration")
    print("=" * 60)
    print(f"Starting server on http://{host}:{port}...")
    print(f">> Open in browser: http://localhost:{port}")
    print(">> Press Ctrl+C to stop the server.\n")

    try:
        webbrowser.open(f"http://localhost:{port}")
    except Exception:
        pass

    uvicorn.run("app.main:app", host=host, port=port, reload=False)
else:
    from app.main import app
