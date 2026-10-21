import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .api.projects import router as projects_router
from .api.websocket import router as websocket_router
from .database import init_db
from .config import settings

app = FastAPI(title='ReForge API', version='2.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects_router)
app.include_router(websocket_router)

# Mount frontend build if available for seamless full-stack single-server serving
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
assets_dist = os.path.join(frontend_dist, "assets")

if os.path.exists(assets_dist):
    app.mount("/assets", StaticFiles(directory=assets_dist), name="assets")

@app.on_event("startup")
async def startup_event():
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.PROJECTS_DIR, exist_ok=True)
    await init_db()

@app.get("/health")
@app.get("/api/health")
async def health():
    return {"status": "healthy", "platform": "ReForge Codebase Intelligence & Software Migration"}

# SPA catch-all for frontend routes
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    if full_path.startswith("api") or full_path.startswith("ws"):
        return {"error": "Not Found"}
    target_file = os.path.join(frontend_dist, full_path)
    if full_path and os.path.isfile(target_file):
        return FileResponse(target_file)
    index_file = os.path.join(frontend_dist, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {
        "name": "ReForge API",
        "version": "2.0.0",
        "status": "running",
        "message": "Frontend not built yet. Run 'cd frontend && npm install && npm run build' or run Vite dev server via 'npm run dev'."
    }
