from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.app.api.projects import get_project_record
from backend.app.services.migration import build_migration_plan

router = APIRouter(prefix="/projects", tags=["Migration"])


class MigrationTarget(BaseModel):
    language: str = "java"
    runtime: str = "jvm"
    framework: str = "spring_boot"
    database: str = "postgresql"
    test_framework: str = "junit"


class MigrationPlanRequest(BaseModel):
    target: MigrationTarget = Field(default_factory=MigrationTarget)


@router.post("/{project_id}/migration/plan")
async def migration_plan(project_id: str, request: MigrationPlanRequest) -> dict[str, Any]:
    project = get_project_record(project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Project with ID '{project_id}' not found.")
    try:
        return build_migration_plan(project, request.target.model_dump())
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except (OSError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
