from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid
import json
from pathlib import Path
from backend.app.config import settings

router = APIRouter(prefix="/projects", tags=["Projects"])

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, example="task-api")
    description: Optional[str] = Field(None, example="Node.js Express task management API")
    source_tech: str = Field(default="Node.js + Express + MongoDB", example="Node.js + Express + MongoDB")
    target_tech: str = Field(default="Java + Spring Boot + PostgreSQL", example="Java + Spring Boot + PostgreSQL")

class ProjectResponse(BaseModel):
    project_id: str
    name: str
    description: Optional[str] = None
    source_tech: str
    target_tech: str
    status: str
    created_at: str
    source_path: str
    target_path: str

# In-memory registry backed by metadata file in projects directory
_projects_cache: dict[str, dict] = {}

def _get_project_meta_path(project_id: str) -> Path:
    proj_dir = settings.PROJECTS_DIR / project_id
    proj_dir.mkdir(parents=True, exist_ok=True)
    return proj_dir / "meta.json"

def _load_projects():
    if not settings.PROJECTS_DIR.exists():
        return
    for proj_dir in settings.PROJECTS_DIR.iterdir():
        if proj_dir.is_dir():
            meta_file = proj_dir / "meta.json"
            if meta_file.exists():
                try:
                    with open(meta_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        _projects_cache[data["project_id"]] = data
                except Exception:
                    pass

_load_projects()

@router.get("", response_model=List[ProjectResponse])
async def list_projects():
    _load_projects()
    return list(_projects_cache.values())

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(payload: ProjectCreate):
    project_id = f"proj_{uuid.uuid4().hex[:8]}"
    now = datetime.utcnow().isoformat() + "Z"
    
    source_path = str(settings.PROJECTS_DIR / project_id / "source")
    target_path = str(settings.PROJECTS_DIR / project_id / "target")
    
    Path(source_path).mkdir(parents=True, exist_ok=True)
    Path(target_path).mkdir(parents=True, exist_ok=True)

    project_data = {
        "project_id": project_id,
        "name": payload.name,
        "description": payload.description,
        "source_tech": payload.source_tech,
        "target_tech": payload.target_tech,
        "status": "INITIALIZED",
        "created_at": now,
        "source_path": source_path,
        "target_path": target_path
    }

    meta_path = _get_project_meta_path(project_id)
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(project_data, f, indent=2)

    _projects_cache[project_id] = project_data
    return project_data

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    if project_id not in _projects_cache:
        _load_projects()
    if project_id not in _projects_cache:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found."
        )
    return _projects_cache[project_id]

@router.delete("/{project_id}", status_code=status.HTTP_200_OK)
async def delete_project(project_id: str):
    if project_id not in _projects_cache:
        _load_projects()
    if project_id not in _projects_cache:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found."
        )
    del _projects_cache[project_id]
    return {"message": f"Project '{project_id}' deleted successfully."}
