from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.app.api.projects import get_project_record
from backend.app.services.flow import trace_project

router = APIRouter(prefix="/projects", tags=["Static Flow Trace"])


class TraceRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    max_depth: int = Field(default=10, ge=1, le=50)


@router.post("/{project_id}/trace")
async def trace(project_id: str, request: TraceRequest) -> dict[str, Any]:
    project = get_project_record(project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    try:
        return trace_project(project, request.query, request.max_depth)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
