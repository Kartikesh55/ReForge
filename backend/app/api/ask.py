from typing import Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.app.api.projects import get_project_record
from backend.app.services.ask import ask_project

router = APIRouter(prefix="/projects", tags=["Ask ReForge"])


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    mode: Literal["expert", "developer", "beginner", "layman"] = "developer"


@router.post("/{project_id}/ask")
async def ask(project_id: str, request: AskRequest):
    project = get_project_record(project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    try:
        return ask_project(project, request.question, request.mode)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
