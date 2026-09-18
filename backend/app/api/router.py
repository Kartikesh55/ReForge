from fastapi import APIRouter
from backend.app.api.health import router as health_router
from backend.app.api.projects import router as projects_router
from backend.app.api.analysis import router as analysis_router

api_router = APIRouter(prefix="/api")

# Mount endpoints
api_router.include_router(health_router)
api_router.include_router(projects_router)
api_router.include_router(analysis_router)
