from fastapi import APIRouter
from datetime import datetime
from backend.app.config import settings

router = APIRouter(tags=["Health"])

@router.get("/health")
async def get_health():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "features": {
            "fastapi": True,
            "langgraph": True,
            "mcp": True,
            "cors_configured": True
        }
    }
